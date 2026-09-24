package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.entity.ChiTietKiemKe;
import com.erp.cuahangtienloi.service.BranchAccessService;
import com.erp.cuahangtienloi.service.PhieuKiemKeService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chi-tiet-kiem-ke")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY', 'KE_TOAN')")
public class ChiTietKiemKeController {

    private final PhieuKiemKeService phieuKiemKeService;
    private final BranchAccessService branchAccessService;

    @GetMapping("/by-phieu/{idPhieuKiemKe}")
    public ResponseEntity<List<ChiTietKiemKe>> getByPhieuKiemKe(@PathVariable UUID idPhieuKiemKe, HttpServletRequest request) {
        var actor = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(phieuKiemKeService.getLinesByPhieu(idPhieuKiemKe, actor));
    }

    @GetMapping("/by-san-pham/{idSanPham}")
    public ResponseEntity<List<ChiTietKiemKe>> getBySanPham(@PathVariable UUID idSanPham, HttpServletRequest request) {
        var actor = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(phieuKiemKeService.getLinesBySanPham(idSanPham, actor));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> create(@RequestBody ChiTietKiemKe request, HttpServletRequest httpRequest) {
        var actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return ResponseEntity.ok(phieuKiemKeService.createLine(request, actor));
    }

    @PostMapping("/batch")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> createBatch(@RequestBody List<ChiTietKiemKe> requests, HttpServletRequest httpRequest) {
        var actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return ResponseEntity.ok(phieuKiemKeService.createBatchLines(requests, actor));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> delete(@PathVariable UUID id, HttpServletRequest request) {
        var actor = branchAccessService.requireAuthenticatedEmployee(request);
        if (phieuKiemKeService.deleteLine(id, actor)) {
            return ResponseEntity.ok(ApiResponse.ok("Xóa chi tiết thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/by-phieu/{idPhieuKiemKe}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> deleteByPhieuKiemKe(@PathVariable UUID idPhieuKiemKe, HttpServletRequest request) {
        var actor = branchAccessService.requireAuthenticatedEmployee(request);
        phieuKiemKeService.deleteLinesByPhieu(idPhieuKiemKe, actor);
        return ResponseEntity.ok(ApiResponse.ok("Xóa tất cả chi tiết kiểm kê"));
    }
}
