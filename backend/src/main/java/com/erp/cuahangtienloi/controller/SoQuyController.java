package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.dto.SoQuyDTO;
import com.erp.cuahangtienloi.entity.ChiNhanh;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.entity.SoQuy;
import com.erp.cuahangtienloi.repository.*;
import com.erp.cuahangtienloi.service.BranchAccessService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.erp.cuahangtienloi.validation.InputValidator.*;

@RestController
@RequestMapping("/api/so-quy")
@RequiredArgsConstructor
//@CrossOrigin(origins = "*")
public class SoQuyController {

    private final SoQuyRepository soQuyRepository;
    private final ChiNhanhRepository chiNhanhRepository;
    private final NhanVienRepository nhanVienRepository;
    private final BranchAccessService branchAccessService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<SoQuyDTO>> getAll(HttpServletRequest request) {
        List<SoQuy> entries = findEntriesVisibleTo(request);
        return ResponseEntity.ok(toDTOList(entries));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY')")
    public ResponseEntity<?> getById(@PathVariable UUID id, HttpServletRequest request) {
        return soQuyRepository.findById(id)
                .filter(sq -> canReadEntry(branchAccessService.requireAuthenticatedEmployee(request), sq))
                .map(sq -> ResponseEntity.ok(toDTO(sq)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-branch/{idChiNhanh}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<SoQuyDTO>> getByChiNhanh(@PathVariable UUID idChiNhanh,
                                                         HttpServletRequest request) {
        branchAccessService.requireReadableBranch(branchAccessService.requireAuthenticatedEmployee(request), idChiNhanh);
        return ResponseEntity.ok(toDTOList(soQuyRepository.findByIdChiNhanh(idChiNhanh)));
    }

    @GetMapping("/by-direction/{direction}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY')")
    public ResponseEntity<List<SoQuyDTO>> getByDirection(@PathVariable String direction,
                                                          HttpServletRequest request) {
        List<SoQuyDTO> list = findEntriesVisibleTo(request).stream()
                .filter(sq -> direction.equals(sq.getDirection()))
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-hang-muc/{hangMuc}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY')")
    public ResponseEntity<List<SoQuyDTO>> getByHangMuc(@PathVariable String hangMuc,
                                                        HttpServletRequest request) {
        List<SoQuyDTO> list = findEntriesVisibleTo(request).stream()
                .filter(sq -> hangMuc.equals(sq.getHangMuc()))
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-date-range")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY')")
    public ResponseEntity<List<SoQuyDTO>> getByDateRange(
            @RequestParam LocalDate from, @RequestParam LocalDate to, HttpServletRequest request) {
        List<SoQuyDTO> list = findEntriesVisibleTo(request).stream()
                .filter(sq -> !sq.getEntryDate().isBefore(from) && !sq.getEntryDate().isAfter(to))
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    @Transactional
    public ResponseEntity<?> create(@RequestBody SoQuy request, HttpServletRequest httpRequest) {
        if (request.getIdChiNhanh() != null && !chiNhanhRepository.existsById(request.getIdChiNhanh())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Chi nhánh không tồn tại"));
        }
        if (request.getDirection() == null || !CASH_DIRECTIONS.contains(request.getDirection())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Loại thu/chi không hợp lệ"));
        }
        requireText(request.getHangMuc(), "Hạng mục", 1, 50);
        if (request.getHinhThucTt() != null && !PAYMENT_METHODS.contains(request.getHinhThucTt())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Hình thức thanh toán không hợp lệ"));
        }
        positive(request.getSoTien(), "Số tiền");
        SoQuy sq = new SoQuy();
        sq.setId(UUID.randomUUID());
        sq.setMaChungTu(request.getMaChungTu());
        sq.setMaChungTuLienQuan(request.getMaChungTuLienQuan());
        sq.setIdChiNhanh(request.getIdChiNhanh());
        // id_nguoi_tao NOT NULL theo DB — nếu frontend không gửi (session cũ
        // chưa có idNhanVien) thì fallback nhân viên đầu tiên.
        UUID idNguoiTao = request.getIdNguoiTao();

        if (idNguoiTao == null || !nhanVienRepository.existsById(idNguoiTao)) {
            Object attr = httpRequest.getAttribute("authenticatedIdNhanVien");

            if (attr instanceof String s) {
                try {
                    UUID id = UUID.fromString(s);

                    if (nhanVienRepository.existsById(id)) {
                        idNguoiTao = id;
                    }
                } catch (IllegalArgumentException ignored) {
                    // UUID không hợp lệ
                }
            }
        }
        sq.setIdNguoiTao(idNguoiTao);
        sq.setDirection(request.getDirection());
        sq.setHangMuc(request.getHangMuc());
        sq.setHinhThucTt(request.getHinhThucTt() != null ? request.getHinhThucTt() : "CASH");
        sq.setEntryDate(request.getEntryDate() != null ? request.getEntryDate() : LocalDate.now());
        sq.setSoTien(request.getSoTien());
        sq.setDoiTuong(request.getDoiTuong());
        sq.setDienGiai(request.getDienGiai());
        sq.setRunningBalance(request.getRunningBalance());
        sq.setTrangThai(request.getTrangThai() != null ? request.getTrangThai() : "COMPLETED");
        sq.setNgayTao(LocalDateTime.now());
        sq.setNgayCapNhat(LocalDateTime.now());

        SoQuy latest = soQuyRepository.findByIdChiNhanh(sq.getIdChiNhanh()).stream()
                .sorted(
                        Comparator.comparing(SoQuy::getEntryDate)
                                .reversed()
                                .thenComparing(
                                        SoQuy::getNgayTao,
                                        Comparator.reverseOrder()
                                )
                )
                .findFirst()
                .orElse(null);

        BigDecimal prevBalance =
                latest != null
                        ? latest.getRunningBalance()
                        : BigDecimal.ZERO;

        if ("RECEIPT".equals(sq.getDirection())) {
            sq.setRunningBalance(prevBalance.add(sq.getSoTien()));
        } else {
            sq.setRunningBalance(prevBalance.subtract(sq.getSoTien()));
        }

        soQuyRepository.save(sq);
        return ResponseEntity.ok(toDTO(sq));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    @Transactional
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody SoQuy request) {
        return soQuyRepository.findById(id)
                .map(sq -> {
                    if (request.getSoTien() != null) positive(request.getSoTien(), "Số tiền");
                    if (request.getDirection() != null && !CASH_DIRECTIONS.contains(request.getDirection())) {
                        return ResponseEntity.badRequest().body(ApiResponse.err("Loại thu/chi không hợp lệ"));
                    }
                    if (request.getHangMuc() != null) requireText(request.getHangMuc(), "Hạng mục", 1, 50);
                    if (request.getHinhThucTt() != null && !PAYMENT_METHODS.contains(request.getHinhThucTt())) {
                        return ResponseEntity.badRequest().body(ApiResponse.err("Hình thức thanh toán không hợp lệ"));
                    }
                    if (request.getDirection() != null) sq.setDirection(request.getDirection());
                    if (request.getHangMuc() != null) sq.setHangMuc(request.getHangMuc());
                    if (request.getHinhThucTt() != null) sq.setHinhThucTt(request.getHinhThucTt());
                    if (request.getEntryDate() != null) sq.setEntryDate(request.getEntryDate());
                    if (request.getSoTien() != null) sq.setSoTien(request.getSoTien());
                    if (request.getDoiTuong() != null) sq.setDoiTuong(request.getDoiTuong());
                    if (request.getDienGiai() != null) sq.setDienGiai(request.getDienGiai());
                    // runningBalance là giá trị dẫn xuất, không nhận từ client.
                    if (request.getTrangThai() != null) sq.setTrangThai(request.getTrangThai());
                    sq.setNgayCapNhat(LocalDateTime.now());
                    soQuyRepository.save(sq);
                    return ResponseEntity.ok(toDTO(sq));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (soQuyRepository.existsById(id)) {
            soQuyRepository.deleteById(id);
            return ResponseEntity.ok( ApiResponse.ok("Xóa sổ quỹ thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    /** Bulk convert – chỉ gọi 2 query phụ (ChiNhanh + NhanVien) dù list dài bao nhiêu. */
    private List<SoQuyDTO> toDTOList(List<SoQuy> source) {
        if (source.isEmpty()) return List.of();
        Map<UUID, String> chiNhanhMap = chiNhanhRepository.findAll().stream()
                .collect(Collectors.toMap(cn -> cn.getId(), cn -> cn.getTenChiNhanh()));
        Map<UUID, String> nhanVienMap = nhanVienRepository.findAll().stream()
                .collect(Collectors.toMap(nv -> nv.getId(), nv -> nv.getHoTen()));
        return source.stream().map(sq -> toDTO(sq, chiNhanhMap, nhanVienMap)).collect(Collectors.toList());
    }

    private SoQuyDTO toDTO(SoQuy sq) {
        return toDTO(sq, null, null);
    }

    private SoQuyDTO toDTO(SoQuy sq, Map<UUID, String> chiNhanhMap, Map<UUID, String> nhanVienMap) {
        SoQuyDTO dto = new SoQuyDTO();
        dto.setId(sq.getId());
        dto.setMaChungTu(sq.getMaChungTu());
        dto.setMaChungTuLienQuan(sq.getMaChungTuLienQuan());
        dto.setIdChiNhanh(sq.getIdChiNhanh());
        dto.setIdNguoiTao(sq.getIdNguoiTao());
        dto.setDirection(sq.getDirection());
        dto.setHangMuc(sq.getHangMuc());
        dto.setHinhThucTt(sq.getHinhThucTt());
        dto.setEntryDate(sq.getEntryDate());
        dto.setSoTien(sq.getSoTien());
        dto.setDoiTuong(sq.getDoiTuong());
        dto.setDienGiai(sq.getDienGiai());
        dto.setRunningBalance(sq.getRunningBalance());
        dto.setTrangThai(sq.getTrangThai());

        if (sq.getIdChiNhanh() != null) {
            String ten = chiNhanhMap != null ? chiNhanhMap.get(sq.getIdChiNhanh())
                    : chiNhanhRepository.findById(sq.getIdChiNhanh()).map(cn -> cn.getTenChiNhanh()).orElse(null);
            dto.setTenChiNhanh(ten);
        }
        if (sq.getIdNguoiTao() != null) {
            String ten = nhanVienMap != null ? nhanVienMap.get(sq.getIdNguoiTao())
                    : nhanVienRepository.findById(sq.getIdNguoiTao()).map(nv -> nv.getHoTen()).orElse(null);
            dto.setTenNguoiTao(ten);
        }

        return dto;
    }

    private List<SoQuy> findEntriesVisibleTo(HttpServletRequest request) {
        var employee = branchAccessService.requireAuthenticatedEmployee(request);
        return branchAccessService.isSystemWide(employee)
                ? soQuyRepository.findAll()
                : soQuyRepository.findByIdChiNhanh(branchAccessService.requiredOwnBranch(employee));
    }

    private boolean canReadEntry(com.erp.cuahangtienloi.entity.NhanVien employee, SoQuy entry) {
        return branchAccessService.isSystemWide(employee)
                || (entry.getIdChiNhanh() != null
                && entry.getIdChiNhanh().equals(branchAccessService.requiredOwnBranch(employee)));
    }

//    record SuccessResponse(String message) {}
}
