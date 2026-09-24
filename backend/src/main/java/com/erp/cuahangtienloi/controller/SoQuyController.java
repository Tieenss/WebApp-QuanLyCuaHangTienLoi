package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.dto.SoQuyDTO;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.entity.SoQuy;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import com.erp.cuahangtienloi.service.BranchAccessService;
import com.erp.cuahangtienloi.service.SoQuyService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/so-quy")
@RequiredArgsConstructor
public class SoQuyController {

    private final SoQuyService soQuyService;
    private final BranchAccessService branchAccessService;
    private final NhanVienRepository nhanVienRepository;

    private UUID resolveAuthenticatedIdNhanVien(HttpServletRequest request) {
        Object attr = request.getAttribute("authenticatedIdNhanVien");
        if (attr instanceof String s) {
            try {
                UUID id = UUID.fromString(s);
                if (nhanVienRepository.existsById(id)) {
                    return id;
                }
            } catch (IllegalArgumentException ignored) {}
        }
        return null;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY')")
    public ResponseEntity<List<SoQuyDTO>> getAll(HttpServletRequest request) {
        NhanVien employee = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(soQuyService.getAll(employee));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY')")
    public ResponseEntity<?> getById(@PathVariable UUID id, HttpServletRequest request) {
        NhanVien employee = branchAccessService.requireAuthenticatedEmployee(request);
        return soQuyService.getById(id, employee)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-branch/{idChiNhanh}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY')")
    public ResponseEntity<List<SoQuyDTO>> getByChiNhanh(@PathVariable UUID idChiNhanh, HttpServletRequest request) {
        NhanVien employee = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(soQuyService.getByChiNhanh(idChiNhanh, employee));
    }

    @GetMapping("/by-direction/{direction}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY')")
    public ResponseEntity<List<SoQuyDTO>> getByDirection(@PathVariable String direction, HttpServletRequest request) {
        NhanVien employee = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(soQuyService.getByDirection(direction, employee));
    }

    @GetMapping("/by-hang-muc/{hangMuc}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY')")
    public ResponseEntity<List<SoQuyDTO>> getByHangMuc(@PathVariable String hangMuc, HttpServletRequest request) {
        NhanVien employee = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(soQuyService.getByHangMuc(hangMuc, employee));
    }

    @GetMapping("/by-date-range")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY')")
    public ResponseEntity<List<SoQuyDTO>> getByDateRange(
            @RequestParam LocalDate from, @RequestParam LocalDate to, HttpServletRequest request) {
        NhanVien employee = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(soQuyService.getByDateRange(from, to, employee));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<?> create(@RequestBody SoQuy request, HttpServletRequest httpRequest) {
        UUID fallbackId = resolveAuthenticatedIdNhanVien(httpRequest);
        return ResponseEntity.ok(soQuyService.create(request, fallbackId));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody SoQuy request) {
        return soQuyService.update(id, request)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (soQuyService.delete(id)) {
            return ResponseEntity.ok(ApiResponse.ok("Xóa sổ quỹ thành công"));
        }
        return ResponseEntity.notFound().build();
    }
}
