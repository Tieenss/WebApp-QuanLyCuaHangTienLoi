package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.entity.ChiTietHoaDon;
import com.erp.cuahangtienloi.repository.ChiTietHoaDonRepository;
import com.erp.cuahangtienloi.repository.SanPhamRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chi-tiet-hoa-don")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ChiTietHoaDonController {

    private final ChiTietHoaDonRepository chiTietHoaDonRepository;
    private final SanPhamRepository sanPhamRepository;

    @GetMapping("/by-hoa-don/{idHoaDon}")
    public ResponseEntity<List<ChiTietHoaDon>> getByHoaDon(@PathVariable UUID idHoaDon) {
        return ResponseEntity.ok(chiTietHoaDonRepository.findByIdHoaDon(idHoaDon));
    }

    @GetMapping("/by-san-pham/{idSanPham}")
    public ResponseEntity<List<ChiTietHoaDon>> getBySanPham(@PathVariable UUID idSanPham) {
        return ResponseEntity.ok(chiTietHoaDonRepository.findByIdSanPham(idSanPham));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody ChiTietHoaDon request) {
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
    public ResponseEntity<?> createBatch(@RequestBody List<ChiTietHoaDon> requests) {
        for (ChiTietHoaDon request : requests) {
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
        return ResponseEntity.ok(new SuccessResponse("Tạo chi tiết thành công"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (chiTietHoaDonRepository.existsById(id)) {
            chiTietHoaDonRepository.deleteById(id);
            return ResponseEntity.ok(new SuccessResponse("Xóa chi tiết thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/by-hoa-don/{idHoaDon}")
    public ResponseEntity<?> deleteByHoaDon(@PathVariable UUID idHoaDon) {
        List<ChiTietHoaDon> list = chiTietHoaDonRepository.findByIdHoaDon(idHoaDon);
        chiTietHoaDonRepository.deleteAll(list);
        return ResponseEntity.ok(new SuccessResponse("Xóa tất cả chi tiết của hóa đơn"));
    }

    record SuccessResponse(String message) {}
}
