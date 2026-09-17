package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.entity.ChiTietPhieuNhap;
import com.erp.cuahangtienloi.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chi-tiet-phieu-nhap")
@RequiredArgsConstructor
//@CrossOrigin(origins = "*")
public class ChiTietPhieuNhapController {

    private final ChiTietPhieuNhapRepository chiTietPhieuNhapRepository;
    private final PhieuNhapRepository phieuNhapRepository;
    private final SanPhamRepository sanPhamRepository;

    @GetMapping("/by-phieu/{idPhieuNhap}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'KE_TOAN')")
    public ResponseEntity<List<ChiTietPhieuNhap>> getByPhieuNhap(@PathVariable UUID idPhieuNhap) {
        return ResponseEntity.ok(chiTietPhieuNhapRepository.findByIdPhieuNhap(idPhieuNhap));
    }

    @GetMapping("/by-san-pham/{idSanPham}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'KE_TOAN')")
    public ResponseEntity<List<ChiTietPhieuNhap>> getBySanPham(@PathVariable UUID idSanPham) {
        return ResponseEntity.ok(chiTietPhieuNhapRepository.findByIdSanPham(idSanPham));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO')")
    public ResponseEntity<?> create(@RequestBody ChiTietPhieuNhap request) {
        validate(request);
        ChiTietPhieuNhap ct = new ChiTietPhieuNhap();
        ct.setId(UUID.randomUUID());
        ct.setIdPhieuNhap(request.getIdPhieuNhap());
        ct.setIdSanPham(request.getIdSanPham());
        ct.setSoLuongDat(request.getSoLuongDat());
        ct.setSoLuongNhan(request.getSoLuongNhan() != null ? request.getSoLuongNhan() : 0);
        ct.setDonGiaNhap(request.getDonGiaNhap());
        ct.setVatPhantram(request.getVatPhantram() != null ? request.getVatPhantram() : 8);
        ct.setThanhTien(request.getThanhTien());
        ct.setHanSuDung(request.getHanSuDung());
        ct.setThuTu(request.getThuTu() != null ? request.getThuTu() : 0);
        ct.setNgayTao(LocalDateTime.now());

        chiTietPhieuNhapRepository.save(ct);
        return ResponseEntity.ok(ct);
    }

    @PostMapping("/batch")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO')")
    public ResponseEntity<?> createBatch(@RequestBody List<ChiTietPhieuNhap> requests) {
        if (requests == null || requests.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Danh sách chi tiết phiếu nhập rỗng"));
        }
        for (ChiTietPhieuNhap request : requests) {
            validate(request);
            ChiTietPhieuNhap ct = new ChiTietPhieuNhap();
            ct.setId(UUID.randomUUID());
            ct.setIdPhieuNhap(request.getIdPhieuNhap());
            ct.setIdSanPham(request.getIdSanPham());
            ct.setSoLuongDat(request.getSoLuongDat());
            ct.setSoLuongNhan(request.getSoLuongNhan() != null ? request.getSoLuongNhan() : 0);
            ct.setDonGiaNhap(request.getDonGiaNhap());
            ct.setVatPhantram(request.getVatPhantram() != null ? request.getVatPhantram() : 8);
            ct.setThanhTien(request.getThanhTien());
            ct.setHanSuDung(request.getHanSuDung());
            ct.setThuTu(request.getThuTu() != null ? request.getThuTu() : 0);
            ct.setNgayTao(LocalDateTime.now());
            chiTietPhieuNhapRepository.save(ct);
        }
        return ResponseEntity.ok( ApiResponse.ok("Tạo chi tiết phiếu nhập thành công"));
    }

    private void validate(ChiTietPhieuNhap request) {
        if (request.getIdPhieuNhap() == null || !phieuNhapRepository.existsById(request.getIdPhieuNhap())) {
            throw new IllegalArgumentException("Phiếu nhập không tồn tại");
        }
        if (request.getIdSanPham() == null || !sanPhamRepository.existsById(request.getIdSanPham())) {
            throw new IllegalArgumentException("Sản phẩm không tồn tại");
        }
        com.erp.cuahangtienloi.validation.InputValidator.positive(request.getSoLuongDat(), "Số lượng đặt");
        if (request.getSoLuongNhan() != null) {
            com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getSoLuongNhan(), "Số lượng nhận");
            if (request.getSoLuongNhan() > request.getSoLuongDat()) {
                throw new IllegalArgumentException("Số lượng nhận không được vượt số lượng đặt");
            }
        }
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getDonGiaNhap(), "Đơn giá nhập");
        if (request.getVatPhantram() != null && (request.getVatPhantram() < 0 || request.getVatPhantram() > 100)) {
            throw new IllegalArgumentException("VAT phải từ 0 đến 100");
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO')")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (chiTietPhieuNhapRepository.existsById(id)) {
            chiTietPhieuNhapRepository.deleteById(id);
            return ResponseEntity.ok( ApiResponse.ok("Xóa chi tiết thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/by-phieu/{idPhieuNhap}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO')")
    public ResponseEntity<?> deleteByPhieuNhap(@PathVariable UUID idPhieuNhap) {
        List<ChiTietPhieuNhap> list = chiTietPhieuNhapRepository.findByIdPhieuNhap(idPhieuNhap);
        chiTietPhieuNhapRepository.deleteAll(list);
        return ResponseEntity.ok( ApiResponse.ok("Xóa tất cả chi tiết phiếu nhập"));
    }

//    record SuccessResponse(String message) {}
}
