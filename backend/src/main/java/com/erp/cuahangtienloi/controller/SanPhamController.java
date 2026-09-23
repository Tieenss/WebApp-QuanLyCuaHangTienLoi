package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.CreateSanPhamRequest;
import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.dto.SanPhamDTO;
import com.erp.cuahangtienloi.dto.UpdateSanPhamRequest;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.repository.DanhMucRepository;
import com.erp.cuahangtienloi.repository.NhaCungCapRepository;
import com.erp.cuahangtienloi.repository.SanPhamRepository;
import com.erp.cuahangtienloi.service.BranchAccessService;
import com.erp.cuahangtienloi.service.BranchProductStatusService;
import com.erp.cuahangtienloi.service.SanPhamService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/san-pham")
public class SanPhamController {

    private final SanPhamService sanPhamService;
    private final BranchAccessService branchAccessService;

    @Autowired
    public SanPhamController(SanPhamService sanPhamService, BranchAccessService branchAccessService) {
        this.sanPhamService = sanPhamService;
        this.branchAccessService = branchAccessService;
    }

    // Constructor phục vụ tương thích cho các unit test cũ
    public SanPhamController(
            SanPhamRepository sanPhamRepository,
            DanhMucRepository danhMucRepository,
            NhaCungCapRepository nhaCungCapRepository,
            BranchAccessService branchAccessService,
            BranchProductStatusService branchProductStatusService
    ) {
        this(new SanPhamService(sanPhamRepository, danhMucRepository, nhaCungCapRepository, branchProductStatusService), branchAccessService);
    }

    private boolean isAdmin() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    private UUID resolveBranchId(HttpServletRequest request) {
        if (request == null) return null;
        Object attr = request.getAttribute("authenticatedIdChiNhanh");
        if (attr instanceof String value && !value.isBlank()) {
            try {
                return UUID.fromString(value);
            } catch (IllegalArgumentException ignored) {}
        }
        try {
            NhanVien emp = branchAccessService.requireAuthenticatedEmployee(request);
            return emp != null ? emp.getIdChiNhanh() : null;
        } catch (Exception ignored) {
            return null;
        }
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<SanPhamDTO>> getAll(HttpServletRequest request) {
        return ResponseEntity.ok(sanPhamService.getAll(resolveBranchId(request), isAdmin()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getById(@PathVariable UUID id) {
        return sanPhamService.getById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-danh-muc/{idDanhMuc}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<SanPhamDTO>> getByDanhMuc(@PathVariable UUID idDanhMuc) {
        return ResponseEntity.ok(sanPhamService.getByDanhMuc(idDanhMuc));
    }

    @GetMapping("/by-ma-vach/{maVach}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getByMaVach(@PathVariable String maVach) {
        return sanPhamService.getByMaVach(maVach)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/active")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<SanPhamDTO>> getActive(HttpServletRequest request) {
        return ResponseEntity.ok(sanPhamService.getActive(resolveBranchId(request), isAdmin()));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> create(@Valid @RequestBody CreateSanPhamRequest request) {
        return ResponseEntity.ok(sanPhamService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> update(@PathVariable UUID id, @Valid @RequestBody UpdateSanPhamRequest request) {
        return sanPhamService.update(id, request)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<?> delete(@PathVariable UUID id,
                                    @RequestParam(value = "permanent", defaultValue = "false") boolean permanent,
                                    HttpServletRequest request) {
        String message = sanPhamService.delete(id, permanent, resolveBranchId(request), isAdmin());
        if (message == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ApiResponse.ok(message));
    }

    @PatchMapping("/{id}/restore")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<?> restore(@PathVariable UUID id, HttpServletRequest request) {
        String message = sanPhamService.restore(id, resolveBranchId(request), isAdmin());
        if (message == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ApiResponse.ok(message));
    }
}
