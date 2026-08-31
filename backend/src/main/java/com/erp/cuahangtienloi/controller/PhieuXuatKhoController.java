package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.PhieuXuatKhoDTO;
import com.erp.cuahangtienloi.entity.PhieuXuatKho;
import com.erp.cuahangtienloi.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/phieu-xuat-kho")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PhieuXuatKhoController {

    private final PhieuXuatKhoRepository phieuXuatKhoRepository;
    private final ChiNhanhRepository chiNhanhRepository;
    private final NhanVienRepository nhanVienRepository;

    @GetMapping
    public ResponseEntity<List<PhieuXuatKhoDTO>> getAll() {
        List<PhieuXuatKhoDTO> list = phieuXuatKhoRepository.findAll().stream()
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable UUID id) {
        return phieuXuatKhoRepository.findById(id)
                .map(hd -> ResponseEntity.ok(toDTO(hd)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-branch-xuat/{idChiNhanhXuat}")
    public ResponseEntity<List<PhieuXuatKhoDTO>> getByBranchXuat(@PathVariable UUID idChiNhanhXuat) {
        List<PhieuXuatKhoDTO> list = phieuXuatKhoRepository.findByIdChiNhanhXuat(idChiNhanhXuat).stream()
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-branch-nhan/{idChiNhanhNhan}")
    public ResponseEntity<List<PhieuXuatKhoDTO>> getByBranchNhan(@PathVariable UUID idChiNhanhNhan) {
        List<PhieuXuatKhoDTO> list = phieuXuatKhoRepository.findByIdChiNhanhNhan(idChiNhanhNhan).stream()
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-status/{trangThai}")
    public ResponseEntity<List<PhieuXuatKhoDTO>> getByStatus(@PathVariable String trangThai) {
        List<PhieuXuatKhoDTO> list = phieuXuatKhoRepository.findByTrangThai(trangThai).stream()
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody PhieuXuatKho request) {
        PhieuXuatKho pxk = new PhieuXuatKho();
        pxk.setId(UUID.randomUUID());
        pxk.setMaPhieu(request.getMaPhieu());
        pxk.setIdChiNhanhXuat(request.getIdChiNhanhXuat());
        pxk.setIdChiNhanhNhan(request.getIdChiNhanhNhan());
        pxk.setIdNguoiTao(request.getIdNguoiTao());
        pxk.setIdNguoiDuyet(request.getIdNguoiDuyet());
        pxk.setIdNguoiNhan(request.getIdNguoiNhan());
        pxk.setNgayYeuCau(request.getNgayYeuCau() != null ? request.getNgayYeuCau() : LocalDate.now());
        pxk.setNgayXuatThucTe(request.getNgayXuatThucTe());
        pxk.setNgayNhanThucTe(request.getNgayNhanThucTe());
        pxk.setTrangThai(request.getTrangThai() != null ? request.getTrangThai() : "PENDING");
        pxk.setGhiChu(request.getGhiChu());
        pxk.setNgayTao(LocalDateTime.now());
        pxk.setNgayCapNhat(LocalDateTime.now());

        phieuXuatKhoRepository.save(pxk);
        return ResponseEntity.ok(toDTO(pxk));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody PhieuXuatKho request) {
        return phieuXuatKhoRepository.findById(id)
                .map(pxk -> {
                    if (request.getMaPhieu() != null) pxk.setMaPhieu(request.getMaPhieu());
                    if (request.getIdChiNhanhXuat() != null) pxk.setIdChiNhanhXuat(request.getIdChiNhanhXuat());
                    if (request.getIdChiNhanhNhan() != null) pxk.setIdChiNhanhNhan(request.getIdChiNhanhNhan());
                    if (request.getIdNguoiDuyet() != null) pxk.setIdNguoiDuyet(request.getIdNguoiDuyet());
                    if (request.getIdNguoiNhan() != null) pxk.setIdNguoiNhan(request.getIdNguoiNhan());
                    if (request.getNgayXuatThucTe() != null) pxk.setNgayXuatThucTe(request.getNgayXuatThucTe());
                    if (request.getNgayNhanThucTe() != null) pxk.setNgayNhanThucTe(request.getNgayNhanThucTe());
                    if (request.getTrangThai() != null) pxk.setTrangThai(request.getTrangThai());
                    if (request.getGhiChu() != null) pxk.setGhiChu(request.getGhiChu());
                    pxk.setNgayCapNhat(LocalDateTime.now());
                    phieuXuatKhoRepository.save(pxk);
                    return ResponseEntity.ok(toDTO(pxk));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (phieuXuatKhoRepository.existsById(id)) {
            phieuXuatKhoRepository.deleteById(id);
            return ResponseEntity.ok(new SuccessResponse("Xóa phiếu xuất kho thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    private PhieuXuatKhoDTO toDTO(PhieuXuatKho pxk) {
        PhieuXuatKhoDTO dto = new PhieuXuatKhoDTO();
        dto.setId(pxk.getId());
        dto.setMaPhieu(pxk.getMaPhieu());
        dto.setIdChiNhanhXuat(pxk.getIdChiNhanhXuat());
        dto.setIdChiNhanhNhan(pxk.getIdChiNhanhNhan());
        dto.setIdNguoiTao(pxk.getIdNguoiTao());
        dto.setIdNguoiDuyet(pxk.getIdNguoiDuyet());
        dto.setIdNguoiNhan(pxk.getIdNguoiNhan());
        dto.setNgayYeuCau(pxk.getNgayYeuCau());
        dto.setNgayXuatThucTe(pxk.getNgayXuatThucTe());
        dto.setNgayNhanThucTe(pxk.getNgayNhanThucTe());
        dto.setTrangThai(pxk.getTrangThai());
        dto.setGhiChu(pxk.getGhiChu());

        if (pxk.getIdChiNhanhXuat() != null) {
            chiNhanhRepository.findById(pxk.getIdChiNhanhXuat())
                    .ifPresent(cn -> dto.setTenChiNhanhXuat(cn.getTenChiNhanh()));
        }
        if (pxk.getIdChiNhanhNhan() != null) {
            chiNhanhRepository.findById(pxk.getIdChiNhanhNhan())
                    .ifPresent(cn -> dto.setTenChiNhanhNhan(cn.getTenChiNhanh()));
        }
        if (pxk.getIdNguoiTao() != null) {
            nhanVienRepository.findById(pxk.getIdNguoiTao())
                    .ifPresent(nv -> dto.setTenNguoiTao(nv.getHoTen()));
        }
        if (pxk.getIdNguoiDuyet() != null) {
            nhanVienRepository.findById(pxk.getIdNguoiDuyet())
                    .ifPresent(nv -> dto.setTenNguoiDuyet(nv.getHoTen()));
        }
        if (pxk.getIdNguoiNhan() != null) {
            nhanVienRepository.findById(pxk.getIdNguoiNhan())
                    .ifPresent(nv -> dto.setTenNguoiNhan(nv.getHoTen()));
        }

        return dto;
    }

    record SuccessResponse(String message) {}
}
