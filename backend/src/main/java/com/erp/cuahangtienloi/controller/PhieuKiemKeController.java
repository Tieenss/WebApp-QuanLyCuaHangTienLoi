package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.PhieuKiemKeDTO;
import com.erp.cuahangtienloi.entity.PhieuKiemKe;
import com.erp.cuahangtienloi.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/phieu-kiem-ke")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PhieuKiemKeController {

    private final PhieuKiemKeRepository phieuKiemKeRepository;
    private final ChiNhanhRepository chiNhanhRepository;
    private final NhanVienRepository nhanVienRepository;

    @GetMapping
    public ResponseEntity<List<PhieuKiemKeDTO>> getAll() {
        List<PhieuKiemKeDTO> list = phieuKiemKeRepository.findAll().stream()
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable UUID id) {
        return phieuKiemKeRepository.findById(id)
                .map(hd -> ResponseEntity.ok(toDTO(hd)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-branch/{idChiNhanh}")
    public ResponseEntity<List<PhieuKiemKeDTO>> getByChiNhanh(@PathVariable UUID idChiNhanh) {
        List<PhieuKiemKeDTO> list = phieuKiemKeRepository.findByIdChiNhanh(idChiNhanh).stream()
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-status/{trangThai}")
    public ResponseEntity<List<PhieuKiemKeDTO>> getByStatus(@PathVariable String trangThai) {
        List<PhieuKiemKeDTO> list = phieuKiemKeRepository.findByTrangThai(trangThai).stream()
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody PhieuKiemKe request) {
        PhieuKiemKe pkk = new PhieuKiemKe();
        pkk.setId(UUID.randomUUID());
        pkk.setMaPhieu(request.getMaPhieu());
        pkk.setIdChiNhanh(request.getIdChiNhanh());
        pkk.setIdNguoiTao(request.getIdNguoiTao());
        pkk.setIdNguoiDuyet(request.getIdNguoiDuyet());
        pkk.setNgayKiemKe(request.getNgayKiemKe() != null ? request.getNgayKiemKe() : LocalDate.now());
        pkk.setNgayCanBang(request.getNgayCanBang());
        pkk.setTrangThai(request.getTrangThai() != null ? request.getTrangThai() : "DANG_KIEM_KE");
        pkk.setGhiChu(request.getGhiChu());
        pkk.setNgayTao(LocalDateTime.now());
        pkk.setNgayCapNhat(LocalDateTime.now());

        phieuKiemKeRepository.save(pkk);
        return ResponseEntity.ok(toDTO(pkk));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody PhieuKiemKe request) {
        return phieuKiemKeRepository.findById(id)
                .map(pkk -> {
                    if (request.getMaPhieu() != null) pkk.setMaPhieu(request.getMaPhieu());
                    if (request.getIdChiNhanh() != null) pkk.setIdChiNhanh(request.getIdChiNhanh());
                    if (request.getIdNguoiDuyet() != null) pkk.setIdNguoiDuyet(request.getIdNguoiDuyet());
                    if (request.getNgayCanBang() != null) pkk.setNgayCanBang(request.getNgayCanBang());
                    if (request.getTrangThai() != null) pkk.setTrangThai(request.getTrangThai());
                    if (request.getGhiChu() != null) pkk.setGhiChu(request.getGhiChu());
                    pkk.setNgayCapNhat(LocalDateTime.now());
                    phieuKiemKeRepository.save(pkk);
                    return ResponseEntity.ok(toDTO(pkk));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (phieuKiemKeRepository.existsById(id)) {
            phieuKiemKeRepository.deleteById(id);
            return ResponseEntity.ok(new SuccessResponse("Xóa phiếu kiểm kê thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    private PhieuKiemKeDTO toDTO(PhieuKiemKe pkk) {
        PhieuKiemKeDTO dto = new PhieuKiemKeDTO();
        dto.setId(pkk.getId());
        dto.setMaPhieu(pkk.getMaPhieu());
        dto.setIdChiNhanh(pkk.getIdChiNhanh());
        dto.setIdNguoiTao(pkk.getIdNguoiTao());
        dto.setIdNguoiDuyet(pkk.getIdNguoiDuyet());
        dto.setNgayKiemKe(pkk.getNgayKiemKe());
        dto.setNgayCanBang(pkk.getNgayCanBang());
        dto.setTrangThai(pkk.getTrangThai());
        dto.setGhiChu(pkk.getGhiChu());

        if (pkk.getIdChiNhanh() != null) {
            chiNhanhRepository.findById(pkk.getIdChiNhanh())
                    .ifPresent(cn -> dto.setTenChiNhanh(cn.getTenChiNhanh()));
        }
        if (pkk.getIdNguoiTao() != null) {
            nhanVienRepository.findById(pkk.getIdNguoiTao())
                    .ifPresent(nv -> dto.setTenNguoiTao(nv.getHoTen()));
        }
        if (pkk.getIdNguoiDuyet() != null) {
            nhanVienRepository.findById(pkk.getIdNguoiDuyet())
                    .ifPresent(nv -> dto.setTenNguoiDuyet(nv.getHoTen()));
        }

        return dto;
    }

    record SuccessResponse(String message) {}
}
