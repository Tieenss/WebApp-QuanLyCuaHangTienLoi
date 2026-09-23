package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.PhieuNhapDTO;
import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.entity.PhieuNhap;
import com.erp.cuahangtienloi.service.BranchAccessService;
import com.erp.cuahangtienloi.service.PhieuNhapService;
import com.erp.cuahangtienloi.service.PhieuNhapService.CreatePurchaseRequest;
import com.erp.cuahangtienloi.service.PhieuNhapService.PayRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/phieu-nhap")
@RequiredArgsConstructor
public class PhieuNhapController {

    private final PhieuNhapService phieuNhapService;
    private final BranchAccessService branchAccessService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'THU_KHO')")
    public ResponseEntity<List<PhieuNhapDTO>> getAll(HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(phieuNhapService.getAll(actor));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'THU_KHO')")
    public ResponseEntity<?> getById(@PathVariable UUID id, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        return phieuNhapService.getById(id, actor)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-branch/{idChiNhanh}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'THU_KHO')")
    public ResponseEntity<List<PhieuNhapDTO>> getByChiNhanh(@PathVariable UUID idChiNhanh, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(phieuNhapService.getByChiNhanh(idChiNhanh, actor));
    }

    @GetMapping("/by-ncc/{idNcc}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'THU_KHO')")
    public ResponseEntity<List<PhieuNhapDTO>> getByNcc(@PathVariable UUID idNcc, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(phieuNhapService.getByNcc(idNcc, actor));
    }

    @GetMapping("/by-status/{trangThai}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'THU_KHO')")
    public ResponseEntity<List<PhieuNhapDTO>> getByStatus(@PathVariable String trangThai, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(phieuNhapService.getByStatus(trangThai, actor));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO')")
    @Deprecated
    public ResponseEntity<?> create(@RequestBody PhieuNhap request, HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.GONE).body(
                ApiResponse.err("Endpoint cũ đã ngừng sử dụng. Hãy dùng POST /api/phieu-nhap/with-lines."));
    }

    @PostMapping("/with-lines")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO')")
    public ResponseEntity<?> createWithLines(@Valid @RequestBody CreatePurchaseRequest request, HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return ResponseEntity.ok(phieuNhapService.createWithLines(request, actor));
    }

    @PutMapping("/{id}/pay")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<?> pay(@PathVariable UUID id,
                                 @RequestBody(required = false) PayRequest request,
                                 HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return phieuNhapService.pay(id, request, actor)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO')")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody PhieuNhap request, HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return phieuNhapService.update(id, request, actor)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO')")
    public ResponseEntity<?> delete(@PathVariable UUID id, HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        if (phieuNhapService.delete(id, actor)) {
            return ResponseEntity.ok(ApiResponse.ok("Xóa phiếu nhập thành công"));
        }
        return ResponseEntity.notFound().build();
    }
}
