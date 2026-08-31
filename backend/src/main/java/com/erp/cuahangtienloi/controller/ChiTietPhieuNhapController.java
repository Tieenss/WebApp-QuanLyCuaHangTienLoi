package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.entity.ChiTietPhieuNhap;
import com.erp.cuahangtienloi.repository.ChiTietPhieuNhapRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chi-tiet-phieu-nhap")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ChiTietPhieuNhapController {

    private final ChiTietPhieuNhapRepository chiTietPhieuNhapRepository;

    @GetMapping("/by-phieu/{idPhieuNhap}")
    public ResponseEntity<List<ChiTietPhieuNhap>> getByPhieuNhap(@PathVariable UUID idPhieuNhap) {
        return ResponseEntity.ok(chiTietPhieuNhapRepository.findByIdPhieuNhap(idPhieuNhap));
    }

    @GetMapping("/by-san-pham/{idSanPham}")
    public ResponseEntity<List<ChiTietPhieuNhap>> getBySanPham(@PathVariable UUID idSanPham) {
        return ResponseEntity.ok(chiTietPhieuNhapRepository.findByIdSanPham(idSanPham));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody ChiTietPhieuNhap request) {
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
    public ResponseEntity<?> createBatch(@RequestBody List<ChiTietPhieuNhap> requests) {
        for (ChiTietPhieuNhap request : requests) {
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
        return ResponseEntity.ok(new SuccessResponse("Tạo chi tiết phiếu nhập thành công"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (chiTietPhieuNhapRepository.existsById(id)) {
            chiTietPhieuNhapRepository.deleteById(id);
            return ResponseEntity.ok(new SuccessResponse("Xóa chi tiết thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/by-phieu/{idPhieuNhap}")
    public ResponseEntity<?> deleteByPhieuNhap(@PathVariable UUID idPhieuNhap) {
        List<ChiTietPhieuNhap> list = chiTietPhieuNhapRepository.findByIdPhieuNhap(idPhieuNhap);
        chiTietPhieuNhapRepository.deleteAll(list);
        return ResponseEntity.ok(new SuccessResponse("Xóa tất cả chi tiết phiếu nhập"));
    }

    record SuccessResponse(String message) {}
}
