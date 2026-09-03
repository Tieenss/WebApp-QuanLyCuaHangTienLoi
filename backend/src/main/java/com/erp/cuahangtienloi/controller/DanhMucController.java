package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.entity.DanhMuc;
import com.erp.cuahangtienloi.repository.DanhMucRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/danh-muc")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DanhMucController {

    private final DanhMucRepository danhMucRepository;

    @GetMapping
    public ResponseEntity<List<DanhMuc>> getAll() {
        return ResponseEntity.ok(danhMucRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable UUID id) {
        return danhMucRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/active")
    public ResponseEntity<List<DanhMuc>> getActive() {
        List<DanhMuc> list = danhMucRepository.findAll().stream()
                .filter(dm -> dm.getDangHoatDong() != null && dm.getDangHoatDong())
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/parent/{parentId}")
    public ResponseEntity<List<DanhMuc>> getByParent(@PathVariable UUID parentId) {
        List<DanhMuc> list = danhMucRepository.findAll().stream()
                .filter(dm -> parentId == null ? dm.getParentId() == null : parentId.equals(dm.getParentId()))
                .toList();
        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody DanhMuc request) {
        if (danhMucRepository.existsByMaDanhMuc(request.getMaDanhMuc())) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Mã danh mục đã tồn tại"));
        }

        DanhMuc dm = new DanhMuc();
        dm.setId(UUID.randomUUID());
        // Tự sinh mã danh mục nếu frontend không gửi (ma_danh_muc NOT NULL)
        String maDM = request.getMaDanhMuc();
        if (maDM == null || maDM.isBlank()) {
            maDM = "DM-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        }
        dm.setMaDanhMuc(maDM);
        dm.setTenDanhMuc(request.getTenDanhMuc());
        dm.setParentId(request.getParentId());
        dm.setMoTa(request.getMoTa());
        dm.setIconEmoji(request.getIconEmoji());
        dm.setImageUrl(request.getImageUrl());
        dm.setMauHex(request.getMauHex());
        dm.setThuTuHienThi(request.getThuTuHienThi() != null ? request.getThuTuHienThi() : 999);
        dm.setProductCount(0);
        dm.setDangHoatDong(request.getDangHoatDong() != null ? request.getDangHoatDong() : true);
        dm.setNgayTao(LocalDateTime.now());
        dm.setNgayCapNhat(LocalDateTime.now());

        danhMucRepository.save(dm);
        return ResponseEntity.ok(dm);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody DanhMuc request) {
        return danhMucRepository.findById(id)
                .map(dm -> {
                    if (request.getMaDanhMuc() != null) dm.setMaDanhMuc(request.getMaDanhMuc());
                    if (request.getTenDanhMuc() != null) dm.setTenDanhMuc(request.getTenDanhMuc());
                    if (request.getParentId() != null) dm.setParentId(request.getParentId());
                    if (request.getMoTa() != null) dm.setMoTa(request.getMoTa());
                    if (request.getIconEmoji() != null) dm.setIconEmoji(request.getIconEmoji());
                    if (request.getImageUrl() != null) dm.setImageUrl(request.getImageUrl());
                    if (request.getMauHex() != null) dm.setMauHex(request.getMauHex());
                    if (request.getThuTuHienThi() != null) dm.setThuTuHienThi(request.getThuTuHienThi());
                    if (request.getDangHoatDong() != null) dm.setDangHoatDong(request.getDangHoatDong());
                    dm.setNgayCapNhat(LocalDateTime.now());
                    danhMucRepository.save(dm);
                    return ResponseEntity.ok(dm);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (danhMucRepository.existsById(id)) {
            danhMucRepository.deleteById(id);
            return ResponseEntity.ok(new SuccessResponse("Xóa danh mục thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    record ErrorResponse(String message) {}
    record SuccessResponse(String message) {}
}
