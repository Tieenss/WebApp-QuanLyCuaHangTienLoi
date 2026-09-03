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
    private final com.erp.cuahangtienloi.repository.PhieuXuatKhoRepository phieuXuatKhoRepository;
    private final com.erp.cuahangtienloi.repository.ChiTietPhieuXuatRepository chiTietPhieuXuatRepository;
    private final com.erp.cuahangtienloi.repository.ChiTietPhieuNhapRepository chiTietPhieuNhapRepository;
    // ID kho tổng - nơi nhận hàng khi tạo phiếu nhập
    private static final java.util.UUID DEFAULT_DISTRIBUTION_CENTER_ID = java.util.UUID.fromString("a1b2c3d4-0001-0000-0000-000000000001");

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
        // Lấy idNguoiNhap từ request - nếu null hoặc không tồn tại thì lấy NV bất kỳ
        UUID idNguoiNhap = request.getIdNguoiNhap();
        if (idNguoiNhap == null || !nhanVienRepository.existsById(idNguoiNhap)) {
            // Tìm thủ kho đầu tiên
            idNguoiNhap = nhanVienRepository.findAll().stream()
                    .filter(nv -> "THU_KHO".equals(nv.getVaiTro()))
                    .map(nv -> nv.getId())
                    .findFirst()
                    .orElseGet(() -> nhanVienRepository.findAll().stream()
                            .map(nv -> nv.getId())
                            .findFirst()
                            .orElse(null));
        }
        pn.setIdNguoiNhap(idNguoiNhap);
        pn.setNgayDatHang(request.getNgayDatHang() != null ? request.getNgayDatHang() : LocalDate.now());
        pn.setNgayDuKienGiao(request.getNgayDuKienGiao() != null ? request.getNgayDuKienGiao() : LocalDate.now().plusDays(3));
        // Nếu trạng thái là COMPLETED thì phải có ngay_nhan_thuc_te
        LocalDate ngayNhan = request.getNgayNhanThucTe();
        if (ngayNhan == null && "COMPLETED".equals(request.getTrangThai())) {
            ngayNhan = LocalDate.now();
        }
        pn.setNgayNhanThucTe(ngayNhan);
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

        // Tự động tạo phiếu xuất kho nội bộ tương ứng (PENDING - chờ Thủ kho duyệt)
        // Kho xuất = chi nhánh nhận hàng, Kho nhận = Kho Tổng
        if (request.getIdChiNhanh() != null) {
            com.erp.cuahangtienloi.entity.PhieuXuatKho pxk = new com.erp.cuahangtienloi.entity.PhieuXuatKho();
            pxk.setId(java.util.UUID.randomUUID());
            pxk.setMaPhieu("PX-" + java.time.LocalDate.now().toString().replace("-", "") + "-" + phieuNhapRepository.count());
            pxk.setIdChiNhanhXuat(request.getIdChiNhanh());
            pxk.setIdChiNhanhNhan(DEFAULT_DISTRIBUTION_CENTER_ID);
            // id_nguoi_tao - lấy NV đầu tiên có THU_KHO hoặc ADMIN, fallback NV đầu tiên
            java.util.UUID idNguoiTaoPhieuXuat = nhanVienRepository.findAll().stream()
                    .filter(nv -> "THU_KHO".equals(nv.getVaiTro()) || "ADMIN".equals(nv.getVaiTro()))
                    .map(nv -> nv.getId())
                    .findFirst()
                    .orElseGet(() -> nhanVienRepository.findAll().stream().findFirst().map(nv -> nv.getId()).orElse(null));
            if (idNguoiTaoPhieuXuat == null) {
                idNguoiTaoPhieuXuat = nhanVienRepository.findAll().stream()
                        .filter(nv -> nv.getId().equals(pn.getIdNguoiNhap()))
                        .map(nv -> nv.getId())
                        .findFirst()
                        .orElseGet(() -> nhanVienRepository.findAll().stream().findFirst().map(nv -> nv.getId()).orElse(pn.getIdNguoiNhap()));
            }
            pxk.setIdNguoiTao(idNguoiTaoPhieuXuat);
            pxk.setIdNguoiDuyet(idNguoiTaoPhieuXuat);
            pxk.setNgayYeuCau(java.time.LocalDate.now());
            pxk.setNgayXuatThucTe(java.time.LocalDate.now());
            pxk.setNgayNhanThucTe(java.time.LocalDate.now());
            pxk.setTrangThai("PENDING");
            pxk.setGhiChu("Tự động tạo từ phiếu nhập " + pn.getMaPhieu());
            pxk.setNgayTao(java.time.LocalDateTime.now());
            pxk.setNgayCapNhat(java.time.LocalDateTime.now());
            phieuXuatKhoRepository.save(pxk);

            // Tạo chi tiết phiếu xuất từ chi tiết phiếu nhập
            java.util.List<com.erp.cuahangtienloi.entity.ChiTietPhieuNhap> chiTietNhapList =
                    chiTietPhieuNhapRepository.findByIdPhieuNhap(pn.getId());
            int thuTu = 0;
            for (com.erp.cuahangtienloi.entity.ChiTietPhieuNhap ct : chiTietNhapList) {
                com.erp.cuahangtienloi.entity.ChiTietPhieuXuat ctx = new com.erp.cuahangtienloi.entity.ChiTietPhieuXuat();
                ctx.setId(java.util.UUID.randomUUID());
                ctx.setIdPhieuXuat(pxk.getId());
                ctx.setIdSanPham(ct.getIdSanPham());
                ctx.setSoLuongYeuCau(ct.getSoLuongNhan() != null ? ct.getSoLuongNhan() : 0);
                ctx.setSoLuongXuat(ct.getSoLuongNhan() != null ? ct.getSoLuongNhan() : 0);
                ctx.setSoLuongNhan(0);
                ctx.setDonGiaVon(ct.getDonGiaNhap() != null ? ct.getDonGiaNhap() : java.math.BigDecimal.ZERO);
                ctx.setThanhTien((ct.getDonGiaNhap() != null && ct.getSoLuongNhan() != null)
                        ? ct.getDonGiaNhap().multiply(new java.math.BigDecimal(ct.getSoLuongNhan()))
                        : java.math.BigDecimal.ZERO);
                ctx.setThuTu(thuTu++);
                chiTietPhieuXuatRepository.save(ctx);
            }
        }

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
