package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.TheKhoDTO;
import com.erp.cuahangtienloi.entity.TheKho;
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
@RequestMapping("/api/the-kho")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TheKhoController {

    private final TheKhoRepository theKhoRepository;
    private final SanPhamRepository sanPhamRepository;
    private final ChiNhanhRepository chiNhanhRepository;

    @GetMapping
    public ResponseEntity<List<TheKhoDTO>> getAll() {
        List<TheKhoDTO> list = theKhoRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable UUID id) {
        return theKhoRepository.findById(id)
                .map(tk -> ResponseEntity.ok(toDTO(tk)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-product/{idSanPham}/branch/{idChiNhanh}")
    public ResponseEntity<List<TheKhoDTO>> getByProductAndBranch(
            @PathVariable UUID idSanPham, @PathVariable UUID idChiNhanh) {
        List<TheKhoDTO> list = theKhoRepository
                .findByIdSanPhamAndIdChiNhanhOrderByNgayPhatSinhDesc(idSanPham, idChiNhanh).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-branch/{idChiNhanh}")
    public ResponseEntity<List<TheKhoDTO>> getByBranch(@PathVariable UUID idChiNhanh) {
        List<TheKhoDTO> list = theKhoRepository.findAll().stream()
                .filter(tk -> idChiNhanh.equals(tk.getIdChiNhanh()))
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-type/{loaiGiaoDich}/branch/{idChiNhanh}")
    public ResponseEntity<List<TheKhoDTO>> getByTypeAndBranch(
            @PathVariable String loaiGiaoDich, @PathVariable UUID idChiNhanh) {
        List<TheKhoDTO> list = theKhoRepository
                .findByLoaiGiaoDichAndIdChiNhanhOrderByNgayPhatSinhDesc(loaiGiaoDich, idChiNhanh).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-branch/{idChiNhanh}/from/{from}/to/{to}")
    public ResponseEntity<List<TheKhoDTO>> getByBranchAndDateRange(
            @PathVariable UUID idChiNhanh,
            @PathVariable LocalDateTime from,
            @PathVariable LocalDateTime to) {
        List<TheKhoDTO> list = theKhoRepository
                .findByIdChiNhanhAndNgayPhatSinhBetweenOrderByNgayPhatSinhDesc(idChiNhanh, from, to).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody TheKho request) {
        TheKho tk = new TheKho();
        tk.setId(UUID.randomUUID());
        tk.setNgayPhatSinh(request.getNgayPhatSinh() != null ? request.getNgayPhatSinh() : LocalDateTime.now());
        tk.setIdSanPham(request.getIdSanPham());
        tk.setIdChiNhanh(request.getIdChiNhanh());
        tk.setLoaiGiaoDich(request.getLoaiGiaoDich());
        tk.setSoLuong(request.getSoLuong());
        tk.setDonGia(request.getDonGia());
        tk.setThanhTien(request.getThanhTien());
        tk.setTonTruoc(request.getTonTruoc());
        tk.setTonSau(request.getTonSau());
        tk.setMaChungTu(request.getMaChungTu());
        tk.setNguoiThucHien(request.getNguoiThucHien());
        tk.setHanSuDung(request.getHanSuDung());
        tk.setGhiChu(request.getGhiChu());
        tk.setNgayTao(LocalDateTime.now());

        theKhoRepository.save(tk);
        return ResponseEntity.ok(toDTO(tk));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (theKhoRepository.existsById(id)) {
            theKhoRepository.deleteById(id);
            return ResponseEntity.ok(new SuccessResponse("Xóa thẻ kho thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    private TheKhoDTO toDTO(TheKho tk) {
        TheKhoDTO dto = new TheKhoDTO();
        dto.setId(tk.getId());
        dto.setNgayPhatSinh(tk.getNgayPhatSinh());
        dto.setIdSanPham(tk.getIdSanPham());
        dto.setIdChiNhanh(tk.getIdChiNhanh());
        dto.setLoaiGiaoDich(tk.getLoaiGiaoDich());
        dto.setSoLuong(tk.getSoLuong());
        dto.setDonGia(tk.getDonGia());
        dto.setThanhTien(tk.getThanhTien());
        dto.setTonTruoc(tk.getTonTruoc());
        dto.setTonSau(tk.getTonSau());
        dto.setMaChungTu(tk.getMaChungTu());
        dto.setNguoiThucHien(tk.getNguoiThucHien());
        dto.setHanSuDung(tk.getHanSuDung());
        dto.setGhiChu(tk.getGhiChu());

        if (tk.getIdSanPham() != null) {
            sanPhamRepository.findById(tk.getIdSanPham())
                    .ifPresent(sp -> {
                        dto.setTenSanPham(sp.getTenSanPham());
                        dto.setMaVach(sp.getMaVach());
                    });
        }
        if (tk.getIdChiNhanh() != null) {
            chiNhanhRepository.findById(tk.getIdChiNhanh())
                    .ifPresent(cn -> dto.setTenChiNhanh(cn.getTenChiNhanh()));
        }

        return dto;
    }

    record SuccessResponse(String message) {}
}
