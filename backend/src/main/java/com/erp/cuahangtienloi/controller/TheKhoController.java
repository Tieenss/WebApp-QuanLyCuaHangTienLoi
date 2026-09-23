package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.dto.TheKhoDTO;
import com.erp.cuahangtienloi.entity.TheKho;
import com.erp.cuahangtienloi.service.BranchAccessService;
import com.erp.cuahangtienloi.service.TheKhoService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/the-kho")
@RequiredArgsConstructor
public class TheKhoController {

    private final TheKhoService theKhoService;
    private final BranchAccessService branchAccessService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<List<TheKhoDTO>> getAll(HttpServletRequest request) {
        var employee = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(theKhoService.getAll(employee));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> getById(@PathVariable UUID id, HttpServletRequest request) {
        var employee = branchAccessService.requireAuthenticatedEmployee(request);
        return theKhoService.getById(id, employee)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-product/{idSanPham}/branch/{idChiNhanh}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<List<TheKhoDTO>> getByProductAndBranch(
            @PathVariable UUID idSanPham, @PathVariable UUID idChiNhanh, HttpServletRequest request) {
        var employee = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(theKhoService.getByProductAndBranch(idSanPham, idChiNhanh, employee));
    }

    @GetMapping("/by-branch/{idChiNhanh}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<List<TheKhoDTO>> getByBranch(@PathVariable UUID idChiNhanh, HttpServletRequest request) {
        var employee = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(theKhoService.getByBranch(idChiNhanh, employee));
    }

    @GetMapping("/by-type/{loaiGiaoDich}/branch/{idChiNhanh}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<List<TheKhoDTO>> getByTypeAndBranch(
            @PathVariable String loaiGiaoDich, @PathVariable UUID idChiNhanh, HttpServletRequest request) {
        var employee = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(theKhoService.getByTypeAndBranch(loaiGiaoDich, idChiNhanh, employee));
    }

    @GetMapping("/by-branch/{idChiNhanh}/from/{from}/to/{to}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<List<TheKhoDTO>> getByBranchAndDateRange(
            @PathVariable UUID idChiNhanh,
            @PathVariable LocalDateTime from,
            @PathVariable LocalDateTime to,
            HttpServletRequest request) {
        var employee = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(theKhoService.getByBranchAndDateRange(idChiNhanh, from, to, employee));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> create(@RequestBody TheKho request) {
        return ResponseEntity.badRequest().body(ApiResponse.err(
                "Không được tạo trực tiếp thẻ kho. Hãy thực hiện qua giao dịch nhập kho, bán hàng hoặc kiểm kê."));
    }
}
