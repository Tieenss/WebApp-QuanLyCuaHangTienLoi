package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.PhieuXuatKhoDTO;
import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.entity.PhieuXuatKho;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import com.erp.cuahangtienloi.service.BranchAccessService;
import com.erp.cuahangtienloi.service.PhieuXuatKhoService;
import com.erp.cuahangtienloi.service.PhieuXuatKhoService.ApproveRequest;
import com.erp.cuahangtienloi.service.PhieuXuatKhoService.MoveRequest;
import com.erp.cuahangtienloi.service.PhieuXuatKhoService.RejectRequest;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/phieu-xuat-kho")
@RequiredArgsConstructor
public class PhieuXuatKhoController {

    private final PhieuXuatKhoService phieuXuatKhoService;
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
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<List<PhieuXuatKhoDTO>> getAll(HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(phieuXuatKhoService.getAll(actor));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> getById(@PathVariable UUID id, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        return phieuXuatKhoService.getById(id, actor)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-branch-xuat/{idChiNhanhXuat}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<List<PhieuXuatKhoDTO>> getByBranchXuat(@PathVariable UUID idChiNhanhXuat, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(phieuXuatKhoService.getByBranchXuat(idChiNhanhXuat, actor));
    }

    @GetMapping("/by-branch-nhan/{idChiNhanhNhan}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<List<PhieuXuatKhoDTO>> getByBranchNhan(@PathVariable UUID idChiNhanhNhan, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(phieuXuatKhoService.getByBranchNhan(idChiNhanhNhan, actor));
    }

    @GetMapping("/by-status/{trangThai}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<List<PhieuXuatKhoDTO>> getByStatus(@PathVariable String trangThai, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(phieuXuatKhoService.getByStatus(trangThai, actor));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> create(@RequestBody PhieuXuatKho request, HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        UUID idNguoiTao = resolveAuthenticatedIdNhanVien(httpRequest);
        return ResponseEntity.ok(phieuXuatKhoService.create(request, idNguoiTao, actor));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO')")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody PhieuXuatKho request, HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return phieuXuatKhoService.update(id, request, actor)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO')")
    public ResponseEntity<?> delete(@PathVariable UUID id, HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        if (phieuXuatKhoService.delete(id, actor)) {
            return ResponseEntity.ok(ApiResponse.ok("Xóa phiếu xuất kho thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO')")
    public ResponseEntity<?> approve(@PathVariable UUID id, @RequestBody(required = false) ApproveRequest body, HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return phieuXuatKhoService.approve(id, body, actor)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO')")
    public ResponseEntity<?> reject(@PathVariable UUID id, @RequestBody(required = false) RejectRequest body, HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        return phieuXuatKhoService.reject(id, body, actor)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/ship")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO')")
    public ResponseEntity<?> ship(@PathVariable UUID id, @RequestBody(required = false) MoveRequest body, HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        UUID idNguoiDuyet = resolveAuthenticatedIdNhanVien(httpRequest);
        return phieuXuatKhoService.ship(id, body, idNguoiDuyet, actor)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/receive")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<?> receive(@PathVariable UUID id, @RequestBody(required = false) MoveRequest body, HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        UUID idNguoiNhan = resolveAuthenticatedIdNhanVien(httpRequest);
        return phieuXuatKhoService.receive(id, body, idNguoiNhan, actor)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
