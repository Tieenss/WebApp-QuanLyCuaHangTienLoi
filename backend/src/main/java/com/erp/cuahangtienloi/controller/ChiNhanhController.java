package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.entity.ChiNhanh;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.repository.ChiNhanhRepository;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chi-nhanh")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ChiNhanhController {

    private final ChiNhanhRepository chiNhanhRepository;
    private final NhanVienRepository nhanVienRepository;

    @GetMapping
    public ResponseEntity<List<ChiNhanh>> getAll() {
        return ResponseEntity.ok(chiNhanhRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable UUID id) {
        return chiNhanhRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/active")
    public ResponseEntity<List<ChiNhanh>> getActive() {
        List<ChiNhanh> list = chiNhanhRepository.findAll().stream()
                .filter(cn -> cn.getDangHoatDong() != null && cn.getDangHoatDong())
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-loai/{loai}")
    public ResponseEntity<List<ChiNhanh>> getByLoai(@PathVariable String loai) {
        List<ChiNhanh> list = chiNhanhRepository.findAll().stream()
                .filter(cn -> loai.equals(cn.getLoaiChiNhanh()))
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/kho-tong")
    public ResponseEntity<List<ChiNhanh>> getKhoTong() {
        List<ChiNhanh> list = chiNhanhRepository.findAll().stream()
                .filter(cn -> "KHO_TONG".equals(cn.getLoai()))
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/cua-hang")
    public ResponseEntity<List<ChiNhanh>> getCuaHang() {
        List<ChiNhanh> list = chiNhanhRepository.findAll().stream()
                .filter(cn -> "CUA_HANG_BAN_LE".equals(cn.getLoai()))
                .toList();
        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody ChiNhanh request) {
        if (chiNhanhRepository.findByMaChiNhanh(request.getMaChiNhanh()).isPresent()) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Mã chi nhánh đã tồn tại"));
        }

        ChiNhanh cn = new ChiNhanh();
        cn.setId(UUID.randomUUID());
        cn.setMaChiNhanh(request.getMaChiNhanh());
        cn.setTenChiNhanh(request.getTenChiNhanh());
        cn.setDiaChi(request.getDiaChi());
        cn.setDiaChiChiTiet(request.getDiaChiChiTiet());
        cn.setTinhThanh(request.getTinhThanh());
        cn.setQuanHuyen(request.getQuanHuyen());
        cn.setVungMien(request.getVungMien());
        cn.setSoDienThoai(request.getSoDienThoai());
        cn.setGioMoCua(request.getGioMoCua());
        cn.setDienTichM2(request.getDienTichM2());
        cn.setDoanhThuThang(request.getDoanhThuThang() != null ? request.getDoanhThuThang() : 0L);
        cn.setTenQuanLy(request.getTenQuanLy());
        cn.setNgayKhaiTruong(request.getNgayKhaiTruong());
        cn.setTrangThai(request.getTrangThai() != null ? request.getTrangThai() : "ACTIVE");
cn.setLoai(request.getLoaiChiNhanh() != null ? request.getLoaiChiNhanh() : "CUA_HANG_BAN_LE");
        cn.setLoaiChiNhanh(request.getLoaiChiNhanh());
        cn.setIdQuanLy(request.getIdQuanLy());
        cn.setDangHoatDong(request.getDangHoatDong() != null ? request.getDangHoatDong() : true);
        cn.setNgayTao(LocalDateTime.now());
        cn.setNguoiTao(request.getNguoiTao());
        cn.setNgayCapNhat(LocalDateTime.now());
        cn.setNguoiCapNhat(request.getNguoiCapNhat());

        chiNhanhRepository.save(cn);
        return ResponseEntity.ok(cn);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody ChiNhanh request) {
        return chiNhanhRepository.findById(id)
                .map(cn -> {
                    if (request.getMaChiNhanh() != null) cn.setMaChiNhanh(request.getMaChiNhanh());
                    if (request.getTenChiNhanh() != null) cn.setTenChiNhanh(request.getTenChiNhanh());
                    if (request.getDiaChi() != null) cn.setDiaChi(request.getDiaChi());
                    if (request.getDiaChiChiTiet() != null) cn.setDiaChiChiTiet(request.getDiaChiChiTiet());
                    if (request.getTinhThanh() != null) cn.setTinhThanh(request.getTinhThanh());
                    if (request.getQuanHuyen() != null) cn.setQuanHuyen(request.getQuanHuyen());
                    if (request.getVungMien() != null) cn.setVungMien(request.getVungMien());
                    if (request.getSoDienThoai() != null) cn.setSoDienThoai(request.getSoDienThoai());
                    if (request.getGioMoCua() != null) cn.setGioMoCua(request.getGioMoCua());
                    if (request.getDienTichM2() != null) cn.setDienTichM2(request.getDienTichM2());
                    if (request.getDoanhThuThang() != null) cn.setDoanhThuThang(request.getDoanhThuThang());
                    if (request.getTenQuanLy() != null) cn.setTenQuanLy(request.getTenQuanLy());
                    if (request.getNgayKhaiTruong() != null) cn.setNgayKhaiTruong(request.getNgayKhaiTruong());
                    if (request.getTrangThai() != null) cn.setTrangThai(request.getTrangThai());
                    if (request.getLoaiChiNhanh() != null) {
                        cn.setLoai(request.getLoaiChiNhanh());
                        cn.setLoaiChiNhanh(request.getLoaiChiNhanh());
                    }
                    if (request.getIdQuanLy() != null) cn.setIdQuanLy(request.getIdQuanLy());
                    if (request.getDangHoatDong() != null) cn.setDangHoatDong(request.getDangHoatDong());
                    if (request.getNguoiCapNhat() != null) cn.setNguoiCapNhat(request.getNguoiCapNhat());
                    cn.setNgayCapNhat(LocalDateTime.now());
                    chiNhanhRepository.save(cn);
                    return ResponseEntity.ok(cn);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (chiNhanhRepository.existsById(id)) {
            chiNhanhRepository.deleteById(id);
            return ResponseEntity.ok(new SuccessResponse("Xóa chi nhánh thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    @PutMapping("/{id}/quan-ly/{idQuanLy}")
    public ResponseEntity<?> assignQuanLy(@PathVariable UUID id, @PathVariable UUID idQuanLy) {
        return chiNhanhRepository.findById(id)
                .map(cn -> {
                    NhanVien nv = nhanVienRepository.findById(idQuanLy).orElse(null);
                    if (nv == null) {
                        return ResponseEntity.badRequest().body(new ErrorResponse("Nhân viên không tồn tại"));
                    }
                    cn.setIdQuanLy(idQuanLy);
                    cn.setTenQuanLy(nv.getHoTen());
                    cn.setNguoiCapNhat(nv.getHoTen());
                    cn.setNgayCapNhat(LocalDateTime.now());
                    chiNhanhRepository.save(cn);
                    return ResponseEntity.ok(cn);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    record ErrorResponse(String message) {}
    record SuccessResponse(String message) {}
}