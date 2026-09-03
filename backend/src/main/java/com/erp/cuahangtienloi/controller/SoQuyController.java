package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.SoQuyDTO;
import com.erp.cuahangtienloi.entity.SoQuy;
import com.erp.cuahangtienloi.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/so-quy")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SoQuyController {

    private final SoQuyRepository soQuyRepository;
    private final ChiNhanhRepository chiNhanhRepository;
    private final NhanVienRepository nhanVienRepository;

    @GetMapping
    public ResponseEntity<List<SoQuyDTO>> getAll() {
        List<SoQuyDTO> list = soQuyRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable UUID id) {
        return soQuyRepository.findById(id)
                .map(sq -> ResponseEntity.ok(toDTO(sq)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-branch/{idChiNhanh}")
    public ResponseEntity<List<SoQuyDTO>> getByChiNhanh(@PathVariable UUID idChiNhanh) {
        List<SoQuyDTO> list = soQuyRepository.findByIdChiNhanh(idChiNhanh).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-direction/{direction}")
    public ResponseEntity<List<SoQuyDTO>> getByDirection(@PathVariable String direction) {
        List<SoQuyDTO> list = soQuyRepository.findByDirection(direction).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-hang-muc/{hangMuc}")
    public ResponseEntity<List<SoQuyDTO>> getByHangMuc(@PathVariable String hangMuc) {
        List<SoQuyDTO> list = soQuyRepository.findByHangMuc(hangMuc).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-date-range")
    public ResponseEntity<List<SoQuyDTO>> getByDateRange(
            @RequestParam LocalDate from, @RequestParam LocalDate to) {
        List<SoQuyDTO> list = soQuyRepository.findByEntryDateBetween(from, to).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody SoQuy request) {
        SoQuy sq = new SoQuy();
        sq.setId(UUID.randomUUID());
        sq.setMaChungTu(request.getMaChungTu());
        sq.setMaChungTuLienQuan(request.getMaChungTuLienQuan());
        sq.setIdChiNhanh(request.getIdChiNhanh());
        // id_nguoi_tao NOT NULL theo DB — nếu frontend không gửi (session cũ
        // chưa có idNhanVien) thì fallback nhân viên đầu tiên.
        UUID idNguoiTao = request.getIdNguoiTao();
        if (idNguoiTao == null || !nhanVienRepository.existsById(idNguoiTao)) {
            idNguoiTao = nhanVienRepository.findAll().stream()
                    .findFirst()
                    .map(nv -> nv.getId())
                    .orElse(null);
        }
        sq.setIdNguoiTao(idNguoiTao);
        sq.setDirection(request.getDirection());
        sq.setHangMuc(request.getHangMuc());
        sq.setHinhThucTt(request.getHinhThucTt() != null ? request.getHinhThucTt() : "CASH");
        sq.setEntryDate(request.getEntryDate() != null ? request.getEntryDate() : LocalDate.now());
        sq.setSoTien(request.getSoTien());
        sq.setDoiTuong(request.getDoiTuong());
        sq.setDienGiai(request.getDienGiai());
        sq.setRunningBalance(request.getRunningBalance());
        sq.setTrangThai(request.getTrangThai() != null ? request.getTrangThai() : "COMPLETED");
        sq.setNgayTao(LocalDateTime.now());
        sq.setNgayCapNhat(LocalDateTime.now());

        soQuyRepository.save(sq);
        return ResponseEntity.ok(toDTO(sq));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody SoQuy request) {
        return soQuyRepository.findById(id)
                .map(sq -> {
                    if (request.getDirection() != null) sq.setDirection(request.getDirection());
                    if (request.getHangMuc() != null) sq.setHangMuc(request.getHangMuc());
                    if (request.getHinhThucTt() != null) sq.setHinhThucTt(request.getHinhThucTt());
                    if (request.getEntryDate() != null) sq.setEntryDate(request.getEntryDate());
                    if (request.getSoTien() != null) sq.setSoTien(request.getSoTien());
                    if (request.getDoiTuong() != null) sq.setDoiTuong(request.getDoiTuong());
                    if (request.getDienGiai() != null) sq.setDienGiai(request.getDienGiai());
                    if (request.getRunningBalance() != null) sq.setRunningBalance(request.getRunningBalance());
                    if (request.getTrangThai() != null) sq.setTrangThai(request.getTrangThai());
                    sq.setNgayCapNhat(LocalDateTime.now());
                    soQuyRepository.save(sq);
                    return ResponseEntity.ok(toDTO(sq));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (soQuyRepository.existsById(id)) {
            soQuyRepository.deleteById(id);
            return ResponseEntity.ok(new SuccessResponse("Xóa sổ quỹ thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    private SoQuyDTO toDTO(SoQuy sq) {
        SoQuyDTO dto = new SoQuyDTO();
        dto.setId(sq.getId());
        dto.setMaChungTu(sq.getMaChungTu());
        dto.setMaChungTuLienQuan(sq.getMaChungTuLienQuan());
        dto.setIdChiNhanh(sq.getIdChiNhanh());
        dto.setIdNguoiTao(sq.getIdNguoiTao());
        dto.setDirection(sq.getDirection());
        dto.setHangMuc(sq.getHangMuc());
        dto.setHinhThucTt(sq.getHinhThucTt());
        dto.setEntryDate(sq.getEntryDate());
        dto.setSoTien(sq.getSoTien());
        dto.setDoiTuong(sq.getDoiTuong());
        dto.setDienGiai(sq.getDienGiai());
        dto.setRunningBalance(sq.getRunningBalance());
        dto.setTrangThai(sq.getTrangThai());

        if (sq.getIdChiNhanh() != null) {
            chiNhanhRepository.findById(sq.getIdChiNhanh())
                    .ifPresent(cn -> dto.setTenChiNhanh(cn.getTenChiNhanh()));
        }
        if (sq.getIdNguoiTao() != null) {
            nhanVienRepository.findById(sq.getIdNguoiTao())
                    .ifPresent(nv -> dto.setTenNguoiTao(nv.getHoTen()));
        }

        return dto;
    }

    record SuccessResponse(String message) {}
}
