package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.ChamCongDTO;
import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.entity.ChamCong;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.repository.ChamCongRepository;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.erp.cuahangtienloi.validation.InputValidator.nonNegative;

@Service
@RequiredArgsConstructor
public class ChamCongService {

    private final ChamCongRepository chamCongRepository;
    private final NhanVienRepository nhanVienRepository;
    private final BranchAccessService branchAccessService;

    /**
     * Khoảng thời gian mặc định của mỗi ca (giờ).
     * checkInAt/checkOutAt dùng làm mốc planned time.
     */
    private static final Map<String, int[]> SHIFT_HOURS = Map.of(
            "MORNING", new int[]{6, 14},
            "AFTERNOON", new int[]{14, 22},
            "NIGHT", new int[]{22, 30} // 22h hôm trước → 06h hôm sau (30 = 6 + 24)
    );

    public LocalDateTime plannedCheckIn(LocalDate workDate, String caLamViec) {
        int[] h = SHIFT_HOURS.getOrDefault(caLamViec, new int[]{8, 17});
        return LocalDateTime.of(workDate, java.time.LocalTime.of(h[0] % 24, 0));
    }

    public LocalDateTime plannedCheckOut(LocalDate workDate, String caLamViec) {
        int[] h = SHIFT_HOURS.getOrDefault(caLamViec, new int[]{8, 17});
        int endHour = h[1];
        // Ca đêm kết thúc 06:00 ngày hôm sau
        LocalDate endDate = endHour >= 24 ? workDate.plusDays(1) : workDate;
        return LocalDateTime.of(endDate, java.time.LocalTime.of(endHour % 24, 0));
    }

