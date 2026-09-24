package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.BangLuongDTO;
import com.erp.cuahangtienloi.dto.BatchApproveRequest;
import com.erp.cuahangtienloi.dto.HourAdjustmentRequest;
import com.erp.cuahangtienloi.entity.BangLuong;
import com.erp.cuahangtienloi.service.BangLuongService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/bang-luong")
@RequiredArgsConstructor
public class BangLuongController {

    private final BangLuongService bangLuongService;

    @PostMapping("/generate/{thangNam}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<?> generateForMonth(@PathVariable String thangNam) {
        return bangLuongService.generateForMonth(thangNam);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY')")
    public ResponseEntity<List<BangLuongDTO>> getAll(
            @RequestParam(required = false) String period, HttpServletRequest request) {
        return ResponseEntity.ok(bangLuongService.getAll(period, request));
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<BangLuongDTO>> getMine(
            @RequestParam(required = false) String period, HttpServletRequest request) {
        return ResponseEntity.ok(bangLuongService.getMine(period, request));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY')")
    public ResponseEntity<?> getById(@PathVariable UUID id, HttpServletRequest request) {
        return bangLuongService.getById(id, request);
    }

    @GetMapping("/by-employee/{idNhanVien}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY')")
    public ResponseEntity<List<BangLuongDTO>> getByNhanVien(@PathVariable UUID idNhanVien, HttpServletRequest request) {
        return ResponseEntity.ok(bangLuongService.getByNhanVien(idNhanVien, request));
    }

    @GetMapping("/by-month/{thangNam}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY')")
    public ResponseEntity<List<BangLuongDTO>> getByThangNam(@PathVariable String thangNam, HttpServletRequest request) {
        return ResponseEntity.ok(bangLuongService.getByThangNam(thangNam, request));
    }

    @GetMapping("/by-branch/{idChiNhanh}/month/{thangNam}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY')")
    public ResponseEntity<List<BangLuongDTO>> getByChiNhanhAndThangNam(
            @PathVariable UUID idChiNhanh, @PathVariable String thangNam, HttpServletRequest request) {
        return ResponseEntity.ok(bangLuongService.getByChiNhanhAndThangNam(idChiNhanh, thangNam, request));
    }

    @GetMapping("/by-status/{trangThai}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY')")
    public ResponseEntity<List<BangLuongDTO>> getByStatus(@PathVariable String trangThai, HttpServletRequest request) {
        return ResponseEntity.ok(bangLuongService.getByStatus(trangThai, request));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<?> create(@RequestBody BangLuong request) {
        return bangLuongService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY')")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody BangLuong request, HttpServletRequest httpRequest) {
        return bangLuongService.update(id, request, httpRequest);
    }

    @PatchMapping("/{id}/hours-adjustment")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<?> adjustHours(@PathVariable UUID id,
                                         @RequestBody HourAdjustmentRequest request,
                                         HttpServletRequest httpRequest) {
        return bangLuongService.adjustHours(id, request, httpRequest);
    }

    @PostMapping("/{id}/confirm-hours")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<?> confirmHours(@PathVariable UUID id, HttpServletRequest request) {
        return bangLuongService.confirmHours(id, request);
    }

    @PostMapping("/{id}/approve-payment")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<?> approvePayment(@PathVariable UUID id, HttpServletRequest request) {
        return ResponseEntity.ok(bangLuongService.approvePayment(id, request));
    }

    @PostMapping("/approve-payment/batch")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<?> approvePaymentBatch(@RequestBody BatchApproveRequest request,
                                                  HttpServletRequest httpRequest) {
        return ResponseEntity.ok(bangLuongService.approvePaymentBatch(request, httpRequest));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        return bangLuongService.delete(id);
    }
}
