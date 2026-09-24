package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.entity.ChiTietPhieuNhap;
import com.erp.cuahangtienloi.service.BranchAccessService;
import com.erp.cuahangtienloi.service.PhieuNhapService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chi-tiet-phieu-nhap")
@RequiredArgsConstructor
public class ChiTietPhieuNhapController {

    private final PhieuNhapService phieuNhapService;
    private final BranchAccessService branchAccessService;

    @GetMapping("/by-phieu/{idPhieuNhap}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'KE_TOAN')")
    public ResponseEntity<List<ChiTietPhieuNhap>> getByPhieuNhap(@PathVariable UUID idPhieuNhap, HttpServletRequest request) {
        var actor = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(phieuNhapService.getLinesByPhieuNhap(idPhieuNhap, actor));
    }

    @GetMapping("/by-san-pham/{idSanPham}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'KE_TOAN')")
    public ResponseEntity<List<ChiTietPhieuNhap>> getBySanPham(@PathVariable UUID idSanPham, HttpServletRequest request) {
        var actor = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(phieuNhapService.getLinesBySanPham(idSanPham, actor));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO')")
    public ResponseEntity<?> create(@RequestBody ChiTietPhieuNhap request, HttpServletRequest httpRequest) {
        var actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return ResponseEntity.ok(phieuNhapService.createLine(request, actor));
    }

    @PostMapping("/batch")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO')")
    public ResponseEntity<?> createBatch(@RequestBody List<ChiTietPhieuNhap> requests, HttpServletRequest httpRequest) {
        var actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        phieuNhapService.createBatchLines(requests, actor);
        return ResponseEntity.ok(ApiResponse.ok("Tạo chi tiết phiếu nhập thành công"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO')")
    public ResponseEntity<?> delete(@PathVariable UUID id, HttpServletRequest request) {
        var actor = branchAccessService.requireAuthenticatedEmployee(request);
        if (phieuNhapService.deleteLine(id, actor)) {
            return ResponseEntity.ok(ApiResponse.ok("Xóa chi tiết thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/by-phieu/{idPhieuNhap}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO')")
    public ResponseEntity<?> deleteByPhieuNhap(@PathVariable UUID idPhieuNhap, HttpServletRequest request) {
        var actor = branchAccessService.requireAuthenticatedEmployee(request);
        phieuNhapService.deleteLinesByPhieuNhap(idPhieuNhap, actor);
        return ResponseEntity.ok(ApiResponse.ok("Xóa tất cả chi tiết phiếu nhập"));
    }
}