    @Transactional(readOnly = true)
    public List<ChamCongDTO> getAll(HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        return chamCongRepository.findAll().stream()
                .filter(cc -> canRead(actor, cc.getIdNhanVien()))
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ResponseEntity<?> getById(UUID id, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        return chamCongRepository.findById(id)
                .filter(cc -> canRead(actor, cc.getIdNhanVien()))
                .map(cc -> ResponseEntity.ok(toDTO(cc)))
                .orElse(ResponseEntity.notFound().build());
    }

    @Transactional(readOnly = true)
    public List<ChamCongDTO> getByNhanVien(UUID idNhanVien, HttpServletRequest request) {
        requireReadableEmployee(branchAccessService.requireAuthenticatedEmployee(request), idNhanVien);
        return chamCongRepository.findByIdNhanVien(idNhanVien).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ChamCongDTO> getByDate(LocalDate workDate, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        return chamCongRepository.findByWorkDate(workDate).stream()
                .filter(cc -> canRead(actor, cc.getIdNhanVien()))
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ChamCongDTO> getByNhanVienAndDateRange(UUID idNhanVien, LocalDate from, LocalDate to, HttpServletRequest request) {
        requireReadableEmployee(branchAccessService.requireAuthenticatedEmployee(request), idNhanVien);
        return chamCongRepository
                .findByIdNhanVienAndWorkDateBetween(idNhanVien, from, to).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ChamCongDTO> getByDateRange(LocalDate start, LocalDate end, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        return chamCongRepository
                .findByWorkDateBetween(start, end).stream()
                .filter(cc -> canRead(actor, cc.getIdNhanVien()))
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public ResponseEntity<?> create(ChamCong request, HttpServletRequest httpRequest) {
        if (request.getIdNhanVien() == null || !nhanVienRepository.existsById(request.getIdNhanVien())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Nhân viên không tồn tại"));
        }
        if (request.getWorkDate() == null) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Ngày làm việc không được để trống"));
        }
        requireReadableEmployee(branchAccessService.requireAuthenticatedEmployee(httpRequest), request.getIdNhanVien());
        validateTimeAndAmounts(request);

        ChamCong cc = new ChamCong();
        cc.setId(UUID.randomUUID());
        cc.setIdNhanVien(request.getIdNhanVien());
        cc.setWorkDate(request.getWorkDate());
        cc.setCaLamViec(request.getCaLamViec());
        cc.setCheckInAt(request.getCheckInAt());
        cc.setCheckOutAt(request.getCheckOutAt());
        cc.setClockInAt(request.getClockInAt());
        cc.setClockOutAt(request.getClockOutAt());
        cc.setDiTrePhut(request.getDiTrePhut());
        cc.setOvertimeHours(request.getOvertimeHours() != null ? request.getOvertimeHours() : BigDecimal.ZERO);
        cc.setBreakHours(request.getBreakHours() != null ? request.getBreakHours() : BigDecimal.ZERO);
        cc.setTongGioLam(request.getTongGioLam());
        cc.setTrangThai(request.getTrangThai() != null ? request.getTrangThai() : "SCHEDULED");
        cc.setDaThanhToan(false);
        cc.setGhiChu(request.getGhiChu());
        cc.setNgayTao(LocalDateTime.now());
        cc.setNgayCapNhat(LocalDateTime.now());

        chamCongRepository.save(cc);
        return ResponseEntity.ok(toDTO(cc));
    }

    @Transactional
    public ResponseEntity<?> update(UUID id, ChamCong request, HttpServletRequest httpRequest) {
        return chamCongRepository.findById(id)
                .map(cc -> {
                    requireReadableEmployee(branchAccessService.requireAuthenticatedEmployee(httpRequest), cc.getIdNhanVien());
                    if (Boolean.TRUE.equals(cc.getDaThanhToan())) {
                        return ResponseEntity.badRequest().body(ApiResponse.err("Không sửa chấm công đã được thanh toán"));
                    }
                    validateTimeAndAmounts(request);
                    if (request.getWorkDate() != null) cc.setWorkDate(request.getWorkDate());
                    if (request.getCaLamViec() != null) cc.setCaLamViec(request.getCaLamViec());
                    if (request.getCheckInAt() != null) cc.setCheckInAt(request.getCheckInAt());
                    if (request.getCheckOutAt() != null) cc.setCheckOutAt(request.getCheckOutAt());
                    if (request.getClockInAt() != null) cc.setClockInAt(request.getClockInAt());
                    if (request.getClockOutAt() != null) cc.setClockOutAt(request.getClockOutAt());
                    if (request.getDiTrePhut() != null) cc.setDiTrePhut(request.getDiTrePhut());
                    if (request.getOvertimeHours() != null) cc.setOvertimeHours(request.getOvertimeHours());
                    if (request.getBreakHours() != null) cc.setBreakHours(request.getBreakHours());
                    if (request.getTongGioLam() != null) cc.setTongGioLam(request.getTongGioLam());
                    if (request.getTrangThai() != null) cc.setTrangThai(request.getTrangThai());
                    if (request.getDaThanhToan() != null) {
                        return ResponseEntity.badRequest().body(ApiResponse.err(
                                "Trạng thái thanh toán chỉ được cập nhật khi duyệt chi lương"));
                    }
                    if (request.getGhiChu() != null) cc.setGhiChu(request.getGhiChu());
                    cc.setNgayCapNhat(LocalDateTime.now());
                    chamCongRepository.save(cc);
                    return ResponseEntity.ok(toDTO(cc));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @Transactional
    public ResponseEntity<?> delete(UUID id) {
        Optional<ChamCong> attendance = chamCongRepository.findById(id);
        if (attendance.isPresent()) {
            if (Boolean.TRUE.equals(attendance.get().getDaThanhToan())) {
                return ResponseEntity.badRequest().body(ApiResponse.err("Không xóa chấm công đã được thanh toán"));
            }
            chamCongRepository.deleteById(id);
            return ResponseEntity.ok(ApiResponse.ok("Xóa chấm công thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    @Transactional
    public ResponseEntity<?> scheduleForEmployee(UUID idNhanVien, String workDate, HttpServletRequest httpRequest) {
        Optional<NhanVien> optNv = nhanVienRepository.findById(idNhanVien);
        if (optNv.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        NhanVien nv = optNv.get();
        requireReadableEmployee(branchAccessService.requireAuthenticatedEmployee(httpRequest), nv.getId());
        LocalDate date = (workDate != null && !workDate.isBlank()) ? LocalDate.parse(workDate) : LocalDate.now();
        String ca = nv.getCaMacDinh();
        if (ca == null || ca.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Nhân viên chưa có ca mặc định"));
        }

        // Bỏ qua nếu đã có record cho (nv, date, ca)
        Optional<ChamCong> existing = chamCongRepository.findByIdNhanVienAndWorkDateAndCaLamViec(idNhanVien, date, ca);
        if (existing.isPresent()) {
            return ResponseEntity.ok(List.of(toDTO(existing.get())));
        }

        ChamCong cc = new ChamCong();
        cc.setId(UUID.randomUUID());
        cc.setIdNhanVien(idNhanVien);
        cc.setWorkDate(date);
        cc.setCaLamViec(ca);
        cc.setCheckInAt(plannedCheckIn(date, ca));
        cc.setCheckOutAt(plannedCheckOut(date, ca));
        cc.setOvertimeHours(BigDecimal.ZERO);
        cc.setBreakHours(BigDecimal.ZERO);
        cc.setTrangThai("SCHEDULED");
        cc.setDaThanhToan(false);
        cc.setNgayTao(LocalDateTime.now());
        cc.setNgayCapNhat(LocalDateTime.now());

        chamCongRepository.save(cc);
        return ResponseEntity.ok(List.of(toDTO(cc)));
    }

    @Transactional
    public ResponseEntity<?> clockIn(UUID id, HttpServletRequest httpRequest) {
        Optional<ChamCong> opt = chamCongRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        ChamCong cc = opt.get();
        requireReadableEmployee(branchAccessService.requireAuthenticatedEmployee(httpRequest), cc.getIdNhanVien());
        if (!cc.getWorkDate().equals(LocalDate.now())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Chỉ được check-in ca của hôm nay"));
        }
        if (Boolean.TRUE.equals(cc.getDaThanhToan()) || "ABSENT".equals(cc.getTrangThai()) || "LEAVE".equals(cc.getTrangThai())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Ca này không thể check-in"));
        }
        if (cc.getClockInAt() != null) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Đã check-in trước đó"));
        }

        LocalDateTime now = LocalDateTime.now();
        cc.setClockInAt(now);
        cc.setTrangThai("PRESENT");
        if (cc.getCheckInAt() != null && now.isAfter(cc.getCheckInAt())) {
            long minutes = Duration.between(cc.getCheckInAt(), now).toMinutes();
            cc.setDiTrePhut((int) Math.min(minutes, Integer.MAX_VALUE));
            if (cc.getDiTrePhut() > 0) cc.setTrangThai("LATE");
        }
        cc.setNgayCapNhat(LocalDateTime.now());
        chamCongRepository.save(cc);
        return ResponseEntity.ok(toDTO(cc));
    }

    @Transactional
    public ResponseEntity<?> clockOut(UUID id, HttpServletRequest httpRequest) {
        Optional<ChamCong> opt = chamCongRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        ChamCong cc = opt.get();
        requireReadableEmployee(branchAccessService.requireAuthenticatedEmployee(httpRequest), cc.getIdNhanVien());
        if (!isCheckoutDate(cc, LocalDate.now())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Chỉ được check-out trong ngày của ca làm việc"));
        }
        if (Boolean.TRUE.equals(cc.getDaThanhToan())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Ca này đã được thanh toán"));
        }
        if (cc.getClockInAt() == null) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Chưa check-in"));
        }
        if (cc.getClockOutAt() != null) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Đã check-out trước đó"));
        }

        LocalDateTime now = LocalDateTime.now();
        cc.setClockOutAt(now);
        cc.setNgayCapNhat(LocalDateTime.now());

        long minutes = Duration.between(cc.getClockInAt(), now).toMinutes();
        BigDecimal breakHours = cc.getBreakHours() != null ? cc.getBreakHours() : BigDecimal.ZERO;
        long breakMinutes = breakHours.multiply(BigDecimal.valueOf(60))
                .setScale(0, java.math.RoundingMode.HALF_UP)
                .longValue();
        BigDecimal tong = BigDecimal.valueOf(Math.max(0, minutes - breakMinutes))
                .divide(BigDecimal.valueOf(60), 2, java.math.RoundingMode.HALF_UP);
        cc.setTongGioLam(tong);
        if (cc.getCheckOutAt() != null && now.isAfter(cc.getCheckOutAt())) {
            long overtimeMinutes = Duration.between(cc.getCheckOutAt(), now).toMinutes();
            cc.setOvertimeHours(BigDecimal.valueOf(Math.max(0, overtimeMinutes))
                    .divide(BigDecimal.valueOf(60), 2, java.math.RoundingMode.HALF_UP));
        }
        chamCongRepository.save(cc);
        return ResponseEntity.ok(toDTO(cc));
    }

    @Transactional
    public ResponseEntity<?> scheduleRange(UUID idNhanVien, String fromDate, String toDate, HttpServletRequest httpRequest) {
        Optional<NhanVien> optNv = nhanVienRepository.findById(idNhanVien);
        if (optNv.isEmpty()) return ResponseEntity.notFound().build();
        NhanVien nv = optNv.get();
        requireReadableEmployee(branchAccessService.requireAuthenticatedEmployee(httpRequest), nv.getId());
        String ca = nv.getCaMacDinh();
        if (ca == null || ca.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Nhân viên chưa có ca mặc định"));
        }

        LocalDate from = LocalDate.parse(fromDate);
        LocalDate to = LocalDate.parse(toDate);
        List<ChamCongDTO> created = new ArrayList<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            Optional<ChamCong> existing = chamCongRepository.findByIdNhanVienAndWorkDateAndCaLamViec(idNhanVien, d, ca);
            if (existing.isPresent()) {
                created.add(toDTO(existing.get()));
                continue;
            }
            ChamCong cc = new ChamCong();
            cc.setId(UUID.randomUUID());
            cc.setIdNhanVien(idNhanVien);
            cc.setWorkDate(d);
            cc.setCaLamViec(ca);
            cc.setCheckInAt(plannedCheckIn(d, ca));
            cc.setCheckOutAt(plannedCheckOut(d, ca));
            cc.setOvertimeHours(BigDecimal.ZERO);
            cc.setBreakHours(BigDecimal.ZERO);
            cc.setTrangThai("SCHEDULED");
            cc.setDaThanhToan(false);
            cc.setNgayTao(LocalDateTime.now());
            cc.setNgayCapNhat(LocalDateTime.now());
            chamCongRepository.save(cc);
            created.add(toDTO(cc));
        }
        return ResponseEntity.ok(created);
    }

    public ChamCongDTO toDTO(ChamCong cc) {
        ChamCongDTO dto = new ChamCongDTO();
        dto.setId(cc.getId());
        dto.setIdNhanVien(cc.getIdNhanVien());
        dto.setWorkDate(cc.getWorkDate());
        dto.setCaLamViec(cc.getCaLamViec());
        dto.setCheckInAt(cc.getCheckInAt());
        dto.setCheckOutAt(cc.getCheckOutAt());
        dto.setClockInAt(cc.getClockInAt());
        dto.setClockOutAt(cc.getClockOutAt());
        dto.setDiTrePhut(cc.getDiTrePhut());
        dto.setOvertimeHours(cc.getOvertimeHours());
        dto.setBreakHours(cc.getBreakHours());
        dto.setTongGioLam(cc.getTongGioLam());
        dto.setTrangThai(cc.getTrangThai());
        dto.setDaThanhToan(cc.getDaThanhToan());
        dto.setGhiChu(cc.getGhiChu());

        if (cc.getIdNhanVien() != null) {
            nhanVienRepository.findById(cc.getIdNhanVien())
                    .ifPresent(nv -> {
                        dto.setTenNhanVien(nv.getHoTen());
                        dto.setMaNhanVien(nv.getMaNhanVien());
                        dto.setIdChiNhanh(nv.getIdChiNhanh());
                    });
        }

        return dto;
    }

    public boolean canRead(NhanVien actor, UUID employeeId) {
        return employeeId != null && nhanVienRepository.findById(employeeId)
                .map(target -> branchAccessService.canReadEmployee(actor, target))
                .orElse(false);
    }

    public void requireReadableEmployee(NhanVien actor, UUID employeeId) {
        if (!canRead(actor, employeeId)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Không được xem hoặc sửa chấm công của nhân viên này");
        }
    }

    public boolean isCheckoutDate(ChamCong cc, LocalDate date) {
        if (date.equals(cc.getWorkDate())) return true;
        return "NIGHT".equals(cc.getCaLamViec()) && date.equals(cc.getWorkDate().plusDays(1));
    }

    private void validateTimeAndAmounts(ChamCong request) {
        if (request.getCheckInAt() != null && request.getCheckOutAt() != null
                && !request.getCheckInAt().isBefore(request.getCheckOutAt())) {
            throw new IllegalArgumentException("Giờ bắt đầu phải trước giờ kết thúc");
        }
        if (request.getClockInAt() != null && request.getClockOutAt() != null
                && !request.getClockInAt().isBefore(request.getClockOutAt())) {
            throw new IllegalArgumentException("Giờ check-in phải trước giờ check-out");
        }
        nonNegative(request.getDiTrePhut(), "Số phút đi trễ");
        nonNegative(request.getOvertimeHours(), "Giờ tăng ca");
        nonNegative(request.getBreakHours(), "Giờ nghỉ");
        nonNegative(request.getTongGioLam(), "Tổng giờ làm");
    }
}
