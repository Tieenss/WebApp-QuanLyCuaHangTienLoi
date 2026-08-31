package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.entity.ChiTietKiemKe;
import com.erp.cuahangtienloi.repository.ChiTietKiemKeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chi-tiet-kiem-ke")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ChiTietKiemKeController {

    private final ChiTietKiemKeRepository chiTietKiemKeRepository;

    @GetMapping("/by-phieu/{idPhieuKiemKe}")
    public ResponseEntity<List<ChiTietKiemKe>> getByPhieuKiemKe(@PathVariable UUID idPhieuKiemKe) {
        return ResponseEntity.ok(chiTietKiemKeRepository.findByIdPhieuKiemKe(idPhieuKiemKe));
    }

    @GetMapping("/by-san-pham/{idSanPham}")
    public ResponseEntity<List<ChiTietKiemKe>> getBySanPham(@PathVariable UUID idSanPham) {
        return ResponseEntity.ok(chiTietKiemKeRepository.findByIdSanPham(idSanPham));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody ChiTietKiemKe request) {
        ChiTietKiemKe ct = new ChiTietKiemKe();
        ct.setId(UUID.randomUUID());
        ct.setIdPhieuKiemKe(request.getIdPhieuKiemKe());
        ct.setIdSanPham(request.getIdSanPham());
        ct.setTonHeThong(request.getTonHeThong());
        ct.setTonThucTe(request.getTonThucTe());
        ct.setSoLuongLech(request.getSoLuongLech());
        ct.setLyDoLech(request.getLyDoLech());
        ct.setDonGiaVon(request.getDonGiaVon());
        ct.setGiaTriLech(request.getGiaTriLech());
        ct.setNgayTao(LocalDateTime.now());

        chiTietKiemKeRepository.save(ct);
        return ResponseEntity.ok(ct);
    }

    @PostMapping("/batch")
    public ResponseEntity<?> createBatch(@RequestBody List<ChiTietKiemKe> requests) {
        for (ChiTietKiemKe request : requests) {
            ChiTietKiemKe ct = new ChiTietKiemKe();
            ct.setId(UUID.randomUUID());
            ct.setIdPhieuKiemKe(request.getIdPhieuKiemKe());
            ct.setIdSanPham(request.getIdSanPham());
            ct.setTonHeThong(request.getTonHeThong());
            ct.setTonThucTe(request.getTonThucTe());
            ct.setSoLuongLech(request.getSoLuongLech());
            ct.setLyDoLech(request.getLyDoLech());
            ct.setDonGiaVon(request.getDonGiaVon());
            ct.setGiaTriLech(request.getGiaTriLech());
            ct.setNgayTao(LocalDateTime.now());
            chiTietKiemKeRepository.save(ct);
        }
        return ResponseEntity.ok(new SuccessResponse("Tạo chi tiết kiểm kê thành công"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (chiTietKiemKeRepository.existsById(id)) {
            chiTietKiemKeRepository.deleteById(id);
            return ResponseEntity.ok(new SuccessResponse("Xóa chi tiết thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/by-phieu/{idPhieuKiemKe}")
    public ResponseEntity<?> deleteByPhieuKiemKe(@PathVariable UUID idPhieuKiemKe) {
        List<ChiTietKiemKe> list = chiTietKiemKeRepository.findByIdPhieuKiemKe(idPhieuKiemKe);
        chiTietKiemKeRepository.deleteAll(list);
        return ResponseEntity.ok(new SuccessResponse("Xóa tất cả chi tiết kiểm kê"));
    }

    record SuccessResponse(String message) {}
}
