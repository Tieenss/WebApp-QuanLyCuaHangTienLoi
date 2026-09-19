package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.BangLuongDTO;
import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.entity.BangLuong;
import com.erp.cuahangtienloi.entity.ChamCong;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.repository.*;
import com.erp.cuahangtienloi.service.BranchAccessService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.erp.cuahangtienloi.validation.InputValidator.nonNegative;

@RestController
@RequestMapping("/api/bang-luong")
@RequiredArgsConstructor
//@CrossOrigin(origins = "*")
public class BangLuongController {

    private final BangLuongRepository bangLuongRepository;
    private final NhanVienRepository nhanVienRepository;
    private final ChiNhanhRepository chiNhanhRepository;
    private final ChamCongRepository chamCongRepository;
    private final BranchAccessService branchAccessService;

    /**
     * Tự động tổng hợp bảng lương 1 tháng cho TẤT CẢ nhân viên từ dữ liệu chấm công.
     * Idempotent: nếu (nhân viên, tháng) đã tồn tại thì bỏ qua (UNIQUE constraint).
     *
     * @param thangNam định dạng MM-YYYY, ví dụ "09-2026"
     */
    @PostMapping("/generate/{thangNam}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    @Transactional
    public ResponseEntity<?> generateForMonth(@PathVariable String thangNam) {
        try {
            YearMonth ym = YearMonth.parse(thangNam, DateTimeFormatter.ofPattern("MM-yyyy"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Tháng không hợp lệ, dùng MM-YYYY"));
        }

        LocalDate firstDay = YearMonth.parse(thangNam, DateTimeFormatter.ofPattern("MM-yyyy")).atDay(1);
        LocalDate lastDay = firstDay.plusMonths(1).minusDays(1);

        List<NhanVien> employees = nhanVienRepository.findAll();
        // Chi nhánh đầu tiên có nhân viên — dùng cho ADMIN/KE_TOAN (không có chi nhánh).
        final UUID firstBranchId = employees.stream()
                .map(NhanVien::getIdChiNhanh)
                .filter(java.util.Objects::nonNull)
                .findFirst()
                .orElse(null);
        int created = 0;
        for (NhanVien nv : employees) {
            // Bỏ qua nhân viên không có chi nhánh (chưa được phân công) —
            // bảng bang_luong yêu cầu id_chi_nhanh NOT NULL.
            // Ngoại lệ: ADMIN/Kế toán không có chi nhánh → gán chi nhánh đầu tiên.
            UUID idChiNhanh = nv.getIdChiNhanh();
            if (idChiNhanh == null) {
                if ("ADMIN".equals(nv.getVaiTro()) || "KE_TOAN".equals(nv.getVaiTro())) {
                    idChiNhanh = firstBranchId;
                }
                if (idChiNhanh == null) continue;
            }
            // Bỏ qua nếu đã có
            if (bangLuongRepository.findByIdNhanVienAndThangNam(nv.getId(), thangNam).isPresent()) {
                continue;
            }

            // Tổng hợp chấm công trong tháng
            List<ChamCong> records = chamCongRepository
                    .findByIdNhanVienAndWorkDateBetween(nv.getId(), firstDay, lastDay);

            BigDecimal tongGio = BigDecimal.ZERO;
            BigDecimal tongOt = BigDecimal.ZERO;
            int soCa = 0;
            boolean isPartTime = "PART_TIME".equals(nv.getLoaiHopDong());
            for (ChamCong cc : records) {
                if (!"PRESENT".equals(cc.getTrangThai()) && !"LATE".equals(cc.getTrangThai())) {
                    continue;
                }
                if (cc.getTongGioLam() != null) {
                    // Giờ thực tế đã chấm công (check-in/out) — dùng cho mọi loại hợp đồng.
                    tongGio = tongGio.add(cc.getTongGioLam());
                } else if (!isPartTime && cc.getCheckInAt() != null && cc.getCheckOutAt() != null) {
                    // FULL_TIME: fallback theo giờ ca chuẩn khi chưa check-out.
                    // PART_TIME: chỉ trả lương theo giờ thực tế chấm, không fallback.
                    long minutes = java.time.Duration.between(cc.getCheckInAt(), cc.getCheckOutAt()).toMinutes();
                    tongGio = tongGio.add(BigDecimal.valueOf(minutes).divide(BigDecimal.valueOf(60), 2, java.math.RoundingMode.HALF_UP));
                }
                if (cc.getOvertimeHours() != null) tongOt = tongOt.add(cc.getOvertimeHours());
                soCa++;
            }

            if (soCa == 0 && tongGio.signum() == 0) continue; // không có ca làm → bỏ qua

            BigDecimal luongTheoGio = BigDecimal.valueOf(nv.getLuongTheoGio() != null ? nv.getLuongTheoGio() : 0);
            BigDecimal luongCung = BigDecimal.valueOf(nv.getLuongCung() != null ? nv.getLuongCung() : 0);
            BigDecimal tienOt = tongOt.multiply(luongTheoGio).multiply(BigDecimal.valueOf(1.5));
            BigDecimal tienCongTheoGio = "PART_TIME".equals(nv.getLoaiHopDong())
                    ? tongGio.multiply(luongTheoGio)
                    : BigDecimal.ZERO;
            BigDecimal tongTien = luongCung.add(tienCongTheoGio).add(tienOt);

            BangLuong bl = new BangLuong();
            bl.setId(UUID.randomUUID());
            bl.setIdNhanVien(nv.getId());
            bl.setIdChiNhanh(idChiNhanh);
            bl.setLoaiHopDong(nv.getLoaiHopDong() != null ? nv.getLoaiHopDong() : "FULL_TIME");
            bl.setThangNam(thangNam);
            bl.setTongGioLam(tongGio);
            bl.setOvertimeHours(tongOt);
            bl.setTongSoCa(soCa);
            bl.setLuongTheoGio(luongTheoGio);
            bl.setLuongCung(luongCung);
            bl.setLuongCungThucTe(luongCung);
            bl.setTienCongTheoGio(tienCongTheoGio);
            bl.setTienOt(tienOt);
            bl.setThuong(BigDecimal.ZERO);
            bl.setKhauTru(BigDecimal.ZERO);
            bl.setTongTienLuong(tongTien);
            bl.setTrangThai("CHO_XAC_NHAN");
            bl.setNgayTao(LocalDateTime.now());
            bl.setNgayCapNhat(LocalDateTime.now());
            bangLuongRepository.save(bl);
            created++;
        }

        return ResponseEntity.ok( ApiResponse.ok("Đã tạo " + created + " bảng lương cho tháng " + thangNam));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY')")
    public ResponseEntity<List<BangLuongDTO>> getAll(HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        List<BangLuongDTO> list = bangLuongRepository.findAll().stream()
                .filter(bl -> branchAccessService.canReadBranch(actor, bl.getIdChiNhanh()))
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY')")
    public ResponseEntity<?> getById(@PathVariable UUID id, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        return bangLuongRepository.findById(id)
                .filter(bl -> branchAccessService.canReadBranch(actor, bl.getIdChiNhanh()))
                .map(bl -> ResponseEntity.ok(toDTO(bl)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-employee/{idNhanVien}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY')")
    public ResponseEntity<List<BangLuongDTO>> getByNhanVien(@PathVariable UUID idNhanVien, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        List<BangLuongDTO> list = bangLuongRepository.findByIdNhanVien(idNhanVien).stream()
                .filter(bl -> branchAccessService.canReadBranch(actor, bl.getIdChiNhanh()))
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-month/{thangNam}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY')")
    public ResponseEntity<List<BangLuongDTO>> getByThangNam(@PathVariable String thangNam, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        List<BangLuongDTO> list = bangLuongRepository.findByThangNam(thangNam).stream()
                .filter(bl -> branchAccessService.canReadBranch(actor, bl.getIdChiNhanh()))
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-branch/{idChiNhanh}/month/{thangNam}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY')")
    public ResponseEntity<List<BangLuongDTO>> getByChiNhanhAndThangNam(
            @PathVariable UUID idChiNhanh, @PathVariable String thangNam, HttpServletRequest request) {
        branchAccessService.requireReadableBranch(branchAccessService.requireAuthenticatedEmployee(request), idChiNhanh);
        List<BangLuongDTO> list = bangLuongRepository
                .findByIdChiNhanhAndThangNam(idChiNhanh, thangNam).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-status/{trangThai}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY')")
    public ResponseEntity<List<BangLuongDTO>> getByStatus(@PathVariable String trangThai, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        List<BangLuongDTO> list = bangLuongRepository.findByTrangThai(trangThai).stream()
                .filter(bl -> branchAccessService.canReadBranch(actor, bl.getIdChiNhanh()))
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<?> create(@RequestBody BangLuong request) {
        if (request.getIdNhanVien() == null || !nhanVienRepository.existsById(request.getIdNhanVien())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Nhân viên không tồn tại"));
        }
        if (request.getIdChiNhanh() != null && !chiNhanhRepository.existsById(request.getIdChiNhanh())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Chi nhánh không tồn tại"));
        }
        validateAmounts(request);
        BangLuong bl = new BangLuong();
        bl.setId(UUID.randomUUID());
        bl.setIdNhanVien(request.getIdNhanVien());
        bl.setIdChiNhanh(request.getIdChiNhanh());
        bl.setLoaiHopDong(request.getLoaiHopDong());
        bl.setThangNam(request.getThangNam());
        bl.setTongGioLam(request.getTongGioLam());
        bl.setOvertimeHours(request.getOvertimeHours() != null ? request.getOvertimeHours() : BigDecimal.ZERO);
        bl.setTongSoCa(request.getTongSoCa() != null ? request.getTongSoCa() : 0);
        bl.setGioDieuChinh(request.getGioDieuChinh());
        bl.setLyDoDieuChinh(request.getLyDoDieuChinh());
        bl.setLuongTheoGio(request.getLuongTheoGio());
        bl.setLuongCung(request.getLuongCung() != null ? request.getLuongCung() : BigDecimal.ZERO);
        bl.setLuongCungThucTe(request.getLuongCungThucTe() != null ? request.getLuongCungThucTe() : BigDecimal.ZERO);
        bl.setTienCongTheoGio(request.getTienCongTheoGio() != null ? request.getTienCongTheoGio() : BigDecimal.ZERO);
        bl.setTienOt(request.getTienOt() != null ? request.getTienOt() : BigDecimal.ZERO);
        bl.setThuong(request.getThuong() != null ? request.getThuong() : BigDecimal.ZERO);
        bl.setKhauTru(request.getKhauTru() != null ? request.getKhauTru() : BigDecimal.ZERO);
        bl.setTongTienLuong(request.getTongTienLuong());
        bl.setTrangThai(request.getTrangThai() != null ? request.getTrangThai() : "CHO_XAC_NHAN");
        bl.setNgayTao(LocalDateTime.now());
        bl.setNgayCapNhat(LocalDateTime.now());

        bangLuongRepository.save(bl);
        return ResponseEntity.ok(toDTO(bl));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY')")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody BangLuong request, HttpServletRequest httpRequest) {
        return bangLuongRepository.findById(id)
                .map(bl -> {
                    branchAccessService.requireReadableBranch(
                            branchAccessService.requireAuthenticatedEmployee(httpRequest), bl.getIdChiNhanh());
                    validateAmounts(request);
                    if (request.getTongGioLam() != null) bl.setTongGioLam(request.getTongGioLam());
                    if (request.getOvertimeHours() != null) bl.setOvertimeHours(request.getOvertimeHours());
                    if (request.getTongSoCa() != null) bl.setTongSoCa(request.getTongSoCa());
                    if (request.getGioDieuChinh() != null) bl.setGioDieuChinh(request.getGioDieuChinh());
                    if (request.getLyDoDieuChinh() != null) bl.setLyDoDieuChinh(request.getLyDoDieuChinh());
                    if (request.getLuongTheoGio() != null) bl.setLuongTheoGio(request.getLuongTheoGio());
                    if (request.getLuongCung() != null) bl.setLuongCung(request.getLuongCung());
                    if (request.getLuongCungThucTe() != null) bl.setLuongCungThucTe(request.getLuongCungThucTe());
                    if (request.getTienCongTheoGio() != null) bl.setTienCongTheoGio(request.getTienCongTheoGio());
                    if (request.getTienOt() != null) bl.setTienOt(request.getTienOt());
                    if (request.getThuong() != null) bl.setThuong(request.getThuong());
                    if (request.getKhauTru() != null) bl.setKhauTru(request.getKhauTru());
                    if (request.getTongTienLuong() != null) bl.setTongTienLuong(request.getTongTienLuong());
                    if (request.getTrangThai() != null) {

                        if ("DA_THANH_TOAN".equals(request.getTrangThai())) {
                            Authentication auth =
                                    SecurityContextHolder.getContext().getAuthentication();

                            boolean isKeToanOrAdmin = auth.getAuthorities().stream()
                                    .anyMatch(a ->
                                            a.getAuthority().equals("ROLE_ADMIN")
                                                    || a.getAuthority().equals("ROLE_KE_TOAN")
                                    );

                            if (!isKeToanOrAdmin) {
                                return ResponseEntity.badRequest()
                                        .body(ApiResponse.err(
                                                "Chỉ Kế toán/Admin mới được duyệt chi lương"
                                        ));
                            }
                        }
                        
                        bl.setTrangThai(request.getTrangThai());
                    }
                    bl.setNgayCapNhat(LocalDateTime.now());
                    bangLuongRepository.save(bl);
                    return ResponseEntity.ok(toDTO(bl));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private void validateAmounts(BangLuong request) {
        nonNegative(request.getTongGioLam(), "Tổng giờ làm");
        nonNegative(request.getOvertimeHours(), "Giờ tăng ca");
        nonNegative(request.getTongSoCa(), "Tổng số ca");
        nonNegative(request.getGioDieuChinh(), "Giờ điều chỉnh");
        nonNegative(request.getLuongTheoGio(), "Lương theo giờ");
        nonNegative(request.getLuongCung(), "Lương cứng");
        nonNegative(request.getLuongCungThucTe(), "Lương cứng thực tế");
        nonNegative(request.getTienCongTheoGio(), "Tiền công theo giờ");
        nonNegative(request.getTienOt(), "Tiền tăng ca");
        nonNegative(request.getThuong(), "Thưởng");
        nonNegative(request.getKhauTru(), "Khấu trừ");
        nonNegative(request.getTongTienLuong(), "Tổng tiền lương");
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (bangLuongRepository.existsById(id)) {
            bangLuongRepository.deleteById(id);
            return ResponseEntity.ok( ApiResponse.ok("Xóa bảng lương thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    private BangLuongDTO toDTO(BangLuong bl) {
        BangLuongDTO dto = new BangLuongDTO();
        dto.setId(bl.getId());
        dto.setIdNhanVien(bl.getIdNhanVien());
        dto.setIdChiNhanh(bl.getIdChiNhanh());
        dto.setLoaiHopDong(bl.getLoaiHopDong());
        dto.setThangNam(bl.getThangNam());
        dto.setTongGioLam(bl.getTongGioLam());
        dto.setOvertimeHours(bl.getOvertimeHours());
        dto.setTongSoCa(bl.getTongSoCa());
        dto.setGioDieuChinh(bl.getGioDieuChinh());
        dto.setLyDoDieuChinh(bl.getLyDoDieuChinh());
        dto.setLuongTheoGio(bl.getLuongTheoGio());
        dto.setLuongCung(bl.getLuongCung());
        dto.setLuongCungThucTe(bl.getLuongCungThucTe());
        dto.setTienCongTheoGio(bl.getTienCongTheoGio());
        dto.setTienOt(bl.getTienOt());
        dto.setThuong(bl.getThuong());
        dto.setKhauTru(bl.getKhauTru());
        dto.setTongTienLuong(bl.getTongTienLuong());
        dto.setTrangThai(bl.getTrangThai());
        dto.setIdNguoiXacNhan(bl.getIdNguoiXacNhan());
        dto.setNgayXacNhan(bl.getNgayXacNhan());
        dto.setIdNguoiDuyetChi(bl.getIdNguoiDuyetChi());
        dto.setNgayDuyetChi(bl.getNgayDuyetChi());
        dto.setIdNguoiThanhToan(bl.getIdNguoiThanhToan());
        dto.setNgayThanhToan(bl.getNgayThanhToan());
        dto.setMaPhieuChi(bl.getMaPhieuChi());

        if (bl.getIdNhanVien() != null) {
            nhanVienRepository.findById(bl.getIdNhanVien())
                    .ifPresent(nv -> dto.setTenNhanVien(nv.getHoTen()));
        }
        if (bl.getIdChiNhanh() != null) {
            chiNhanhRepository.findById(bl.getIdChiNhanh())
                    .ifPresent(cn -> dto.setTenChiNhanh(cn.getTenChiNhanh()));
        }
        if (bl.getIdNguoiXacNhan() != null) {
            nhanVienRepository.findById(bl.getIdNguoiXacNhan())
                    .ifPresent(nv -> dto.setTenNguoiXacNhan(nv.getHoTen()));
        }
        if (bl.getIdNguoiDuyetChi() != null) {
            nhanVienRepository.findById(bl.getIdNguoiDuyetChi())
                    .ifPresent(nv -> dto.setTenNguoiDuyetChi(nv.getHoTen()));
        }
        if (bl.getIdNguoiThanhToan() != null) {
            nhanVienRepository.findById(bl.getIdNguoiThanhToan())
                    .ifPresent(nv -> dto.setTenNguoiThanhToan(nv.getHoTen()));
        }

        return dto;
    }

//    record SuccessResponse(String message) {}
}
