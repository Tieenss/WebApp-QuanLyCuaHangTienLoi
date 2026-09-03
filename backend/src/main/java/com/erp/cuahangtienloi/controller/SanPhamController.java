package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.CreateSanPhamRequest;
import com.erp.cuahangtienloi.dto.SanPhamDTO;
import com.erp.cuahangtienloi.dto.UpdateSanPhamRequest;
import com.erp.cuahangtienloi.entity.DanhMuc;
import com.erp.cuahangtienloi.entity.NhaCungCap;
import com.erp.cuahangtienloi.entity.SanPham;
import com.erp.cuahangtienloi.repository.DanhMucRepository;
import com.erp.cuahangtienloi.repository.NhaCungCapRepository;
import com.erp.cuahangtienloi.repository.SanPhamRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/san-pham")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SanPhamController {

    private final SanPhamRepository sanPhamRepository;
    private final DanhMucRepository danhMucRepository;
    private final NhaCungCapRepository nhaCungCapRepository;

    @GetMapping
    public ResponseEntity<List<SanPhamDTO>> getAll() {
        List<SanPhamDTO> list = sanPhamRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable UUID id) {
        return sanPhamRepository.findById(id)
                .map(sp -> ResponseEntity.ok(toDTO(sp)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-danh-muc/{idDanhMuc}")
    public ResponseEntity<List<SanPhamDTO>> getByDanhMuc(@PathVariable UUID idDanhMuc) {
        List<SanPhamDTO> list = sanPhamRepository.findByIdDanhMuc(idDanhMuc).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-ma-vach/{maVach}")
    public ResponseEntity<?> getByMaVach(@PathVariable String maVach) {
        return sanPhamRepository.findByMaVach(maVach)
                .map(sp -> ResponseEntity.ok(toDTO(sp)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/active")
    public ResponseEntity<List<SanPhamDTO>> getActive() {
        List<SanPhamDTO> list = sanPhamRepository.findByDangHoatDong(true).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody CreateSanPhamRequest request) {
        if (sanPhamRepository.existsBySku(request.getSku())) {
            return ResponseEntity.badRequest().body(new ErrorResponse("SKU đã tồn tại"));
        }
        if (sanPhamRepository.existsByMaVach(request.getMaVach())) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Mã vạch đã tồn tại"));
        }

        SanPham sp = new SanPham();
        sp.setId(UUID.randomUUID());
        sp.setIdDanhMuc(request.getIdDanhMuc());
        sp.setSku(request.getSku());
        sp.setMaVach(request.getMaVach());
        sp.setTenSanPham(request.getTenSanPham());
        sp.setDonVi(request.getDonVi() != null ? request.getDonVi() : "PIECE");
        sp.setImageUrl(request.getImageUrl());
        sp.setMoTa(request.getMoTa());
        sp.setDangHoatDong(request.getDangHoatDong() != null ? request.getDangHoatDong() : true);
        sp.setGiaVon(request.getGiaVon() != null ? request.getGiaVon() : BigDecimal.ZERO);
        sp.setGiaBan(request.getGiaBan());
        sp.setVatPhantram(request.getVatPhantram() != null ? request.getVatPhantram() : 8);
        sp.setIdNhaCungCap(request.getIdNhaCungCap());
        sp.setTonToiThieu(request.getTonToiThieu() != null ? request.getTonToiThieu() : 0);
        sp.setTonToiDa(request.getTonToiDa() != null ? request.getTonToiDa() : 0);
        sp.setDeHong(request.getDeHong() != null ? request.getDeHong() : false);
        sp.setHanSuDungNgay(request.getHanSuDungNgay() != null ? request.getHanSuDungNgay() : 0);
        sp.setNgayTao(LocalDateTime.now());
        sp.setNgayCapNhat(LocalDateTime.now());

        sanPhamRepository.save(sp);
        return ResponseEntity.ok(toDTO(sp));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody UpdateSanPhamRequest request) {
        return sanPhamRepository.findById(id)
                .map(sp -> {
                    if (request.getIdDanhMuc() != null) sp.setIdDanhMuc(request.getIdDanhMuc());
                    if (request.getSku() != null) sp.setSku(request.getSku());
                    if (request.getMaVach() != null) sp.setMaVach(request.getMaVach());
                    if (request.getTenSanPham() != null) sp.setTenSanPham(request.getTenSanPham());
                    if (request.getDonVi() != null) sp.setDonVi(request.getDonVi());
                    if (request.getImageUrl() != null) sp.setImageUrl(request.getImageUrl());
                    if (request.getMoTa() != null) sp.setMoTa(request.getMoTa());
                    if (request.getDangHoatDong() != null) sp.setDangHoatDong(request.getDangHoatDong());
                    if (request.getGiaVon() != null) sp.setGiaVon(request.getGiaVon());
                    if (request.getGiaBan() != null) sp.setGiaBan(request.getGiaBan());
                    if (request.getVatPhantram() != null) sp.setVatPhantram(request.getVatPhantram());
                    if (request.getIdNhaCungCap() != null) sp.setIdNhaCungCap(request.getIdNhaCungCap());
                    if (request.getTonToiThieu() != null) sp.setTonToiThieu(request.getTonToiThieu());
                    if (request.getTonToiDa() != null) sp.setTonToiDa(request.getTonToiDa());
                    if (request.getDeHong() != null) sp.setDeHong(request.getDeHong());
                    if (request.getHanSuDungNgay() != null) sp.setHanSuDungNgay(request.getHanSuDungNgay());
                    sp.setNgayCapNhat(LocalDateTime.now());
                    
                    sanPhamRepository.save(sp);
                    return ResponseEntity.ok(toDTO(sp));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (sanPhamRepository.existsById(id)) {
            sanPhamRepository.deleteById(id);
            return ResponseEntity.ok(new SuccessResponse("Xóa sản phẩm thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    private SanPhamDTO toDTO(SanPham sp) {
        SanPhamDTO dto = new SanPhamDTO();
        dto.setId(sp.getId());
        dto.setIdDanhMuc(sp.getIdDanhMuc());
        dto.setSku(sp.getSku());
        dto.setMaVach(sp.getMaVach());
        dto.setTenSanPham(sp.getTenSanPham());
        dto.setDonVi(sp.getDonVi());
        dto.setImageUrl(sp.getImageUrl());
        dto.setMoTa(sp.getMoTa());
        dto.setDangHoatDong(sp.getDangHoatDong());
        dto.setGiaVon(sp.getGiaVon());
        dto.setGiaBan(sp.getGiaBan());
        dto.setVatPhantram(sp.getVatPhantram());
        dto.setIdNhaCungCap(sp.getIdNhaCungCap());
        dto.setTonToiThieu(sp.getTonToiThieu());
        dto.setTonToiDa(sp.getTonToiDa());
        dto.setDeHong(sp.getDeHong());
        dto.setHanSuDungNgay(sp.getHanSuDungNgay());

        if (sp.getIdDanhMuc() != null) {
            danhMucRepository.findById(sp.getIdDanhMuc())
                    .ifPresent(dm -> dto.setTenDanhMuc(dm.getTenDanhMuc()));
        }
        if (sp.getIdNhaCungCap() != null) {
            nhaCungCapRepository.findById(sp.getIdNhaCungCap())
                    .ifPresent(ncc -> dto.setTenNhaCungCap(ncc.getTenNcc()));
        }

        return dto;
    }

    record ErrorResponse(String message) {}
    record SuccessResponse(String message) {}
}
