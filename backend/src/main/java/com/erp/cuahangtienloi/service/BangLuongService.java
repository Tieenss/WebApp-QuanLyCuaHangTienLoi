package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.BangLuongDTO;
import com.erp.cuahangtienloi.dto.BatchApproveRequest;
import com.erp.cuahangtienloi.dto.HourAdjustmentRequest;
import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.entity.BangLuong;
import com.erp.cuahangtienloi.entity.ChamCong;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.entity.SoQuy;
import com.erp.cuahangtienloi.repository.BangLuongRepository;
import com.erp.cuahangtienloi.repository.ChamCongRepository;
import com.erp.cuahangtienloi.repository.ChiNhanhRepository;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import com.erp.cuahangtienloi.repository.SoQuyRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.erp.cuahangtienloi.validation.InputValidator.nonNegative;

@Service
@RequiredArgsConstructor
public class BangLuongService {

    private final BangLuongRepository bangLuongRepository;
    private final NhanVienRepository nhanVienRepository;
    private final ChiNhanhRepository chiNhanhRepository;
    private final ChamCongRepository chamCongRepository;
    private final SoQuyRepository soQuyRepository;
    private final BranchAccessService branchAccessService;

    public record PayrollMetrics(BigDecimal totalHours, BigDecimal overtimeHours,
                                 BigDecimal regularHours, int completedShifts) {}

