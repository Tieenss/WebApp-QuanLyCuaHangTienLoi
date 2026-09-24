package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.PhieuNhapDTO;
import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.entity.PhieuNhap;
import com.erp.cuahangtienloi.service.BranchAccessService;
import com.erp.cuahangtienloi.service.PhieuNhapService;
import com.erp.cuahangtienloi.service.PhieuNhapService.CreatePurchaseRequest;
import com.erp.cuahangtienloi.service.PhieuNhapService.PayRequest;
import com.erp.cuahangtienloi.service.RequestDeduplicationService;
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
    private final RequestDeduplicationService requestDeduplicationService;

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

        String linesFingerprint = request.getLines() != null
                ? request.getLines().stream()
                        .filter(l -> l.getIdSanPham() != null)
                        .map(l -> l.getIdSanPham() + ":" + l.getSoLuong() + ":" + l.getDonGiaNhap())
                        .sorted()
                        .collect(java.util.stream.Collectors.joining(";"))
                : "";
        String dedupKey = "PURCHASE_ORDER:" + actor.getId() + ":" + request.getIdChiNhanh() + ":" + request.getIdNcc() + ":" + linesFingerprint;

        if (!requestDeduplicationService.tryAcquire(dedupKey, 6)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(ApiResponse.err("Yêu cầu tạo phiếu nhập đang được xử lý hoặc vừa được gửi. Vui lòng không thao tác liên tục."));
        }

        try {
            return ResponseEntity.ok(phieuNhapService.createWithLines(request, actor));
        } catch (IllegalArgumentException e) {
            requestDeduplicationService.release(dedupKey);
            return ResponseEntity.badRequest().body(ApiResponse.err(e.getMessage()));
        } catch (Exception e) {
            requestDeduplicationService.release(dedupKey);
            throw e;
        }
    }

    @PutMapping("/{id}/pay")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<?> pay(@PathVariable UUID id,
                                 @RequestBody(required = false) PayRequest request,
                                 HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        try {
            return phieuNhapService.pay(id, request, actor)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.err(e.getMessage()));
        }
    }

    @PutMapping("/{id}/receive")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO')")
    public ResponseEntity<?> receive(@PathVariable UUID id, HttpServletRequest httpRequest) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        try {
            return phieuNhapService.receive(id, actor)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.err(e.getMessage()));
        }
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
