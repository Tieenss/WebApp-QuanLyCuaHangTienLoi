package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.ChamCongDTO;
import com.erp.cuahangtienloi.entity.ChamCong;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.repository.ChamCongRepository;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/cham-cong")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ChamCongController {

    private final ChamCongRepository chamCongRepository;
    private final NhanVienRepository nhanVienRepository;

    /**
 * Khoảng thời gian mặc định của mỗi ca (giờ).
 * checkInAt/checkOutAt dùng làm mốc planned time.
 */
private static final java.util.Map<String, int[]> SHIFT_HOURS = java.util.Map.of(
        "MORNING", new int[]{6, 14},
        "AFTERNOON", new int[]{14, 22},
        "NIGHT", new int[]{22, 30} // 22h hôm trước → 06h hôm sau (30 = 6 + 24)
);

private LocalDateTime plannedCheckIn(LocalDate workDate, String caLamViec) {
    int[] h = SHIFT_HOURS.getOrDefault(caLamViec, new int[]{8, 17});
    return LocalDateTime.of(workDate, java.time.LocalTime.of(h[0] % 24, 0));
}

private LocalDateTime plannedCheckOut(LocalDate workDate, String caLamViec) {
    int[] h = SHIFT_HOURS.getOrDefault(caLamViec, new int[]{8, 17});
    int endHour = h[1];
    // Ca đêm kết thúc 06:00 ngày hôm sau
    LocalDate endDate = endHour >= 24 ? workDate.plusDays(1) : workDate;
    return LocalDateTime.of(endDate, java.time.LocalTime.of(endHour % 24, 0));
}

    @GetMapping
    public ResponseEntity<List<ChamCongDTO>> getAll() {
        List<ChamCongDTO> list = chamCongRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable UUID id) {
        return chamCongRepository.findById(id)
                .map(cc -> ResponseEntity.ok(toDTO(cc)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-employee/{idNhanVien}")
    public ResponseEntity<List<ChamCongDTO>> getByNhanVien(@PathVariable UUID idNhanVien) {
        List<ChamCongDTO> list = chamCongRepository.findByIdNhanVien(idNhanVien).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-date/{workDate}")
    public ResponseEntity<List<ChamCongDTO>> getByDate(@PathVariable LocalDate workDate) {
        List<ChamCongDTO> list = chamCongRepository.findByWorkDate(workDate).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-employee/{idNhanVien}/from/{from}/to/{to}")
    public ResponseEntity<List<ChamCongDTO>> getByNhanVienAndDateRange(
            @PathVariable UUID idNhanVien,
            @PathVariable LocalDate from,
            @PathVariable LocalDate to) {
        List<ChamCongDTO> list = chamCongRepository
                .findByIdNhanVienAndWorkDateBetween(idNhanVien, from, to).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    /**
     * Lấy toàn bộ chấm công trong khoảng ngày (không filter theo nhân viên).
     * Endpoint frontend dùng cho bảng chấm công theo filter ngày.
     */
    @GetMapping("/by-date-range")
    public ResponseEntity<List<ChamCongDTO>> getByDateRange(
            @RequestParam("start") LocalDate start,
            @RequestParam("end") LocalDate end) {
        List<ChamCongDTO> list = chamCongRepository
                .findByWorkDateBetween(start, end).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody ChamCong request) {
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
        cc.setTrangThai(request.getTrangThai() != null ? request.getTrangThai() : "PRESENT");
        cc.setDaThanhToan(request.getDaThanhToan() != null ? request.getDaThanhToan() : false);
        cc.setGhiChu(request.getGhiChu());
        cc.setNgayTao(LocalDateTime.now());
        cc.setNgayCapNhat(LocalDateTime.now());

        chamCongRepository.save(cc);
        return ResponseEntity.ok(toDTO(cc));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody ChamCong request) {
        return chamCongRepository.findById(id)
                .map(cc -> {
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
                    if (request.getDaThanhToan() != null) cc.setDaThanhToan(request.getDaThanhToan());
                    if (request.getGhiChu() != null) cc.setGhiChu(request.getGhiChu());
                    cc.setNgayCapNhat(LocalDateTime.now());
                    chamCongRepository.save(cc);
                    return ResponseEntity.ok(toDTO(cc));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (chamCongRepository.existsById(id)) {
            chamCongRepository.deleteById(id);
            return ResponseEntity.ok(new SuccessResponse("Xóa chấm công thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    /**
     * Sinh lịch ca tự động cho 1 nhân viên trong 1 ngày dựa trên `ca_mac_dinh`.
     * Idempotent: nếu ca đã tồn tại thì bỏ qua (UNIQUE constraint).
     * Trả về danh sách các record được tạo.
     */
    @PostMapping("/schedule/{idNhanVien}")
    @Transactional
    public ResponseEntity<?> scheduleForEmployee(
            @PathVariable UUID idNhanVien,
            @RequestParam(required = false) String workDate) {
        Optional<NhanVien> optNv = nhanVienRepository.findById(idNhanVien);
        if (optNv.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        NhanVien nv = optNv.get();
        LocalDate date = (workDate != null && !workDate.isBlank()) ? LocalDate.parse(workDate) : LocalDate.now();
        String ca = nv.getCaMacDinh();
        if (ca == null || ca.isBlank()) {
            return ResponseEntity.badRequest().body(new SuccessResponse("Nhân viên chưa có ca mặc định"));
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
        cc.setTrangThai("PRESENT");
        cc.setDaThanhToan(false);
        cc.setNgayTao(LocalDateTime.now());
        cc.setNgayCapNhat(LocalDateTime.now());

        chamCongRepository.save(cc);
        return ResponseEntity.ok(List.of(toDTO(cc)));
    }

    /**
     * Check-in: ghi `clockInAt = now` cho record theo id.
     * Tự tính `diTrePhut` nếu vào muộn so với `checkInAt` planned.
     */
    @PostMapping("/{id}/clock-in")
    @Transactional
    public ResponseEntity<?> clockIn(@PathVariable UUID id) {
        Optional<ChamCong> opt = chamCongRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        ChamCong cc = opt.get();
        if (cc.getClockInAt() != null) {
            return ResponseEntity.badRequest().body(new SuccessResponse("Đã check-in trước đó"));
        }

        LocalDateTime now = LocalDateTime.now();
        cc.setClockInAt(now);
        if (cc.getCheckInAt() != null && now.isAfter(cc.getCheckInAt())) {
            long minutes = Duration.between(cc.getCheckInAt(), now).toMinutes();
            cc.setDiTrePhut((int) Math.min(minutes, Integer.MAX_VALUE));
            if (cc.getDiTrePhut() > 0) cc.setTrangThai("LATE");
        }
        cc.setNgayCapNhat(LocalDateTime.now());
        chamCongRepository.save(cc);
        return ResponseEntity.ok(toDTO(cc));
    }

    /**
     * Check-out: ghi `clockOutAt = now`, tính `tongGioLam`.
     */
    @PostMapping("/{id}/clock-out")
    @Transactional
    public ResponseEntity<?> clockOut(@PathVariable UUID id) {
        Optional<ChamCong> opt = chamCongRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        ChamCong cc = opt.get();
        if (cc.getClockInAt() == null) {
            return ResponseEntity.badRequest().body(new SuccessResponse("Chưa check-in"));
        }
        if (cc.getClockOutAt() != null) {
            return ResponseEntity.badRequest().body(new SuccessResponse("Đã check-out trước đó"));
        }

        LocalDateTime now = LocalDateTime.now();
        cc.setClockOutAt(now);
        cc.setNgayCapNhat(LocalDateTime.now());

        // Tổng giờ làm = clockOut - clockIn - break (giờ)
        long minutes = Duration.between(cc.getClockInAt(), now).toMinutes();
        BigDecimal breakHours = cc.getBreakHours() != null ? cc.getBreakHours() : BigDecimal.ZERO;
        BigDecimal tong = BigDecimal.valueOf(Math.max(0, minutes - breakHours.longValue() * 60L))
                .divide(BigDecimal.valueOf(60), 2, java.math.RoundingMode.HALF_UP);
        cc.setTongGioLam(tong);
        chamCongRepository.save(cc);
        return ResponseEntity.ok(toDTO(cc));
    }

    /**
     * Helper: lấy danh sách ca sắp tới (đã có record) của nhân viên trong khoảng ngày.
     * Nếu chưa có record cho ca hôm nay → tự động sinh lịch.
     */
    @PostMapping("/schedule-range/{idNhanVien}")
    @Transactional
    public ResponseEntity<?> scheduleRange(
            @PathVariable UUID idNhanVien,
            @RequestParam String fromDate,
            @RequestParam String toDate) {
        Optional<NhanVien> optNv = nhanVienRepository.findById(idNhanVien);
        if (optNv.isEmpty()) return ResponseEntity.notFound().build();
        NhanVien nv = optNv.get();
        String ca = nv.getCaMacDinh();
        if (ca == null || ca.isBlank()) {
            return ResponseEntity.badRequest().body(new SuccessResponse("Nhân viên chưa có ca mặc định"));
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
            cc.setTrangThai("PRESENT");
            cc.setDaThanhToan(false);
            cc.setNgayTao(LocalDateTime.now());
            cc.setNgayCapNhat(LocalDateTime.now());
            chamCongRepository.save(cc);
            created.add(toDTO(cc));
        }
        return ResponseEntity.ok(created);
    }

    private ChamCongDTO toDTO(ChamCong cc) {
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
                    .ifPresent(nv -> dto.setTenNhanVien(nv.getHoTen()));
        }

        return dto;
    }

    record SuccessResponse(String message) {}
}
