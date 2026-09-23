package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.service.BranchAccessService;
import com.erp.cuahangtienloi.service.NhanVienService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/nhan-vien")
public class NhanVienController {

    private final NhanVienService nhanVienService;
    private final BranchAccessService branchAccessService;

    @Autowired
    public NhanVienController(NhanVienService nhanVienService, BranchAccessService branchAccessService) {
        this.nhanVienService = nhanVienService;
        this.branchAccessService = branchAccessService;
    }

    public NhanVienController(
            com.erp.cuahangtienloi.repository.NhanVienRepository nhanVienRepository,
            com.erp.cuahangtienloi.repository.ChiNhanhRepository chiNhanhRepository,
            com.erp.cuahangtienloi.repository.TaiKhoanRepository taiKhoanRepository,
            BranchAccessService branchAccessService
    ) {
        this(new NhanVienService(nhanVienRepository, chiNhanhRepository, taiKhoanRepository, branchAccessService), branchAccessService);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<List<NhanVien>> getAll(HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(nhanVienService.getAll(actor));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<?> getById(@PathVariable UUID id, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        return nhanVienService.getById(id, actor)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-chi-nhanh/{idChiNhanh}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<List<NhanVien>> getByChiNhanh(@PathVariable UUID idChiNhanh, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(nhanVienService.getByChiNhanh(idChiNhanh, actor));
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<List<NhanVien>> getActive(HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(nhanVienService.getActive(actor));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<?> create(@RequestBody NhanVien request, HttpServletRequest httpRequest) {
        try {
            NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
            NhanVien created = nhanVienService.create(request, actor);
            return ResponseEntity.ok(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.err(e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody NhanVien request, HttpServletRequest httpRequest) {
        try {
            NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
            return nhanVienService.update(id, request, actor)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.err(e.getMessage()));
        }
    }

    // Overload for testing without HttpServletRequest
    public ResponseEntity<?> update(UUID id, NhanVien request) {
        try {
            return nhanVienService.update(id, request)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.err(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<?> delete(@PathVariable UUID id, HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        nhanVienService.delete(id, actor);
        return ResponseEntity.ok(ApiResponse.ok("Xóa nhân viên thành công"));
    }
}
