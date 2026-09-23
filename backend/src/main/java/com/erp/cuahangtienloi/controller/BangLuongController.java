package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.BangLuongDTO;
import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.entity.BangLuong;
import com.erp.cuahangtienloi.entity.ChamCong;
import com.erp.cuahangtienloi.entity.ChiNhanh;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.entity.SoQuy;
import com.erp.cuahangtienloi.repository.*;
import com.erp.cuahangtienloi.service.BranchAccessService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.List;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
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
    private final SoQuyRepository soQuyRepository;
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

            // Một ca chỉ là nguồn lương khi đã checkout và chốt số giờ. Không
            // tạm trả lương theo giờ kế hoạch cho ca đang mở, vì số đó có thể
            // khác giờ thực tế hoặc bị bỏ quên checkout.
            PayrollMetrics metrics = summarizeCompletedAttendance(records);
            BigDecimal tongGio = metrics.totalHours();
            BigDecimal tongOt = metrics.overtimeHours();
            int soCa = metrics.completedShifts();

            if (soCa == 0 && tongGio.signum() == 0) continue; // không có ca làm → bỏ qua

            BigDecimal luongTheoGio = BigDecimal.valueOf(nv.getLuongTheoGio() != null ? nv.getLuongTheoGio() : 0);
            BigDecimal luongCung = BigDecimal.valueOf(nv.getLuongCung() != null ? nv.getLuongCung() : 0);
            BigDecimal tienOt = money(tongOt.multiply(luongTheoGio).multiply(BigDecimal.valueOf(1.5)));
            BigDecimal tienCongTheoGio = "PART_TIME".equals(nv.getLoaiHopDong())
                    // tongGio đã gồm OT. Chỉ trả lương thường cho phần không
                    // phải OT, để OT không bị cộng cả lương thường lẫn 150%.
                    ? money(metrics.regularHours().multiply(luongTheoGio))
                    : BigDecimal.ZERO;
            BigDecimal tongTien = money(luongCung.add(tienCongTheoGio).add(tienOt));

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
            bl.setTrangThai("THU_NGAN".equals(nv.getVaiTro()) ? "CHO_XAC_NHAN" : "DA_XAC_NHAN");
            bl.setNgayTao(LocalDateTime.now());
            bl.setNgayCapNhat(LocalDateTime.now());
            bangLuongRepository.save(bl);
            created++;
        }

        return ResponseEntity.ok( ApiResponse.ok("Đã tạo " + created + " bảng lương cho tháng " + thangNam));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY')")
    public ResponseEntity<List<BangLuongDTO>> getAll(
            @RequestParam(required = false) String period, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        List<BangLuong> source = period == null || period.isBlank()
                ? bangLuongRepository.findAll()
                : bangLuongRepository.findByThangNam(requirePeriod(period));
        List<BangLuong> filtered = source.stream()
                .filter(bl -> branchAccessService.canReadBranch(actor, bl.getIdChiNhanh()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(toDTOList(filtered));
    }

    /** Nhân viên chỉ xem bảng lương của chính mình, không cần quyền xem nhân sự. */
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<BangLuongDTO>> getMine(
            @RequestParam(required = false) String period, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        String requestedPeriod = period == null || period.isBlank() ? null : requirePeriod(period);
        List<BangLuong> list = bangLuongRepository.findByIdNhanVien(actor.getId()).stream()
                .filter(bl -> requestedPeriod == null || bl.getThangNam().equals(requestedPeriod))
                .collect(Collectors.toList());
        return ResponseEntity.ok(toDTOList(list));
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
        List<BangLuong> list = bangLuongRepository.findByIdNhanVien(idNhanVien).stream()
                .filter(bl -> branchAccessService.canReadBranch(actor, bl.getIdChiNhanh()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(toDTOList(list));
    }

    @GetMapping("/by-month/{thangNam}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY')")
    public ResponseEntity<List<BangLuongDTO>> getByThangNam(@PathVariable String thangNam, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        List<BangLuong> list = bangLuongRepository.findByThangNam(thangNam).stream()
                .filter(bl -> branchAccessService.canReadBranch(actor, bl.getIdChiNhanh()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(toDTOList(list));
    }

    @GetMapping("/by-branch/{idChiNhanh}/month/{thangNam}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY')")
    public ResponseEntity<List<BangLuongDTO>> getByChiNhanhAndThangNam(
            @PathVariable UUID idChiNhanh, @PathVariable String thangNam, HttpServletRequest request) {
        branchAccessService.requireReadableBranch(branchAccessService.requireAuthenticatedEmployee(request), idChiNhanh);
        return ResponseEntity.ok(toDTOList(bangLuongRepository
                .findByIdChiNhanhAndThangNam(idChiNhanh, thangNam)));
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
        NhanVien employee = nhanVienRepository.findById(request.getIdNhanVien()).orElseThrow();
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
        bl.setTrangThai("THU_NGAN".equals(employee.getVaiTro()) ? "CHO_XAC_NHAN" : "DA_XAC_NHAN");
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
                    if ("DA_THANH_TOAN".equals(bl.getTrangThai())) {
                        return ResponseEntity.badRequest().body(ApiResponse.err(
                                "Không sửa bảng lương đã thanh toán"));
                    }
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
                        return ResponseEntity.badRequest().body(ApiResponse.err(
                                "Không được đổi trạng thái bằng API cập nhật; hãy dùng thao tác xác nhận hoặc duyệt chi"));
                    }
                    bl.setNgayCapNhat(LocalDateTime.now());
                    bangLuongRepository.save(bl);
                    return ResponseEntity.ok(toDTO(bl));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Điều chỉnh giờ là thao tác nghiệp vụ riêng: lưu vết lý do và luôn tính
     * lại các thành phần lương tại server, không tin số tiền do trình duyệt gửi.
     */
    @PatchMapping("/{id}/hours-adjustment")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    @Transactional
    public ResponseEntity<?> adjustHours(@PathVariable UUID id,
                                         @RequestBody HourAdjustmentRequest request,
                                         HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        BangLuong payroll = bangLuongRepository.findById(id).orElse(null);
        if (payroll == null) return ResponseEntity.notFound().build();
        NhanVien employee = nhanVienRepository.findById(payroll.getIdNhanVien()).orElse(null);
        if (employee == null) return ResponseEntity.badRequest().body(ApiResponse.err("Nhân viên không tồn tại"));
        if (!"CHO_XAC_NHAN".equals(payroll.getTrangThai())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Chỉ điều chỉnh bảng lương đang chờ xác nhận"));
        }
        if (!"THU_NGAN".equals(employee.getVaiTro())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Chỉ điều chỉnh giờ cho bảng lương Thu ngân"));
        }
        if (actor.getId().equals(employee.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.err("Không được tự điều chỉnh lương của mình"));
        }
        if (!"ADMIN".equals(actor.getVaiTro()) &&
                (!"QUAN_LY".equals(actor.getVaiTro()) || !branchAccessService.canReadBranch(actor, payroll.getIdChiNhanh()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.err("Không có quyền điều chỉnh bảng lương này"));
        }
        if (request == null || request.hours() == null || request.hours().signum() < 0) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Số giờ điều chỉnh không hợp lệ"));
        }
        String reason = request.reason() == null ? "" : request.reason().trim();
        if (reason.length() < 8) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Lý do điều chỉnh phải có ít nhất 8 ký tự"));
        }
        BigDecimal overtime = valueOrZero(payroll.getOvertimeHours());
        if (request.hours().compareTo(overtime) < 0) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Giờ điều chỉnh không thể nhỏ hơn giờ tăng ca đã chốt"));
        }
        if (request.hours().compareTo(valueOrZero(payroll.getTongGioLam()).add(BigDecimal.valueOf(24))) > 0) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Giờ điều chỉnh không được vượt giờ hệ thống quá 24 giờ"));
        }

        payroll.setGioDieuChinh(request.hours().setScale(2, java.math.RoundingMode.HALF_UP));
        payroll.setLyDoDieuChinh(reason);
        recalculatePayrollAmounts(payroll);
        payroll.setNgayCapNhat(LocalDateTime.now());
        bangLuongRepository.save(payroll);
        return ResponseEntity.ok(toDTO(payroll));
    }

    /** Tầng 1: chỉ Quản lý cùng chi nhánh (hoặc Admin) xác nhận lương Thu ngân. */
    @PostMapping("/{id}/confirm-hours")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    @Transactional
    public ResponseEntity<?> confirmHours(@PathVariable UUID id, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        BangLuong payroll = bangLuongRepository.findById(id).orElse(null);
        if (payroll == null) return ResponseEntity.notFound().build();
        NhanVien employee = nhanVienRepository.findById(payroll.getIdNhanVien()).orElse(null);
        if (employee == null) return ResponseEntity.badRequest().body(ApiResponse.err("Nhân viên không tồn tại"));
        if (!"THU_NGAN".equals(employee.getVaiTro())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Chỉ bảng lương Thu ngân cần xác nhận giờ"));
        }
        if (!"CHO_XAC_NHAN".equals(payroll.getTrangThai())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Bảng lương không ở trạng thái chờ xác nhận"));
        }
        if (actor.getId().equals(employee.getId())) {
            return ResponseEntity.status(403).body(ApiResponse.err("Không được tự xác nhận lương của mình"));
        }
        if (!"ADMIN".equals(actor.getVaiTro()) &&
                (!"QUAN_LY".equals(actor.getVaiTro()) || !branchAccessService.canReadBranch(actor, payroll.getIdChiNhanh()))) {
            return ResponseEntity.status(403).body(ApiResponse.err("Không có quyền xác nhận bảng lương này"));
        }
        payroll.setTrangThai("DA_XAC_NHAN");
        payroll.setIdNguoiXacNhan(actor.getId());
        payroll.setNgayXacNhan(LocalDateTime.now());
        bangLuongRepository.save(payroll);
        return ResponseEntity.ok(toDTO(payroll));
    }

    /** Tầng 2: ghi sổ quỹ và đánh dấu đã thanh toán trong cùng một transaction. */
    @PostMapping("/{id}/approve-payment")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    @Transactional
    public ResponseEntity<?> approvePayment(@PathVariable UUID id, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        BangLuong payroll = bangLuongRepository.findById(id).orElse(null);
        if (payroll == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(approvePaymentInternal(payroll, actor));
    }

    /** Duyệt một danh sách bảng lương đã chọn. Toàn bộ thành công hoặc rollback toàn bộ. */
    @PostMapping("/approve-payment/batch")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    @Transactional
    public ResponseEntity<?> approvePaymentBatch(@RequestBody BatchApproveRequest request,
                                                  HttpServletRequest httpRequest) {
        if (request == null || request.ids() == null || request.ids().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Hãy chọn ít nhất một bảng lương"));
        }
        Set<UUID> ids = new LinkedHashSet<>(request.ids());
        if (ids.size() != request.ids().size()) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Danh sách bảng lương bị trùng"));
        }
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        List<BangLuong> payrolls = ids.stream().map(id -> bangLuongRepository.findById(id)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                "Không tìm thấy bảng lương: " + id)))
                .toList();
        List<BangLuongDTO> result = payrolls.stream()
                .map(payroll -> approvePaymentInternal(payroll, actor))
                .toList();
        return ResponseEntity.ok(result);
    }

    private BangLuongDTO approvePaymentInternal(BangLuong payroll, NhanVien actor) {
        NhanVien employee = nhanVienRepository.findById(payroll.getIdNhanVien()).orElse(null);
        if (employee == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nhân viên không tồn tại");
        if (actor.getId().equals(employee.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không được tự duyệt chi lương của mình");
        }
        if ("KE_TOAN".equals(employee.getVaiTro()) && !"ADMIN".equals(actor.getVaiTro())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Lương Kế toán phải do Admin duyệt chi");
        }
        if ("THU_NGAN".equals(employee.getVaiTro()) && !"DA_XAC_NHAN".equals(payroll.getTrangThai())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Lương Thu ngân phải được Quản lý/Admin xác nhận giờ trước");
        }
        if ("DA_THANH_TOAN".equals(payroll.getTrangThai())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bảng lương đã được thanh toán");
        }
        if (!"THU_NGAN".equals(employee.getVaiTro()) &&
                !"DA_XAC_NHAN".equals(payroll.getTrangThai())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bảng lương không ở trạng thái có thể duyệt chi");
        }

        String relatedCode = "BL-" + payroll.getId();
        if (soQuyRepository.existsByMaChungTuLienQuanAndDirectionAndHangMuc(relatedCode, "PAYMENT", "TRA_LUONG")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đã tồn tại phiếu chi cho bảng lương này");
        }
        String receiptCode = "PC-BL-" + payroll.getId().toString().replace("-", "").substring(0, 24);
        LocalDateTime now = LocalDateTime.now();
        SoQuy cashEntry = new SoQuy();
        cashEntry.setMaChungTu(receiptCode);
        cashEntry.setMaChungTuLienQuan(relatedCode);
        cashEntry.setIdChiNhanh(payroll.getIdChiNhanh());
        cashEntry.setIdNguoiTao(actor.getId());
        cashEntry.setDirection("PAYMENT");
        cashEntry.setHangMuc("TRA_LUONG");
        cashEntry.setHinhThucTt("CASH");
        cashEntry.setEntryDate(LocalDate.now());
        cashEntry.setSoTien(payroll.getTongTienLuong());
        cashEntry.setDoiTuong(employee.getHoTen());
        cashEntry.setDienGiai("Chi lương " + payroll.getThangNam() + " cho " + employee.getHoTen());
        cashEntry.setRunningBalance(BigDecimal.ZERO);
        cashEntry.setTrangThai("COMPLETED");
        cashEntry.setNgayTao(now);
        cashEntry.setNgayCapNhat(now);
        soQuyRepository.save(cashEntry);

        payroll.setTrangThai("DA_THANH_TOAN");
        payroll.setIdNguoiDuyetChi(actor.getId());
        payroll.setNgayDuyetChi(now);
        payroll.setIdNguoiThanhToan(actor.getId());
        payroll.setNgayThanhToan(now);
        payroll.setMaPhieuChi(receiptCode);
        bangLuongRepository.save(payroll);
        YearMonth payrollMonth = YearMonth.parse(payroll.getThangNam(), DateTimeFormatter.ofPattern("MM-yyyy"));
        chamCongRepository.findByIdNhanVienAndWorkDateBetween(
                        payroll.getIdNhanVien(), payrollMonth.atDay(1), payrollMonth.atEndOfMonth())
                .stream()
                .filter(cc -> ("PRESENT".equals(cc.getTrangThai()) || "LATE".equals(cc.getTrangThai()))
                        && cc.getClockOutAt() != null && cc.getTongGioLam() != null)
                .forEach(cc -> cc.setDaThanhToan(true));
        chamCongRepository.flush();
        return toDTO(payroll);
    }

    public record BatchApproveRequest(List<UUID> ids) {}
    public record HourAdjustmentRequest(BigDecimal hours, String reason) {}
    private record PayrollMetrics(BigDecimal totalHours, BigDecimal overtimeHours,
                                  BigDecimal regularHours, int completedShifts) {}

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

    private String requirePeriod(String period) {
        try {
            YearMonth.parse(period, DateTimeFormatter.ofPattern("MM-yyyy"));
            return period;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tháng không hợp lệ, dùng MM-YYYY");
        }
    }

    private PayrollMetrics summarizeCompletedAttendance(List<ChamCong> records) {
        BigDecimal total = BigDecimal.ZERO;
        BigDecimal overtime = BigDecimal.ZERO;
        int shifts = 0;
        for (ChamCong record : records) {
            if (!("PRESENT".equals(record.getTrangThai()) || "LATE".equals(record.getTrangThai()))
                    || record.getClockOutAt() == null || record.getTongGioLam() == null) {
                continue;
            }
            total = total.add(valueOrZero(record.getTongGioLam()));
            overtime = overtime.add(valueOrZero(record.getOvertimeHours()));
            shifts++;
        }
        BigDecimal regular = total.subtract(overtime).max(BigDecimal.ZERO);
        return new PayrollMetrics(total, overtime, regular, shifts);
    }

    private void recalculatePayrollAmounts(BangLuong payroll) {
        BigDecimal effectiveHours = payroll.getGioDieuChinh() == null
                ? valueOrZero(payroll.getTongGioLam())
                : payroll.getGioDieuChinh();
        BigDecimal regularHours = effectiveHours.subtract(valueOrZero(payroll.getOvertimeHours()))
                .max(BigDecimal.ZERO);
        BigDecimal hourlyWage = valueOrZero(payroll.getLuongTheoGio());
        BigDecimal shiftPay = "PART_TIME".equals(payroll.getLoaiHopDong())
                ? money(regularHours.multiply(hourlyWage))
                : BigDecimal.ZERO;
        BigDecimal overtimePay = money(valueOrZero(payroll.getOvertimeHours())
                .multiply(hourlyWage).multiply(BigDecimal.valueOf(1.5)));
        BigDecimal netPay = money(valueOrZero(payroll.getLuongCungThucTe()).add(shiftPay).add(overtimePay)
                .add(valueOrZero(payroll.getThuong()))
                .subtract(valueOrZero(payroll.getKhauTru())));
        if (netPay.signum() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tổng tiền lương không được âm");
        }
        payroll.setTienCongTheoGio(shiftPay);
        payroll.setTienOt(overtimePay);
        payroll.setTongTienLuong(netPay);
    }

    private BigDecimal valueOrZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private BigDecimal money(BigDecimal value) {
        return value.setScale(0, java.math.RoundingMode.HALF_UP);
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

    /** Batch load: 2 SELECT thay vì (1+4)N+1 khi map danh sách bảng lương. */
    private List<BangLuongDTO> toDTOList(List<BangLuong> list) {
        if (list.isEmpty()) return List.of();
        // Thu thập tất cả UUID nhân viên liên quan (4 trường khác nhau)
        Set<UUID> nvIds = new HashSet<>();
        list.forEach(bl -> {
            if (bl.getIdNhanVien() != null) nvIds.add(bl.getIdNhanVien());
            if (bl.getIdNguoiXacNhan() != null) nvIds.add(bl.getIdNguoiXacNhan());
            if (bl.getIdNguoiDuyetChi() != null) nvIds.add(bl.getIdNguoiDuyetChi());
            if (bl.getIdNguoiThanhToan() != null) nvIds.add(bl.getIdNguoiThanhToan());
        });
        Set<UUID> cnIds = list.stream().map(BangLuong::getIdChiNhanh)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Map<UUID, NhanVien> nvMap = nhanVienRepository.findAllById(nvIds).stream()
                .collect(Collectors.toMap(NhanVien::getId, nv -> nv));
        Map<UUID, String> cnNames = chiNhanhRepository.findAllById(cnIds).stream()
                .collect(Collectors.toMap(ChiNhanh::getId, ChiNhanh::getTenChiNhanh));
        return list.stream().map(bl -> toDTO(bl, nvMap, cnNames)).collect(Collectors.toList());
    }

    private BangLuongDTO toDTO(BangLuong bl, Map<UUID, NhanVien> nvMap, Map<UUID, String> cnNames) {
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
        dto.setTenChiNhanh(bl.getIdChiNhanh() != null ? cnNames.get(bl.getIdChiNhanh()) : null);
        if (bl.getIdNhanVien() != null) {
            NhanVien nv = nvMap.get(bl.getIdNhanVien());
            if (nv != null) { dto.setTenNhanVien(nv.getHoTen()); dto.setMaNhanVien(nv.getMaNhanVien()); dto.setVaiTro(nv.getVaiTro()); }
        }
        if (bl.getIdNguoiXacNhan() != null) {
            NhanVien nv = nvMap.get(bl.getIdNguoiXacNhan());
            if (nv != null) dto.setTenNguoiXacNhan(nv.getHoTen());
        }
        if (bl.getIdNguoiDuyetChi() != null) {
            NhanVien nv = nvMap.get(bl.getIdNguoiDuyetChi());
            if (nv != null) dto.setTenNguoiDuyetChi(nv.getHoTen());
        }
        if (bl.getIdNguoiThanhToan() != null) {
            NhanVien nv = nvMap.get(bl.getIdNguoiThanhToan());
            if (nv != null) dto.setTenNguoiThanhToan(nv.getHoTen());
        }
        return dto;
    }

    /** Dùng cho getById / create / update – 1 bản ghi, gọi DB riêng lạ vẫn OK. */
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
                    .ifPresent(nv -> {
                        dto.setTenNhanVien(nv.getHoTen());
                        dto.setMaNhanVien(nv.getMaNhanVien());
                        dto.setVaiTro(nv.getVaiTro());
                    });
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
