package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.entity.ChiTietPhieuXuat;
import com.erp.cuahangtienloi.service.BranchAccessService;
import com.erp.cuahangtienloi.service.PhieuXuatKhoService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chi-tiet-phieu-xuat")
@RequiredArgsConstructor
public class ChiTietPhieuXuatController {

    private final PhieuXuatKhoService phieuXuatKhoService;
    private final BranchAccessService branchAccessService;

    @GetMapping("/by-phieu/{idPhieuXuat}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<List<ChiTietPhieuXuat>> getByPhieuXuat(@PathVariable UUID idPhieuXuat, HttpServletRequest request) {
        var actor = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(phieuXuatKhoService.getLinesByPhieuXuat(idPhieuXuat, actor));
    }

    @GetMapping("/by-san-pham/{idSanPham}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<List<ChiTietPhieuXuat>> getBySanPham(@PathVariable UUID idSanPham, HttpServletRequest request) {
        var actor = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(phieuXuatKhoService.getLinesBySanPham(idSanPham, actor));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> create(@RequestBody ChiTietPhieuXuat request, HttpServletRequest httpRequest) {
        var actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return ResponseEntity.ok(phieuXuatKhoService.createLine(request, actor));
    }

    @PostMapping("/batch")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> createBatch(@RequestBody List<ChiTietPhieuXuat> requests, HttpServletRequest httpRequest) {
        var actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        phieuXuatKhoService.createBatchLines(requests, actor);
        return ResponseEntity.ok(ApiResponse.ok("Tạo chi tiết phiếu xuất thành công"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO')")
    public ResponseEntity<?> delete(@PathVariable UUID id, HttpServletRequest request) {
        var actor = branchAccessService.requireAuthenticatedEmployee(request);
        if (phieuXuatKhoService.deleteLine(id, actor)) {
            return ResponseEntity.ok(ApiResponse.ok("Xóa chi tiết thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/by-phieu/{idPhieuXuat}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO')")
    public ResponseEntity<?> deleteByPhieuXuat(@PathVariable UUID idPhieuXuat, HttpServletRequest request) {
        var actor = branchAccessService.requireAuthenticatedEmployee(request);
        phieuXuatKhoService.deleteLinesByPhieuXuat(idPhieuXuat, actor);
        return ResponseEntity.ok(ApiResponse.ok("Xóa tất cả chi tiết phiếu xuất"));
    }
}
