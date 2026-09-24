package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.entity.DanhMuc;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.service.BranchAccessService;
import com.erp.cuahangtienloi.service.DanhMucService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/danh-muc")
@RequiredArgsConstructor
public class DanhMucController {

    private final DanhMucService danhMucService;
    private final BranchAccessService branchAccessService;

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
    public ResponseEntity<List<DanhMuc>> getAll(HttpServletRequest request) {
        return ResponseEntity.ok(danhMucService.getAll(resolveBranchId(request), isAdmin()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY', 'THU_KHO', 'THU_NGAN', 'KE_TOAN')")
    public ResponseEntity<?> getById(@PathVariable UUID id, HttpServletRequest request) {
        return danhMucService.getById(id, resolveBranchId(request), isAdmin())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/active")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<DanhMuc>> getActive(HttpServletRequest request) {
        return ResponseEntity.ok(danhMucService.getActive(resolveBranchId(request), isAdmin()));
    }

    @GetMapping("/parent/{parentId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<DanhMuc>> getByParent(@PathVariable UUID parentId) {
        return ResponseEntity.ok(danhMucService.getByParent(parentId));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> create(@RequestBody DanhMuc request) {
        return ResponseEntity.ok(danhMucService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody DanhMuc request) {
        return danhMucService.update(id, request)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<?> delete(@PathVariable UUID id, HttpServletRequest request) {
        String message = danhMucService.delete(id, resolveBranchId(request), isAdmin());
        if (message == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ApiResponse.ok(message));
    }

    @PatchMapping("/{id}/restore")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<?> restore(@PathVariable UUID id, HttpServletRequest request) {
        String message = danhMucService.restore(id, resolveBranchId(request), isAdmin());
        if (message == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ApiResponse.ok(message));
    }

    @PatchMapping("/{id}/move-up")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> moveUp(@PathVariable UUID id) {
        return danhMucService.moveUp(id)
                .map(moved -> ResponseEntity.ok(ApiResponse.ok(moved ? "Di chuyển lên thành công" : "Danh mục đã ở vị trí đầu")))
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/move-down")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> moveDown(@PathVariable UUID id) {
        return danhMucService.moveDown(id)
                .map(moved -> ResponseEntity.ok(ApiResponse.ok(moved ? "Di chuyển xuống thành công" : "Danh mục đã ở vị trí cuối")))
                .orElse(ResponseEntity.notFound().build());
    }
}
