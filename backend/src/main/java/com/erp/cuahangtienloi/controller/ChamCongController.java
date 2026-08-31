package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.ChamCongDTO;
import com.erp.cuahangtienloi.entity.ChamCong;
import com.erp.cuahangtienloi.repository.ChamCongRepository;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/cham-cong")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ChamCongController {

    private final ChamCongRepository chamCongRepository;
    private final NhanVienRepository nhanVienRepository;

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
