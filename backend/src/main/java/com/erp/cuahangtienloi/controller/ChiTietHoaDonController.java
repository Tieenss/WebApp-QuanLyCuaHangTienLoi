package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.entity.ChiTietHoaDon;
import com.erp.cuahangtienloi.entity.HoaDon;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.repository.ChiTietHoaDonRepository;
import com.erp.cuahangtienloi.repository.HoaDonRepository;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import com.erp.cuahangtienloi.repository.SanPhamRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chi-tiet-hoa-don")
@RequiredArgsConstructor
//@CrossOrigin(origins = "*")
public class ChiTietHoaDonController {

    private final ChiTietHoaDonRepository chiTietHoaDonRepository;
    private final SanPhamRepository sanPhamRepository;
    private final HoaDonRepository hoaDonRepository;
    private final NhanVienRepository nhanVienRepository;

    @GetMapping("/by-hoa-don/{idHoaDon}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY', 'THU_NGAN')")
    public ResponseEntity<List<ChiTietHoaDon>> getByHoaDon(@PathVariable UUID idHoaDon,
                                                            HttpServletRequest request) {
        HoaDon invoice = hoaDonRepository.findById(idHoaDon).orElse(null);
        if (invoice == null || !canReadInvoice(requireAuthenticatedEmployee(request), invoice)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(chiTietHoaDonRepository.findByIdHoaDon(idHoaDon));
    }

    @GetMapping("/by-san-pham/{idSanPham}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    public ResponseEntity<List<ChiTietHoaDon>> getBySanPham(@PathVariable UUID idSanPham) {
        return ResponseEntity.ok(chiTietHoaDonRepository.findByIdSanPham(idSanPham));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<?> create(@RequestBody ChiTietHoaDon request) {
        validate(request);
        ChiTietHoaDon ct = new ChiTietHoaDon();
        ct.setId(UUID.randomUUID());
        ct.setIdHoaDon(request.getIdHoaDon());
        ct.setIdSanPham(request.getIdSanPham());
        ct.setSoLuong(request.getSoLuong());
        ct.setDonGia(request.getDonGia());
        ct.setGiamGiaDong(request.getGiamGiaDong() != null ? request.getGiamGiaDong() : BigDecimal.ZERO);
        ct.setVatPhantram(request.getVatPhantram() != null ? request.getVatPhantram() : 8);
        ct.setThanhTien(request.getThanhTien());
        ct.setDonGiaVon(request.getDonGiaVon());
        ct.setThuTu(request.getThuTu() != null ? request.getThuTu() : 0);
        ct.setNgayTao(LocalDateTime.now());

        chiTietHoaDonRepository.save(ct);
        return ResponseEntity.ok(ct);
    }

    @PostMapping("/batch")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<?> createBatch(@RequestBody List<ChiTietHoaDon> requests) {
        if (requests == null || requests.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Danh sách chi tiết hóa đơn rỗng"));
        }
        for (ChiTietHoaDon request : requests) {
            validate(request);
            ChiTietHoaDon ct = new ChiTietHoaDon();
            ct.setId(UUID.randomUUID());
            ct.setIdHoaDon(request.getIdHoaDon());
            ct.setIdSanPham(request.getIdSanPham());
            ct.setSoLuong(request.getSoLuong());
            ct.setDonGia(request.getDonGia());
            ct.setGiamGiaDong(request.getGiamGiaDong() != null ? request.getGiamGiaDong() : BigDecimal.ZERO);
            ct.setVatPhantram(request.getVatPhantram() != null ? request.getVatPhantram() : 8);
            ct.setThanhTien(request.getThanhTien());
            ct.setDonGiaVon(request.getDonGiaVon());
            ct.setThuTu(request.getThuTu() != null ? request.getThuTu() : 0);
            ct.setNgayTao(LocalDateTime.now());
            chiTietHoaDonRepository.save(ct);
        }
        return ResponseEntity.ok( ApiResponse.ok("Tạo chi tiết thành công"));
    }

    private void validate(ChiTietHoaDon request) {
        if (request.getIdHoaDon() == null || !hoaDonRepository.existsById(request.getIdHoaDon())) {
            throw new IllegalArgumentException("Hóa đơn không tồn tại");
        }
        if (request.getIdSanPham() == null || !sanPhamRepository.existsById(request.getIdSanPham())) {
            throw new IllegalArgumentException("Sản phẩm không tồn tại");
        }
        com.erp.cuahangtienloi.validation.InputValidator.positive(request.getSoLuong(), "Số lượng");
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getDonGia(), "Đơn giá");
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getGiamGiaDong(), "Giảm giá dòng");
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getThanhTien(), "Thành tiền");
        if (request.getVatPhantram() != null && (request.getVatPhantram() < 0 || request.getVatPhantram() > 100)) {
            throw new IllegalArgumentException("VAT phải từ 0 đến 100");
        }
    }

    private NhanVien requireAuthenticatedEmployee(HttpServletRequest request) {
        Object attr = request.getAttribute("authenticatedIdNhanVien");
        if (attr instanceof String value) {
            try {
                return nhanVienRepository.findById(UUID.fromString(value))
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                                "Nhân viên đăng nhập không tồn tại"));
            } catch (IllegalArgumentException ignored) {
                // Trả 401 bên dưới nếu attribute không phải UUID hợp lệ.
            }
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                "Tài khoản chưa liên kết nhân viên");
    }

    private boolean canReadInvoice(NhanVien actor, HoaDon invoice) {
        return switch (actor.getVaiTro()) {
            case "ADMIN", "KE_TOAN" -> true;
            case "QUAN_LY" -> actor.getIdChiNhanh() != null
                    && actor.getIdChiNhanh().equals(invoice.getIdChiNhanh());
            case "THU_NGAN" -> actor.getId().equals(invoice.getIdThuNgan());
            default -> false;
        };
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (chiTietHoaDonRepository.existsById(id)) {
            chiTietHoaDonRepository.deleteById(id);
            return ResponseEntity.ok( ApiResponse.ok("Xóa chi tiết thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/by-hoa-don/{idHoaDon}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<?> deleteByHoaDon(@PathVariable UUID idHoaDon) {
        List<ChiTietHoaDon> list = chiTietHoaDonRepository.findByIdHoaDon(idHoaDon);
        chiTietHoaDonRepository.deleteAll(list);
        return ResponseEntity.ok( ApiResponse.ok("Xóa tất cả chi tiết của hóa đơn"));
    }

//    record SuccessResponse(String message) {}
}
