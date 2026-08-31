package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.PhieuNhapDTO;
import com.erp.cuahangtienloi.entity.PhieuNhap;
import com.erp.cuahangtienloi.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/phieu-nhap")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PhieuNhapController {

    private final PhieuNhapRepository phieuNhapRepository;
    private final ChiNhanhRepository chiNhanhRepository;
    private final NhaCungCapRepository nhaCungCapRepository;
    private final NhanVienRepository nhanVienRepository;

    @GetMapping
    public ResponseEntity<List<PhieuNhapDTO>> getAll() {
        List<PhieuNhapDTO> list = phieuNhapRepository.findAll().stream()
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable UUID id) {
        return phieuNhapRepository.findById(id)
                .map(hd -> ResponseEntity.ok(toDTO(hd)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-branch/{idChiNhanh}")
    public ResponseEntity<List<PhieuNhapDTO>> getByChiNhanh(@PathVariable UUID idChiNhanh) {
        List<PhieuNhapDTO> list = phieuNhapRepository.findByIdChiNhanh(idChiNhanh).stream()
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-ncc/{idNcc}")
    public ResponseEntity<List<PhieuNhapDTO>> getByNcc(@PathVariable UUID idNcc) {
        List<PhieuNhapDTO> list = phieuNhapRepository.findByIdNcc(idNcc).stream()
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-status/{trangThai}")
    public ResponseEntity<List<PhieuNhapDTO>> getByStatus(@PathVariable String trangThai) {
        List<PhieuNhapDTO> list = phieuNhapRepository.findByTrangThai(trangThai).stream()
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody PhieuNhap request) {
        PhieuNhap pn = new PhieuNhap();
        pn.setId(UUID.randomUUID());
        pn.setMaPhieu(request.getMaPhieu());
        pn.setIdChiNhanh(request.getIdChiNhanh());
        pn.setIdNcc(request.getIdNcc());
        pn.setIdNguoiNhap(request.getIdNguoiNhap());
        pn.setNgayDatHang(request.getNgayDatHang() != null ? request.getNgayDatHang() : LocalDate.now());
        pn.setNgayDuKienGiao(request.getNgayDuKienGiao());
        pn.setNgayNhanThucTe(request.getNgayNhanThucTe());
        pn.setSubTotal(request.getSubTotal() != null ? request.getSubTotal() : BigDecimal.ZERO);
        pn.setVatTotal(request.getVatTotal() != null ? request.getVatTotal() : BigDecimal.ZERO);
        pn.setGiamGia(request.getGiamGia() != null ? request.getGiamGia() : BigDecimal.ZERO);
        pn.setGrandTotal(request.getGrandTotal() != null ? request.getGrandTotal() : BigDecimal.ZERO);
        pn.setDaThanhToan(request.getDaThanhToan() != null ? request.getDaThanhToan() : BigDecimal.ZERO);
        pn.setCongNo(request.getCongNo() != null ? request.getCongNo() : BigDecimal.ZERO);
        pn.setTrangThai(request.getTrangThai() != null ? request.getTrangThai() : "DRAFT");
        pn.setGhiChu(request.getGhiChu());
        pn.setNgayTao(LocalDateTime.now());
        pn.setNgayCapNhat(LocalDateTime.now());

        phieuNhapRepository.save(pn);
        return ResponseEntity.ok(toDTO(pn));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody PhieuNhap request) {
        return phieuNhapRepository.findById(id)
                .map(pn -> {
                    if (request.getMaPhieu() != null) pn.setMaPhieu(request.getMaPhieu());
                    if (request.getNgayDatHang() != null) pn.setNgayDatHang(request.getNgayDatHang());
                    if (request.getNgayDuKienGiao() != null) pn.setNgayDuKienGiao(request.getNgayDuKienGiao());
                    if (request.getNgayNhanThucTe() != null) pn.setNgayNhanThucTe(request.getNgayNhanThucTe());
                    if (request.getSubTotal() != null) pn.setSubTotal(request.getSubTotal());
                    if (request.getVatTotal() != null) pn.setVatTotal(request.getVatTotal());
                    if (request.getGiamGia() != null) pn.setGiamGia(request.getGiamGia());
                    if (request.getGrandTotal() != null) pn.setGrandTotal(request.getGrandTotal());
                    if (request.getDaThanhToan() != null) pn.setDaThanhToan(request.getDaThanhToan());
                    if (request.getCongNo() != null) pn.setCongNo(request.getCongNo());
                    if (request.getTrangThai() != null) pn.setTrangThai(request.getTrangThai());
                    if (request.getGhiChu() != null) pn.setGhiChu(request.getGhiChu());
                    pn.setNgayCapNhat(LocalDateTime.now());
                    phieuNhapRepository.save(pn);
                    return ResponseEntity.ok(toDTO(pn));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (phieuNhapRepository.existsById(id)) {
            phieuNhapRepository.deleteById(id);
            return ResponseEntity.ok(new SuccessResponse("Xóa phiếu nhập thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    private PhieuNhapDTO toDTO(PhieuNhap pn) {
        PhieuNhapDTO dto = new PhieuNhapDTO();
        dto.setId(pn.getId());
        dto.setMaPhieu(pn.getMaPhieu());
        dto.setIdChiNhanh(pn.getIdChiNhanh());
        dto.setIdNcc(pn.getIdNcc());
        dto.setIdNguoiNhap(pn.getIdNguoiNhap());
        dto.setNgayDatHang(pn.getNgayDatHang());
        dto.setNgayDuKienGiao(pn.getNgayDuKienGiao());
        dto.setNgayNhanThucTe(pn.getNgayNhanThucTe());
        dto.setSubTotal(pn.getSubTotal());
        dto.setVatTotal(pn.getVatTotal());
        dto.setGiamGia(pn.getGiamGia());
        dto.setGrandTotal(pn.getGrandTotal());
        dto.setDaThanhToan(pn.getDaThanhToan());
        dto.setCongNo(pn.getCongNo());
        dto.setTrangThai(pn.getTrangThai());
        dto.setGhiChu(pn.getGhiChu());

        if (pn.getIdChiNhanh() != null) {
            chiNhanhRepository.findById(pn.getIdChiNhanh())
                    .ifPresent(cn -> dto.setTenChiNhanh(cn.getTenChiNhanh()));
        }
        if (pn.getIdNcc() != null) {
            nhaCungCapRepository.findById(pn.getIdNcc())
                    .ifPresent(ncc -> dto.setTenNcc(ncc.getTenNcc()));
        }
        if (pn.getIdNguoiNhap() != null) {
            nhanVienRepository.findById(pn.getIdNguoiNhap())
                    .ifPresent(nv -> dto.setTenNguoiNhap(nv.getHoTen()));
        }

        return dto;
    }

    record SuccessResponse(String message) {}
}
