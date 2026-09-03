package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.TonKhoDTO;
import com.erp.cuahangtienloi.entity.SanPham;
import com.erp.cuahangtienloi.entity.TonKho;
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
@RequestMapping("/api/ton-kho")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TonKhoController {

    private final TonKhoRepository tonKhoRepository;
    private final SanPhamRepository sanPhamRepository;
    private final ChiNhanhRepository chiNhanhRepository;

    @GetMapping
    public ResponseEntity<List<TonKhoDTO>> getAll() {
        List<TonKhoDTO> list = tonKhoRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-branch/{idChiNhanh}")
    public ResponseEntity<List<TonKhoDTO>> getByChiNhanh(@PathVariable UUID idChiNhanh) {
        List<TonKhoDTO> list = tonKhoRepository.findByIdChiNhanh(idChiNhanh).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-product/{idSanPham}")
    public ResponseEntity<List<TonKhoDTO>> getBySanPham(@PathVariable UUID idSanPham) {
        List<TonKhoDTO> list = tonKhoRepository.findAll().stream()
                .filter(tk -> idSanPham.equals(tk.getIdSanPham()))
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/detail/{idSanPham}/{idChiNhanh}")
    public ResponseEntity<?> getDetail(@PathVariable UUID idSanPham, @PathVariable UUID idChiNhanh) {
        return tonKhoRepository.findByIdSanPhamAndIdChiNhanh(idSanPham, idChiNhanh)
                .map(tk -> ResponseEntity.ok(toDTO(tk)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody TonKho request) {
        if (tonKhoRepository.findByIdSanPhamAndIdChiNhanh(request.getIdSanPham(), request.getIdChiNhanh()).isPresent()) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Tồn kho đã tồn tại"));
        }

        TonKho tk = new TonKho();
        tk.setIdSanPham(request.getIdSanPham());
        tk.setIdChiNhanh(request.getIdChiNhanh());
        tk.setSoLuongTon(request.getSoLuongTon() != null ? request.getSoLuongTon() : 0);
        tk.setGiaVonTrungBinh(request.getGiaVonTrungBinh() != null ? request.getGiaVonTrungBinh() : BigDecimal.ZERO);
        tk.setGiaTriTon(request.getGiaTriTon() != null ? request.getGiaTriTon() : BigDecimal.ZERO);
        tk.setTonToiThieu(request.getTonToiThieu() != null ? request.getTonToiThieu() : 0);
        tk.setTonToiDa(request.getTonToiDa() != null ? request.getTonToiDa() : 0);
        tk.setHanSuDungGanNhat(request.getHanSuDungGanNhat());
        tk.setLanBienDongCuoi(LocalDateTime.now());
        tk.setNgayTao(LocalDateTime.now());
        tk.setNgayCapNhat(LocalDateTime.now());

        tonKhoRepository.save(tk);
        return ResponseEntity.ok(toDTO(tk));
    }

    @PutMapping("/{idSanPham}/{idChiNhanh}")
    public ResponseEntity<?> update(@PathVariable UUID idSanPham, @PathVariable UUID idChiNhanh, @RequestBody TonKho request) {
        return tonKhoRepository.findByIdSanPhamAndIdChiNhanh(idSanPham, idChiNhanh)
                .map(tk -> {
                    if (request.getSoLuongTon() != null) tk.setSoLuongTon(request.getSoLuongTon());
                    if (request.getGiaVonTrungBinh() != null) tk.setGiaVonTrungBinh(request.getGiaVonTrungBinh());
                    if (request.getGiaTriTon() != null) tk.setGiaTriTon(request.getGiaTriTon());
                    if (request.getTonToiThieu() != null) tk.setTonToiThieu(request.getTonToiThieu());
                    if (request.getTonToiDa() != null) tk.setTonToiDa(request.getTonToiDa());
                    if (request.getHanSuDungGanNhat() != null) tk.setHanSuDungGanNhat(request.getHanSuDungGanNhat());
                    tk.setLanBienDongCuoi(LocalDateTime.now());
                    tk.setNgayCapNhat(LocalDateTime.now());
                    tonKhoRepository.save(tk);
                    return ResponseEntity.ok(toDTO(tk));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{idSanPham}/{idChiNhanh}")
    public ResponseEntity<?> delete(@PathVariable UUID idSanPham, @PathVariable UUID idChiNhanh) {
        tonKhoRepository.findByIdSanPhamAndIdChiNhanh(idSanPham, idChiNhanh)
                .ifPresent(tk -> tonKhoRepository.delete(tk));
        return ResponseEntity.ok(new SuccessResponse("Xóa tồn kho thành công"));
    }

    private TonKhoDTO toDTO(TonKho tk) {
        TonKhoDTO dto = new TonKhoDTO();
        dto.setIdSanPham(tk.getIdSanPham());
        dto.setIdChiNhanh(tk.getIdChiNhanh());
        dto.setSoLuongTon(tk.getSoLuongTon());
        dto.setGiaVonTrungBinh(tk.getGiaVonTrungBinh());
        dto.setGiaTriTon(tk.getGiaTriTon());
        dto.setTonToiThieu(tk.getTonToiThieu());
        dto.setTonToiDa(tk.getTonToiDa());
        dto.setHanSuDungGanNhat(tk.getHanSuDungGanNhat());
        dto.setLanBienDongCuoi(tk.getLanBienDongCuoi());

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

    record ErrorResponse(String message) {}
    record SuccessResponse(String message) {}
}
