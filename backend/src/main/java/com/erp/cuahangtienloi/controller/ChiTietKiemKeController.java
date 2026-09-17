package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.entity.ChiTietKiemKe;
import com.erp.cuahangtienloi.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chi-tiet-kiem-ke")
@RequiredArgsConstructor
//@CrossOrigin(origins = "*")
@PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
public class ChiTietKiemKeController {

    private final ChiTietKiemKeRepository chiTietKiemKeRepository;
    private final PhieuKiemKeRepository phieuKiemKeRepository;
    private final SanPhamRepository sanPhamRepository;

    @GetMapping("/by-phieu/{idPhieuKiemKe}")
    public ResponseEntity<List<ChiTietKiemKe>> getByPhieuKiemKe(@PathVariable UUID idPhieuKiemKe) {
        return ResponseEntity.ok(chiTietKiemKeRepository.findByIdPhieuKiemKe(idPhieuKiemKe));
    }

    @GetMapping("/by-san-pham/{idSanPham}")
    public ResponseEntity<List<ChiTietKiemKe>> getBySanPham(@PathVariable UUID idSanPham) {
        return ResponseEntity.ok(chiTietKiemKeRepository.findByIdSanPham(idSanPham));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> create(@RequestBody ChiTietKiemKe request) {
        validate(request);
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
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    @Transactional
    public ResponseEntity<?> createBatch(@RequestBody List<ChiTietKiemKe> requests) {
        if (requests == null || requests.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Danh sách chi tiết rỗng"));
        }
        List<ChiTietKiemKe> saved = new ArrayList<>();
        for (ChiTietKiemKe request : requests) {
            validate(request);
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
            saved.add(chiTietKiemKeRepository.save(ct));
        }
        chiTietKiemKeRepository.flush();
        return ResponseEntity.ok(saved);
    }

    private void validate(ChiTietKiemKe request) {
        if (request.getIdPhieuKiemKe() == null || !phieuKiemKeRepository.existsById(request.getIdPhieuKiemKe())) {
            throw new IllegalArgumentException("Phiếu kiểm kê không tồn tại");
        }
        if (request.getIdSanPham() == null || !sanPhamRepository.existsById(request.getIdSanPham())) {
            throw new IllegalArgumentException("Sản phẩm không tồn tại");
        }
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getTonHeThong(), "Tồn hệ thống");
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getTonThucTe(), "Tồn thực tế");
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getDonGiaVon(), "Đơn giá vốn");
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (chiTietKiemKeRepository.existsById(id)) {
            chiTietKiemKeRepository.deleteById(id);
            return ResponseEntity.ok( ApiResponse.ok("Xóa chi tiết thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/by-phieu/{idPhieuKiemKe}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> deleteByPhieuKiemKe(@PathVariable UUID idPhieuKiemKe) {
        List<ChiTietKiemKe> list = chiTietKiemKeRepository.findByIdPhieuKiemKe(idPhieuKiemKe);
        chiTietKiemKeRepository.deleteAll(list);
        return ResponseEntity.ok( ApiResponse.ok("Xóa tất cả chi tiết kiểm kê"));
    }

//    record SuccessResponse(String message) {}
}