    @Transactional
    public ResponseEntity<?> generateForMonth(String thangNam) {
        try {
            YearMonth.parse(thangNam, DateTimeFormatter.ofPattern("MM-yyyy"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Tháng không hợp lệ, dùng MM-YYYY"));
        }

        LocalDate firstDay = YearMonth.parse(thangNam, DateTimeFormatter.ofPattern("MM-yyyy")).atDay(1);
        LocalDate lastDay = firstDay.plusMonths(1).minusDays(1);

        List<NhanVien> employees = nhanVienRepository.findAll();
        final UUID firstBranchId = employees.stream()
                .map(NhanVien::getIdChiNhanh)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);

        int created = 0;
        for (NhanVien nv : employees) {
            UUID idChiNhanh = nv.getIdChiNhanh();
            if (idChiNhanh == null) {
                if ("ADMIN".equals(nv.getVaiTro()) || "KE_TOAN".equals(nv.getVaiTro())) {
                    idChiNhanh = firstBranchId;
                }
                if (idChiNhanh == null) continue;
            }

            if (bangLuongRepository.findByIdNhanVienAndThangNam(nv.getId(), thangNam).isPresent()) {
                continue;
            }

            List<ChamCong> records = chamCongRepository
                    .findByIdNhanVienAndWorkDateBetween(nv.getId(), firstDay, lastDay);

            PayrollMetrics metrics = summarizeCompletedAttendance(records);
            BigDecimal tongGio = metrics.totalHours();
            BigDecimal tongOt = metrics.overtimeHours();
            int soCa = metrics.completedShifts();

            if (soCa == 0 && tongGio.signum() == 0) continue;

            BigDecimal luongTheoGio = BigDecimal.valueOf(nv.getLuongTheoGio() != null ? nv.getLuongTheoGio() : 0);
            BigDecimal luongCung = BigDecimal.valueOf(nv.getLuongCung() != null ? nv.getLuongCung() : 0);
            BigDecimal tienOt = money(tongOt.multiply(luongTheoGio).multiply(BigDecimal.valueOf(1.5)));
            BigDecimal tienCongTheoGio = "PART_TIME".equals(nv.getLoaiHopDong())
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

        return ResponseEntity.ok(ApiResponse.ok("Đã tạo " + created + " bảng lương cho tháng " + thangNam));
    }

    @Transactional(readOnly = true)
    public List<BangLuongDTO> getAll(String period, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        List<BangLuong> source = period == null || period.isBlank()
                ? bangLuongRepository.findAll()
                : bangLuongRepository.findByThangNam(requirePeriod(period));
        return source.stream()
                .filter(bl -> branchAccessService.canReadBranch(actor, bl.getIdChiNhanh()))
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<BangLuongDTO> getMine(String period, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        String requestedPeriod = period == null || period.isBlank() ? null : requirePeriod(period);
        return bangLuongRepository.findByIdNhanVien(actor.getId()).stream()
                .filter(bl -> requestedPeriod == null || bl.getThangNam().equals(requestedPeriod))
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ResponseEntity<?> getById(UUID id, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        return bangLuongRepository.findById(id)
                .filter(bl -> branchAccessService.canReadBranch(actor, bl.getIdChiNhanh()))
                .map(bl -> ResponseEntity.ok(toDTO(bl)))
                .orElse(ResponseEntity.notFound().build());
    }

    @Transactional(readOnly = true)
    public List<BangLuongDTO> getByNhanVien(UUID idNhanVien, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        return bangLuongRepository.findByIdNhanVien(idNhanVien).stream()
                .filter(bl -> branchAccessService.canReadBranch(actor, bl.getIdChiNhanh()))
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<BangLuongDTO> getByThangNam(String thangNam, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        return bangLuongRepository.findByThangNam(thangNam).stream()
                .filter(bl -> branchAccessService.canReadBranch(actor, bl.getIdChiNhanh()))
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<BangLuongDTO> getByChiNhanhAndThangNam(UUID idChiNhanh, String thangNam, HttpServletRequest request) {
        branchAccessService.requireReadableBranch(branchAccessService.requireAuthenticatedEmployee(request), idChiNhanh);
        return bangLuongRepository
                .findByIdChiNhanhAndThangNam(idChiNhanh, thangNam).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<BangLuongDTO> getByStatus(String trangThai, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        return bangLuongRepository.findByTrangThai(trangThai).stream()
                .filter(bl -> branchAccessService.canReadBranch(actor, bl.getIdChiNhanh()))
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public ResponseEntity<?> create(BangLuong request) {
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

    @Transactional
    public ResponseEntity<?> update(UUID id, BangLuong request, HttpServletRequest httpRequest) {
        return bangLuongRepository.findById(id)
                .map(bl -> {
                    branchAccessService.requireReadableBranch(
                            branchAccessService.requireAuthenticatedEmployee(httpRequest), bl.getIdChiNhanh());
                    if ("DA_THANH_TOAN".equals(bl.getTrangThai())) {
                        return ResponseEntity.badRequest().body(ApiResponse.err("Không sửa bảng lương đã thanh toán"));
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

    @Transactional
    public ResponseEntity<?> adjustHours(UUID id, HourAdjustmentRequest request, HttpServletRequest httpRequest) {
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

    @Transactional
    public ResponseEntity<?> confirmHours(UUID id, HttpServletRequest request) {
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

    @Transactional
    public BangLuongDTO approvePayment(UUID id, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        BangLuong payroll = bangLuongRepository.findById(id).orElse(null);
        if (payroll == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bảng lương: " + id);
        }
        return approvePaymentInternal(payroll, actor);
    }

    @Transactional
    public List<BangLuongDTO> approvePaymentBatch(BatchApproveRequest request, HttpServletRequest httpRequest) {
        if (request == null || request.ids() == null || request.ids().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hãy chọn ít nhất một bảng lương");
        }
        Set<UUID> ids = new LinkedHashSet<>(request.ids());
        if (ids.size() != request.ids().size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Danh sách bảng lương bị trùng");
        }
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        List<BangLuong> payrolls = ids.stream().map(id -> bangLuongRepository.findById(id)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                "Không tìm thấy bảng lương: " + id)))
                .toList();
        return payrolls.stream()
                .map(payroll -> approvePaymentInternal(payroll, actor))
                .toList();
    }

    @Transactional
    public ResponseEntity<?> delete(UUID id) {
        if (bangLuongRepository.existsById(id)) {
            bangLuongRepository.deleteById(id);
            return ResponseEntity.ok(ApiResponse.ok("Xóa bảng lương thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    public BangLuongDTO approvePaymentInternal(BangLuong payroll, NhanVien actor) {
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

    public BangLuongDTO toDTO(BangLuong bl) {
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
}
