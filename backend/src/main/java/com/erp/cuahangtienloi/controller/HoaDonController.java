package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.HoaDonDTO;
import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.entity.HoaDon;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import com.erp.cuahangtienloi.service.HoaDonService;
import com.erp.cuahangtienloi.service.HoaDonService.CheckoutRequest;
import com.erp.cuahangtienloi.service.HoaDonService.CreateSaleRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/hoa-don")
@RequiredArgsConstructor
public class HoaDonController {

    private final HoaDonService hoaDonService;
    private final NhanVienRepository nhanVienRepository;

    private UUID resolveAuthenticatedIdNhanVien(HttpServletRequest request) {
        Object attr = request.getAttribute("authenticatedIdNhanVien");
        if (attr instanceof String value) {
            try {
                return UUID.fromString(value);
            } catch (IllegalArgumentException ignored) {}
        }
        return null;
    }

    private NhanVien requireAuthenticatedEmployee(HttpServletRequest request) {
        UUID employeeId = resolveAuthenticatedIdNhanVien(request);
        if (employeeId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tài khoản chưa liên kết nhân viên");
        }
        return nhanVienRepository.findById(employeeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Nhân viên đăng nhập không tồn tại"));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY', 'THU_NGAN')")
    public ResponseEntity<List<HoaDonDTO>> getAll(HttpServletRequest request) {
        return ResponseEntity.ok(hoaDonService.getAll(requireAuthenticatedEmployee(request)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY', 'THU_NGAN')")
    public ResponseEntity<?> getById(@PathVariable UUID id, HttpServletRequest request) {
        return hoaDonService.getById(id, requireAuthenticatedEmployee(request))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-branch/{idChiNhanh}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY', 'THU_NGAN')")
    public ResponseEntity<List<HoaDonDTO>> getByChiNhanh(@PathVariable UUID idChiNhanh, HttpServletRequest request) {
        return ResponseEntity.ok(hoaDonService.getByChiNhanh(idChiNhanh, requireAuthenticatedEmployee(request)));
    }

    @GetMapping("/by-cashier/{idThuNgan}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY', 'THU_NGAN')")
    public ResponseEntity<List<HoaDonDTO>> getByThuNgan(@PathVariable UUID idThuNgan, HttpServletRequest request) {
        return ResponseEntity.ok(hoaDonService.getByThuNgan(idThuNgan, requireAuthenticatedEmployee(request)));
    }

    @GetMapping("/by-status/{trangThai}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY', 'THU_NGAN')")
    public ResponseEntity<List<HoaDonDTO>> getByStatus(@PathVariable String trangThai, HttpServletRequest request) {
        return ResponseEntity.ok(hoaDonService.getByStatus(trangThai, requireAuthenticatedEmployee(request)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY', 'THU_NGAN')")
    public ResponseEntity<?> create(@RequestBody HoaDon request) {
        return ResponseEntity.ok(hoaDonService.create(request));
    }

    @PostMapping("/with-lines")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY', 'THU_NGAN')")
    public ResponseEntity<?> createWithLines(@Valid @RequestBody CreateSaleRequest request, HttpServletRequest httpRequest) {
        UUID authenticatedCashierId = resolveAuthenticatedIdNhanVien(httpRequest);
        return ResponseEntity.ok(hoaDonService.createWithLines(request, authenticatedCashierId));
    }

    @PostMapping("/checkout")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY', 'THU_NGAN')")
    public ResponseEntity<?> checkout(@Valid @RequestBody CheckoutRequest request, HttpServletRequest httpRequest) {
        UUID cashierId = resolveAuthenticatedIdNhanVien(httpRequest);
        if (cashierId == null) {
            return ResponseEntity.status(401).body(ApiResponse.err("Không xác định được nhân viên đăng nhập"));
        }
        NhanVien cashier = nhanVienRepository.findById(cashierId).orElseThrow();
        HoaDonDTO created = hoaDonService.checkout(request, cashierId, cashier);
        return ResponseEntity.status(201).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody HoaDon request) {
        return hoaDonService.update(id, request)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (hoaDonService.delete(id)) {
            return ResponseEntity.ok(ApiResponse.ok("Xóa hóa đơn thành công"));
        }
        return ResponseEntity.notFound().build();
    }
}
