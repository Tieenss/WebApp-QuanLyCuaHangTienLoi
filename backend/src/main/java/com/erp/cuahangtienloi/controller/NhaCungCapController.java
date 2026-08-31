package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.entity.NhaCungCap;
import com.erp.cuahangtienloi.repository.NhaCungCapRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/nha-cung-cap")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class NhaCungCapController {

    private final NhaCungCapRepository nhaCungCapRepository;

    @GetMapping
    public ResponseEntity<List<NhaCungCap>> getAll() {
        return ResponseEntity.ok(nhaCungCapRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable UUID id) {
        return nhaCungCapRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/active")
    public ResponseEntity<List<NhaCungCap>> getActive() {
        List<NhaCungCap> list = nhaCungCapRepository.findAll().stream()
                .filter(ncc -> ncc.getDangHoatDong() != null && ncc.getDangHoatDong())
                .toList();
        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody NhaCungCap request) {
        if (nhaCungCapRepository.existsByMaNhaCungCap(request.getMaNcc())) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Mã NCC đã tồn tại"));
        }

        NhaCungCap ncc = new NhaCungCap();
        ncc.setId(UUID.randomUUID());
        ncc.setMaNcc(request.getMaNcc());
        ncc.setTenNcc(request.getTenNcc());
        ncc.setMaSoThue(request.getMaSoThue());
        ncc.setSoDienThoai(request.getSoDienThoai());
        ncc.setEmail(request.getEmail());
        ncc.setDiaChi(request.getDiaChi());
        ncc.setNguoiLienHe(request.getNguoiLienHe());
        ncc.setChucDanhLienHe(request.getChucDanhLienHe());
        ncc.setSdtLienHe(request.getSdtLienHe());
        ncc.setDieuKhoanThanhToan(request.getDieuKhoanThanhToan() != null ? request.getDieuKhoanThanhToan() : "Thanh toán ngay");
        ncc.setSoNgayDuocNo(request.getSoNgayDuocNo() != null ? request.getSoNgayDuocNo() : 0);
        ncc.setTongCongNo(request.getTongCongNo() != null ? request.getTongCongNo() : BigDecimal.ZERO);
        ncc.setTongDonHang(request.getTongDonHang() != null ? request.getTongDonHang() : 0);
        ncc.setDangHoatDong(request.getDangHoatDong() != null ? request.getDangHoatDong() : true);
        ncc.setGhiChu(request.getGhiChu());
        ncc.setNgayTao(LocalDateTime.now());
        ncc.setNgayCapNhat(LocalDateTime.now());

        nhaCungCapRepository.save(ncc);
        return ResponseEntity.ok(ncc);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody NhaCungCap request) {
        return nhaCungCapRepository.findById(id)
                .map(ncc -> {
                    if (request.getMaNcc() != null) ncc.setMaNcc(request.getMaNcc());
                    if (request.getTenNcc() != null) ncc.setTenNcc(request.getTenNcc());
                    if (request.getMaSoThue() != null) ncc.setMaSoThue(request.getMaSoThue());
                    if (request.getSoDienThoai() != null) ncc.setSoDienThoai(request.getSoDienThoai());
                    if (request.getEmail() != null) ncc.setEmail(request.getEmail());
                    if (request.getDiaChi() != null) ncc.setDiaChi(request.getDiaChi());
                    if (request.getNguoiLienHe() != null) ncc.setNguoiLienHe(request.getNguoiLienHe());
                    if (request.getChucDanhLienHe() != null) ncc.setChucDanhLienHe(request.getChucDanhLienHe());
                    if (request.getSdtLienHe() != null) ncc.setSdtLienHe(request.getSdtLienHe());
                    if (request.getDieuKhoanThanhToan() != null) ncc.setDieuKhoanThanhToan(request.getDieuKhoanThanhToan());
                    if (request.getSoNgayDuocNo() != null) ncc.setSoNgayDuocNo(request.getSoNgayDuocNo());
                    if (request.getTongCongNo() != null) ncc.setTongCongNo(request.getTongCongNo());
                    if (request.getTongDonHang() != null) ncc.setTongDonHang(request.getTongDonHang());
                    if (request.getDangHoatDong() != null) ncc.setDangHoatDong(request.getDangHoatDong());
                    if (request.getGhiChu() != null) ncc.setGhiChu(request.getGhiChu());
                    ncc.setNgayCapNhat(LocalDateTime.now());
                    nhaCungCapRepository.save(ncc);
                    return ResponseEntity.ok(ncc);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (nhaCungCapRepository.existsById(id)) {
            nhaCungCapRepository.deleteById(id);
            return ResponseEntity.ok(new SuccessResponse("Xóa NCC thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    record ErrorResponse(String message) {}
    record SuccessResponse(String message) {}
}
