package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.entity.ChiTietPhieuXuat;
import com.erp.cuahangtienloi.repository.ChiTietPhieuXuatRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chi-tiet-phieu-xuat")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ChiTietPhieuXuatController {

    private final ChiTietPhieuXuatRepository chiTietPhieuXuatRepository;

    @GetMapping("/by-phieu/{idPhieuXuat}")
    public ResponseEntity<List<ChiTietPhieuXuat>> getByPhieuXuat(@PathVariable UUID idPhieuXuat) {
        return ResponseEntity.ok(chiTietPhieuXuatRepository.findByIdPhieuXuat(idPhieuXuat));
    }

    @GetMapping("/by-san-pham/{idSanPham}")
    public ResponseEntity<List<ChiTietPhieuXuat>> getBySanPham(@PathVariable UUID idSanPham) {
        return ResponseEntity.ok(chiTietPhieuXuatRepository.findByIdSanPham(idSanPham));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody ChiTietPhieuXuat request) {
        ChiTietPhieuXuat ct = new ChiTietPhieuXuat();
        ct.setId(UUID.randomUUID());
        ct.setIdPhieuXuat(request.getIdPhieuXuat());
        ct.setIdSanPham(request.getIdSanPham());
        ct.setSoLuongYeuCau(request.getSoLuongYeuCau());
        ct.setSoLuongXuat(request.getSoLuongXuat() != null ? request.getSoLuongXuat() : 0);
        ct.setSoLuongNhan(request.getSoLuongNhan() != null ? request.getSoLuongNhan() : 0);
        ct.setDonGiaVon(request.getDonGiaVon());
        ct.setThanhTien(request.getThanhTien());
        ct.setHanSuDung(request.getHanSuDung());
        ct.setThuTu(request.getThuTu() != null ? request.getThuTu() : 0);
        ct.setNgayTao(LocalDateTime.now());

        chiTietPhieuXuatRepository.save(ct);
        return ResponseEntity.ok(ct);
    }

    @PostMapping("/batch")
    public ResponseEntity<?> createBatch(@RequestBody List<ChiTietPhieuXuat> requests) {
        for (ChiTietPhieuXuat request : requests) {
            ChiTietPhieuXuat ct = new ChiTietPhieuXuat();
            ct.setId(UUID.randomUUID());
            ct.setIdPhieuXuat(request.getIdPhieuXuat());
            ct.setIdSanPham(request.getIdSanPham());
            ct.setSoLuongYeuCau(request.getSoLuongYeuCau());
            ct.setSoLuongXuat(request.getSoLuongXuat() != null ? request.getSoLuongXuat() : 0);
            ct.setSoLuongNhan(request.getSoLuongNhan() != null ? request.getSoLuongNhan() : 0);
            ct.setDonGiaVon(request.getDonGiaVon());
            ct.setThanhTien(request.getThanhTien());
            ct.setHanSuDung(request.getHanSuDung());
            ct.setThuTu(request.getThuTu() != null ? request.getThuTu() : 0);
            ct.setNgayTao(LocalDateTime.now());
            chiTietPhieuXuatRepository.save(ct);
        }
        return ResponseEntity.ok(new SuccessResponse("Tạo chi tiết phiếu xuất thành công"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (chiTietPhieuXuatRepository.existsById(id)) {
            chiTietPhieuXuatRepository.deleteById(id);
            return ResponseEntity.ok(new SuccessResponse("Xóa chi tiết thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/by-phieu/{idPhieuXuat}")
    public ResponseEntity<?> deleteByPhieuXuat(@PathVariable UUID idPhieuXuat) {
        List<ChiTietPhieuXuat> list = chiTietPhieuXuatRepository.findByIdPhieuXuat(idPhieuXuat);
        chiTietPhieuXuatRepository.deleteAll(list);
        return ResponseEntity.ok(new SuccessResponse("Xóa tất cả chi tiết phiếu xuất"));
    }

    record SuccessResponse(String message) {}
}
