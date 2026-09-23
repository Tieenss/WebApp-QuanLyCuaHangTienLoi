package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.entity.ChiTietHoaDon;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import com.erp.cuahangtienloi.service.HoaDonService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chi-tiet-hoa-don")
@RequiredArgsConstructor
public class ChiTietHoaDonController {

    private final HoaDonService hoaDonService;
    private final NhanVienRepository nhanVienRepository;

    private NhanVien requireAuthenticatedEmployee(HttpServletRequest request) {
        Object attr = request.getAttribute("authenticatedIdNhanVien");
        if (attr instanceof String value) {
            try {
                return nhanVienRepository.findById(UUID.fromString(value))
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Nhân viên đăng nhập không tồn tại"));
            } catch (IllegalArgumentException ignored) {}
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tài khoản chưa liên kết nhân viên");
    }

    @GetMapping("/by-hoa-don/{idHoaDon}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY', 'THU_NGAN')")
    public ResponseEntity<List<ChiTietHoaDon>> getByHoaDon(@PathVariable UUID idHoaDon, HttpServletRequest request) {
        return hoaDonService.getLinesByHoaDon(idHoaDon, requireAuthenticatedEmployee(request))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-san-pham/{idSanPham}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<List<ChiTietHoaDon>> getBySanPham(@PathVariable UUID idSanPham) {
        return ResponseEntity.ok(hoaDonService.getLinesBySanPham(idSanPham));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<?> create(@RequestBody ChiTietHoaDon request) {
        return ResponseEntity.ok(hoaDonService.createLine(request));
    }

    @PostMapping("/batch")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<?> createBatch(@RequestBody List<ChiTietHoaDon> requests) {
        hoaDonService.createBatchLines(requests);
        return ResponseEntity.ok(ApiResponse.ok("Tạo chi tiết thành công"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (hoaDonService.deleteLine(id)) {
            return ResponseEntity.ok(ApiResponse.ok("Xóa chi tiết thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/by-hoa-don/{idHoaDon}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<?> deleteByHoaDon(@PathVariable UUID idHoaDon) {
        hoaDonService.deleteLinesByHoaDon(idHoaDon);
        return ResponseEntity.ok(ApiResponse.ok("Xóa tất cả chi tiết của hóa đơn"));
    }
}
