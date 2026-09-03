package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.HoaDonDTO;
import com.erp.cuahangtienloi.entity.ChiNhanh;
import com.erp.cuahangtienloi.entity.ChiTietHoaDon;
import com.erp.cuahangtienloi.entity.HoaDon;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.repository.ChiNhanhRepository;
import com.erp.cuahangtienloi.repository.ChiTietHoaDonRepository;
import com.erp.cuahangtienloi.repository.HoaDonRepository;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
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
    private final ChiTietHoaDonRepository chiTietHoaDonRepository;

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

    /**
     * Tạo hoá đơn + toàn bộ dòng chi tiết trong MỘT transaction (dùng cho POS
     * checkout). Sinh mã HD-YYYYMMDD-NNNN ở Java để response có mã ngay, không
     * phụ thuộc trigger DB.
     */
    @PostMapping("/with-lines")
    @Transactional
    public ResponseEntity<?> createWithLines(@RequestBody CreateSaleRequest request) {
        if (request.getIdChiNhanh() == null) {
            return ResponseEntity.badRequest().body(new SuccessResponse("Thiếu chi nhánh"));
        }
        if (request.getLines() == null || request.getLines().isEmpty()) {
            return ResponseEntity.badRequest().body(new SuccessResponse("Giỏ hàng trống"));
        }
        if (request.getIdThuNgan() == null) {
            // Fallback: nhân viên đầu tiên (tránh FK violation)
            request.setIdThuNgan(nhanVienRepository.findAll().stream()
                    .findFirst().map(NhanVien::getId).orElse(null));
        }

        HoaDon hd = new HoaDon();
        hd.setId(UUID.randomUUID());
        hd.setMaHoaDon(sinhMaHoaDon());
        hd.setIdChiNhanh(request.getIdChiNhanh());
        hd.setIdThuNgan(request.getIdThuNgan());
        hd.setCaLamViec(request.getCaLamViec() != null ? request.getCaLamViec() : "MORNING");
        hd.setNgayBan(request.getNgayBan() != null ? request.getNgayBan() : LocalDateTime.now());
        hd.setHinhThucTt(request.getHinhThucTt() != null ? request.getHinhThucTt() : "CASH");
        hd.setSdtThanhVien(request.getSdtThanhVien());
        hd.setSubTotal(request.getSubTotal() != null ? request.getSubTotal() : BigDecimal.ZERO);
        hd.setGiamGia(request.getGiamGia() != null ? request.getGiamGia() : BigDecimal.ZERO);
        hd.setVatTotal(request.getVatTotal() != null ? request.getVatTotal() : BigDecimal.ZERO);
        hd.setGrandTotal(request.getGrandTotal() != null ? request.getGrandTotal() : BigDecimal.ZERO);
        hd.setTienKhachDua(request.getTienKhachDua());
        hd.setTienThoi(request.getTienThoi());
        hd.setTrangThai("COMPLETED");
        hd.setNgayTao(LocalDateTime.now());
        hd.setNgayCapNhat(LocalDateTime.now());
        HoaDon saved = hoaDonRepository.saveAndFlush(hd);

        List<ChiTietHoaDon> lines = new ArrayList<>();
        int thuTu = 1;
        for (SaleLine line : request.getLines()) {
            ChiTietHoaDon ct = new ChiTietHoaDon();
            ct.setId(UUID.randomUUID());
            ct.setIdHoaDon(saved.getId());
            ct.setIdSanPham(line.getIdSanPham());
            ct.setSoLuong(line.getSoLuong());
            ct.setDonGia(line.getDonGia() != null ? line.getDonGia() : BigDecimal.ZERO);
            ct.setGiamGiaDong(line.getGiamGiaDong() != null ? line.getGiamGiaDong() : BigDecimal.ZERO);
            ct.setVatPhantram(line.getVatPhantram() != null ? line.getVatPhantram() : 8);
            ct.setThanhTien(line.getThanhTien() != null ? line.getThanhTien()
                    : line.getDonGia().multiply(BigDecimal.valueOf(line.getSoLuong())));
            ct.setDonGiaVon(line.getDonGiaVon() != null ? line.getDonGiaVon() : BigDecimal.ZERO);
            ct.setThuTu(thuTu++);
            ct.setNgayTao(LocalDateTime.now());
            lines.add(ct);
        }
        chiTietHoaDonRepository.saveAll(lines);
        chiTietHoaDonRepository.flush();

        return ResponseEntity.ok(toDTO(saved));
    }

    /** Sinh mã hoá đơn HD-YYYYMMDD-NNNN (đếm số hoá đơn trong ngày hiện tại). */
    private synchronized String sinhMaHoaDon() {
        String dateStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long count = hoaDonRepository.findAll().stream()
                .filter(hd -> hd.getMaHoaDon() != null
                        && hd.getMaHoaDon().startsWith("HD-" + dateStr + "-"))
                .count();
        return "HD-" + dateStr + "-" + String.format("%04d", count + 1);
    }

    /** Request body cho /with-lines: header + danh sách dòng chi tiết. */
    public static class CreateSaleRequest {
        private UUID idChiNhanh;
        private UUID idThuNgan;
        private String caLamViec;
        private LocalDateTime ngayBan;
        private String hinhThucTt;
        private String sdtThanhVien;
        private BigDecimal subTotal;
        private BigDecimal giamGia;
        private BigDecimal vatTotal;
        private BigDecimal grandTotal;
        private BigDecimal tienKhachDua;
        private BigDecimal tienThoi;
        private List<SaleLine> lines;

        public UUID getIdChiNhanh() { return idChiNhanh; }
        public void setIdChiNhanh(UUID v) { this.idChiNhanh = v; }
        public UUID getIdThuNgan() { return idThuNgan; }
        public void setIdThuNgan(UUID v) { this.idThuNgan = v; }
        public String getCaLamViec() { return caLamViec; }
        public void setCaLamViec(String v) { this.caLamViec = v; }
        public LocalDateTime getNgayBan() { return ngayBan; }
        public void setNgayBan(LocalDateTime v) { this.ngayBan = v; }
        public String getHinhThucTt() { return hinhThucTt; }
        public void setHinhThucTt(String v) { this.hinhThucTt = v; }
        public String getSdtThanhVien() { return sdtThanhVien; }
        public void setSdtThanhVien(String v) { this.sdtThanhVien = v; }
        public BigDecimal getSubTotal() { return subTotal; }
        public void setSubTotal(BigDecimal v) { this.subTotal = v; }
        public BigDecimal getGiamGia() { return giamGia; }
        public void setGiamGia(BigDecimal v) { this.giamGia = v; }
        public BigDecimal getVatTotal() { return vatTotal; }
        public void setVatTotal(BigDecimal v) { this.vatTotal = v; }
        public BigDecimal getGrandTotal() { return grandTotal; }
        public void setGrandTotal(BigDecimal v) { this.grandTotal = v; }
        public BigDecimal getTienKhachDua() { return tienKhachDua; }
        public void setTienKhachDua(BigDecimal v) { this.tienKhachDua = v; }
        public BigDecimal getTienThoi() { return tienThoi; }
        public void setTienThoi(BigDecimal v) { this.tienThoi = v; }
        public List<SaleLine> getLines() { return lines; }
        public void setLines(List<SaleLine> lines) { this.lines = lines; }
    }

    /** Dòng chi tiết hoá đơn trong request. */
    public static class SaleLine {
        private UUID idSanPham;
        private Integer soLuong;
        private BigDecimal donGia;
        private BigDecimal giamGiaDong;
        private Integer vatPhantram;
        private BigDecimal thanhTien;
        private BigDecimal donGiaVon;

        public UUID getIdSanPham() { return idSanPham; }
        public void setIdSanPham(UUID v) { this.idSanPham = v; }
        public Integer getSoLuong() { return soLuong; }
        public void setSoLuong(Integer v) { this.soLuong = v; }
        public BigDecimal getDonGia() { return donGia; }
        public void setDonGia(BigDecimal v) { this.donGia = v; }
        public BigDecimal getGiamGiaDong() { return giamGiaDong; }
        public void setGiamGiaDong(BigDecimal v) { this.giamGiaDong = v; }
        public Integer getVatPhantram() { return vatPhantram; }
        public void setVatPhantram(Integer v) { this.vatPhantram = v; }
        public BigDecimal getThanhTien() { return thanhTien; }
        public void setThanhTien(BigDecimal v) { this.thanhTien = v; }
        public BigDecimal getDonGiaVon() { return donGiaVon; }
        public void setDonGiaVon(BigDecimal v) { this.donGiaVon = v; }
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
