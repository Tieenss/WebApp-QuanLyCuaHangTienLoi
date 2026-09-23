package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.ChamCongDTO;
import com.erp.cuahangtienloi.entity.ChamCong;
import com.erp.cuahangtienloi.service.ChamCongService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/cham-cong")
@RequiredArgsConstructor
public class ChamCongController {

    private final ChamCongService chamCongService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ChamCongDTO>> getAll(HttpServletRequest request) {
        return ResponseEntity.ok(chamCongService.getAll(request));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getById(@PathVariable UUID id, HttpServletRequest request) {
        return chamCongService.getById(id, request);
    }

    @GetMapping("/by-employee/{idNhanVien}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ChamCongDTO>> getByNhanVien(@PathVariable UUID idNhanVien, HttpServletRequest request) {
        return ResponseEntity.ok(chamCongService.getByNhanVien(idNhanVien, request));
    }

    @GetMapping("/by-date/{workDate}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ChamCongDTO>> getByDate(@PathVariable LocalDate workDate, HttpServletRequest request) {
        return ResponseEntity.ok(chamCongService.getByDate(workDate, request));
    }

    @GetMapping("/by-employee/{idNhanVien}/from/{from}/to/{to}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ChamCongDTO>> getByNhanVienAndDateRange(
            @PathVariable UUID idNhanVien,
            @PathVariable LocalDate from,
            @PathVariable LocalDate to, HttpServletRequest request) {
        return ResponseEntity.ok(chamCongService.getByNhanVienAndDateRange(idNhanVien, from, to, request));
    }

    @GetMapping("/by-date-range")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ChamCongDTO>> getByDateRange(
            @RequestParam("from") LocalDate start,
            @RequestParam("to") LocalDate end, HttpServletRequest request) {
        return ResponseEntity.ok(chamCongService.getByDateRange(start, end, request));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<?> create(@RequestBody ChamCong request, HttpServletRequest httpRequest) {
        return chamCongService.create(request, httpRequest);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody ChamCong request, HttpServletRequest httpRequest) {
        return chamCongService.update(id, request, httpRequest);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        return chamCongService.delete(id);
    }

    @PostMapping("/schedule/{idNhanVien}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<?> scheduleForEmployee(
            @PathVariable UUID idNhanVien,
            @RequestParam(required = false) String workDate, HttpServletRequest httpRequest) {
        return chamCongService.scheduleForEmployee(idNhanVien, workDate, httpRequest);
    }

    @PostMapping("/{id}/clock-in")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> clockIn(@PathVariable UUID id, HttpServletRequest httpRequest) {
        return chamCongService.clockIn(id, httpRequest);
    }

    @PostMapping("/{id}/clock-out")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> clockOut(@PathVariable UUID id, HttpServletRequest httpRequest) {
        return chamCongService.clockOut(id, httpRequest);
    }

    @PostMapping("/schedule-range/{idNhanVien}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> scheduleRange(
            @PathVariable UUID idNhanVien,
            @RequestParam("from") String fromDate,
            @RequestParam("to") String toDate, HttpServletRequest httpRequest) {
        return chamCongService.scheduleRange(idNhanVien, fromDate, toDate, httpRequest);
    }
}
