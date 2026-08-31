package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.HoaDonDTO;
import com.erp.cuahangtienloi.entity.ChiNhanh;
import com.erp.cuahangtienloi.entity.HoaDon;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.repository.ChiNhanhRepository;
import com.erp.cuahangtienloi.repository.HoaDonRepository;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/hoa-don")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class HoaDonController {

    private final HoaDonRepository hoaDonRepository;
    private final ChiNhanhRepository chiNhanhRepository;
    private final NhanVienRepository nhanVienRepository;

    @GetMapping
    public ResponseEntity<List<HoaDonDTO>> getAll() {
        List<HoaDonDTO> list = hoaDonRepository.findAll().stream()
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable UUID id) {
        return hoaDonRepository.findById(id)
                .map(hd -> ResponseEntity.ok(toDTO(hd)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-branch/{idChiNhanh}")
    public ResponseEntity<List<HoaDonDTO>> getByChiNhanh(@PathVariable UUID idChiNhanh) {
        List<HoaDonDTO> list = hoaDonRepository.findByIdChiNhanh(idChiNhanh).stream()
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-cashier/{idThuNgan}")
    public ResponseEntity<List<HoaDonDTO>> getByThuNgan(@PathVariable UUID idThuNgan) {
        List<HoaDonDTO> list = hoaDonRepository.findByIdThuNgan(idThuNgan).stream()
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-status/{trangThai}")
    public ResponseEntity<List<HoaDonDTO>> getByStatus(@PathVariable String trangThai) {
        List<HoaDonDTO> list = hoaDonRepository.findByTrangThai(trangThai).stream()
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody HoaDon request) {
        HoaDon hd = new HoaDon();
        hd.setId(UUID.randomUUID());
        hd.setMaHoaDon(request.getMaHoaDon());
        hd.setIdChiNhanh(request.getIdChiNhanh());
        hd.setIdThuNgan(request.getIdThuNgan());
        hd.setCaLamViec(request.getCaLamViec());
        hd.setNgayBan(request.getNgayBan() != null ? request.getNgayBan() : LocalDateTime.now());
        hd.setHinhThucTt(request.getHinhThucTt());
        hd.setSdtThanhVien(request.getSdtThanhVien());
        hd.setSubTotal(request.getSubTotal());
        hd.setGiamGia(request.getGiamGia());
        hd.setVatTotal(request.getVatTotal());
        hd.setGrandTotal(request.getGrandTotal());
        hd.setTienKhachDua(request.getTienKhachDua());
        hd.setTienThoi(request.getTienThoi());
        hd.setTrangThai(request.getTrangThai() != null ? request.getTrangThai() : "COMPLETED");
        hd.setNgayTao(LocalDateTime.now());
        hd.setNgayCapNhat(LocalDateTime.now());

        hoaDonRepository.save(hd);
        return ResponseEntity.ok(toDTO(hd));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody HoaDon request) {
        return hoaDonRepository.findById(id)
                .map(hd -> {
                    if (request.getMaHoaDon() != null) hd.setMaHoaDon(request.getMaHoaDon());
                    if (request.getCaLamViec() != null) hd.setCaLamViec(request.getCaLamViec());
                    if (request.getHinhThucTt() != null) hd.setHinhThucTt(request.getHinhThucTt());
                    if (request.getSdtThanhVien() != null) hd.setSdtThanhVien(request.getSdtThanhVien());
                    if (request.getSubTotal() != null) hd.setSubTotal(request.getSubTotal());
                    if (request.getGiamGia() != null) hd.setGiamGia(request.getGiamGia());
                    if (request.getVatTotal() != null) hd.setVatTotal(request.getVatTotal());
                    if (request.getGrandTotal() != null) hd.setGrandTotal(request.getGrandTotal());
                    if (request.getTienKhachDua() != null) hd.setTienKhachDua(request.getTienKhachDua());
                    if (request.getTienThoi() != null) hd.setTienThoi(request.getTienThoi());
                    if (request.getTrangThai() != null) hd.setTrangThai(request.getTrangThai());
                    if ("REFUNDED".equals(request.getTrangThai())) {
                        hd.setIdNguoiHoan(request.getIdNguoiHoan());
                        hd.setNgayHoan(LocalDateTime.now());
                        hd.setLyDoHoan(request.getLyDoHoan());
                    }
                    if (request.getGhiChu() != null) hd.setGhiChu(request.getGhiChu());
                    hd.setNgayCapNhat(LocalDateTime.now());
                    hoaDonRepository.save(hd);
                    return ResponseEntity.ok(toDTO(hd));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (hoaDonRepository.existsById(id)) {
            hoaDonRepository.deleteById(id);
            return ResponseEntity.ok(new SuccessResponse("Xóa hóa đơn thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    private HoaDonDTO toDTO(HoaDon hd) {
        HoaDonDTO dto = new HoaDonDTO();
        dto.setId(hd.getId());
        dto.setMaHoaDon(hd.getMaHoaDon());
        dto.setIdChiNhanh(hd.getIdChiNhanh());
        dto.setIdThuNgan(hd.getIdThuNgan());
        dto.setCaLamViec(hd.getCaLamViec());
        dto.setNgayBan(hd.getNgayBan());
        dto.setHinhThucTt(hd.getHinhThucTt());
        dto.setSdtThanhVien(hd.getSdtThanhVien());
        dto.setSubTotal(hd.getSubTotal());
        dto.setGiamGia(hd.getGiamGia());
        dto.setVatTotal(hd.getVatTotal());
        dto.setGrandTotal(hd.getGrandTotal());
        dto.setTienKhachDua(hd.getTienKhachDua());
        dto.setTienThoi(hd.getTienThoi());
        dto.setTrangThai(hd.getTrangThai());
        dto.setIdNguoiHoan(hd.getIdNguoiHoan());
        dto.setNgayHoan(hd.getNgayHoan());
        dto.setLyDoHoan(hd.getLyDoHoan());
        dto.setGhiChu(hd.getGhiChu());

        if (hd.getIdChiNhanh() != null) {
            chiNhanhRepository.findById(hd.getIdChiNhanh())
                    .ifPresent(cn -> dto.setTenChiNhanh(cn.getTenChiNhanh()));
        }
        if (hd.getIdThuNgan() != null) {
            nhanVienRepository.findById(hd.getIdThuNgan())
                    .ifPresent(nv -> dto.setTenThuNgan(nv.getHoTen()));
        }

        return dto;
    }

    record SuccessResponse(String message) {}
}
