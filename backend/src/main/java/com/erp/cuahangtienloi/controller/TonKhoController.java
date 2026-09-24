package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.dto.TonKhoDTO;
import com.erp.cuahangtienloi.entity.TonKho;
import com.erp.cuahangtienloi.service.BranchAccessService;
import com.erp.cuahangtienloi.service.TonKhoService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/ton-kho")
@RequiredArgsConstructor
public class TonKhoController {

    private final TonKhoService tonKhoService;
    private final BranchAccessService branchAccessService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<List<TonKhoDTO>> getAll(HttpServletRequest request) {
        var employee = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(tonKhoService.getAll(employee));
    }

    @GetMapping("/by-branch/{idChiNhanh}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY', 'THU_NGAN')")
    public ResponseEntity<List<TonKhoDTO>> getByChiNhanh(@PathVariable UUID idChiNhanh, HttpServletRequest request) {
        var employee = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(tonKhoService.getByChiNhanh(idChiNhanh, employee));
    }

    @GetMapping("/by-product/{idSanPham}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<List<TonKhoDTO>> getBySanPham(@PathVariable UUID idSanPham, HttpServletRequest request) {
        var employee = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(tonKhoService.getBySanPham(idSanPham, employee));
    }

    @GetMapping("/available-for-transfer")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<List<TonKhoDTO>> getAvailableForTransfer() {
        return ResponseEntity.ok(tonKhoService.getAvailableForTransfer());
    }

    @GetMapping("/detail/{idSanPham}/{idChiNhanh}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> getDetail(@PathVariable UUID idSanPham, @PathVariable UUID idChiNhanh, HttpServletRequest request) {
        var employee = branchAccessService.requireAuthenticatedEmployee(request);
        return tonKhoService.getDetail(idSanPham, idChiNhanh, employee)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> create(@RequestBody TonKho request) {
        return ResponseEntity.ok(tonKhoService.create(request));
    }

    @PutMapping("/{idSanPham}/{idChiNhanh}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> update(@PathVariable UUID idSanPham, @PathVariable UUID idChiNhanh, @RequestBody TonKho request) {
        return tonKhoService.update(idSanPham, idChiNhanh, request)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/adjust")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> adjust(@RequestBody TonKhoService.TonKhoAdjustmentRequest request, HttpServletRequest httpRequest) {
        var employee = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return tonKhoService.adjust(request, employee)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{idSanPham}/{idChiNhanh}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> delete(@PathVariable UUID idSanPham, @PathVariable UUID idChiNhanh) {
        tonKhoService.delete(idSanPham, idChiNhanh);
        return ResponseEntity.ok(ApiResponse.ok("Xóa tồn kho thành công"));
    }
}
