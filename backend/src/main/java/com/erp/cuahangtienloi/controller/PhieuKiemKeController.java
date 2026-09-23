package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.PhieuKiemKeDTO;
import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.entity.PhieuKiemKe;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import com.erp.cuahangtienloi.service.BranchAccessService;
import com.erp.cuahangtienloi.service.PhieuKiemKeService;
import com.erp.cuahangtienloi.service.PhieuKiemKeService.CreateStocktakeRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/phieu-kiem-ke")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY', 'KE_TOAN')")
public class PhieuKiemKeController {

    private final PhieuKiemKeService phieuKiemKeService;
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
    public ResponseEntity<List<PhieuKiemKeDTO>> getAll(HttpServletRequest request) {
        var actor = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(phieuKiemKeService.getAll(actor));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable UUID id, HttpServletRequest request) {
        var actor = branchAccessService.requireAuthenticatedEmployee(request);
        return phieuKiemKeService.getById(id, actor)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-chi-nhanh/{idChiNhanh}")
    public ResponseEntity<List<PhieuKiemKeDTO>> getByChiNhanh(@PathVariable UUID idChiNhanh, HttpServletRequest request) {
        var actor = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(phieuKiemKeService.getByChiNhanh(idChiNhanh, actor));
    }

    @GetMapping("/by-status/{trangThai}")
    public ResponseEntity<List<PhieuKiemKeDTO>> getByStatus(@PathVariable String trangThai, HttpServletRequest request) {
        var actor = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(phieuKiemKeService.getByStatus(trangThai, actor));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> create(@RequestBody PhieuKiemKe request, HttpServletRequest httpRequest) {
        var actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        UUID idNguoiTao = resolveAuthenticatedIdNhanVien(httpRequest);
        return ResponseEntity.ok(phieuKiemKeService.create(request, idNguoiTao, actor));
    }

    @PostMapping("/with-lines")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> createWithLines(@Valid @RequestBody CreateStocktakeRequest request, HttpServletRequest httpRequest) {
        var actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        UUID idNguoiTao = resolveAuthenticatedIdNhanVien(httpRequest);
        return ResponseEntity.ok(phieuKiemKeService.createWithLines(request, idNguoiTao, actor));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody PhieuKiemKe request, HttpServletRequest httpRequest) {
        var actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return phieuKiemKeService.update(id, request, actor)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/submit")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> submit(@PathVariable UUID id, HttpServletRequest httpRequest) {
        var actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return ResponseEntity.ok(phieuKiemKeService.submit(id, actor));
    }

    @PostMapping("/{id}/balance")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<?> balance(@PathVariable UUID id, HttpServletRequest httpRequest) {
        var actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return ResponseEntity.ok(phieuKiemKeService.balance(id, actor));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> cancel(@PathVariable UUID id, HttpServletRequest httpRequest) {
        var actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return ResponseEntity.ok(phieuKiemKeService.cancel(id, actor));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> delete(@PathVariable UUID id, HttpServletRequest httpRequest) {
        var actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        if (phieuKiemKeService.delete(id, actor)) {
            return ResponseEntity.ok(ApiResponse.ok("Xóa phiếu kiểm kê thành công"));
        }
        return ResponseEntity.notFound().build();
    }
}
