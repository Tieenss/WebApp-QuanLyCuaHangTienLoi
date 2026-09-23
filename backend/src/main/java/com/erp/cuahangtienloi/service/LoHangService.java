package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.LoHangDTO;
import com.erp.cuahangtienloi.entity.ChiNhanh;
import com.erp.cuahangtienloi.entity.LoHang;
import com.erp.cuahangtienloi.entity.SanPham;
import com.erp.cuahangtienloi.entity.TonKho;
import com.erp.cuahangtienloi.repository.ChiNhanhRepository;
import com.erp.cuahangtienloi.repository.LoHangRepository;
import com.erp.cuahangtienloi.repository.SanPhamRepository;
import com.erp.cuahangtienloi.repository.TonKhoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class LoHangService {

    private final LoHangRepository loHangRepository;
    private final TonKhoRepository tonKhoRepository;
    private final SanPhamRepository sanPhamRepository;
    private final ChiNhanhRepository chiNhanhRepository;
    private final JdbcTemplate jdbcTemplate;

    /**
     * Tạo mới hoặc cộng dồn vào lô hàng khi nhập kho.
     */
    @Transactional
    public LoHang taoHoacCapNhatLoHang(
            UUID idSanPham,
            UUID idChiNhanh,
            int soLuong,
            BigDecimal giaVon,
            LocalDate hanSuDung,
            LocalDate ngaySanXuat,
            String maLoTuyChon) {

        if (soLuong <= 0) return null;

        String maLo = (maLoTuyChon != null && !maLoTuyChon.trim().isEmpty())
                ? maLoTuyChon.trim()
                : generateMaLo();

        LocalDate finalHanSuDung = hanSuDung;
        if (finalHanSuDung == null) {
            SanPham sp = sanPhamRepository.findById(idSanPham).orElse(null);
            if (sp != null && sp.getHanSuDungNgay() != null && sp.getHanSuDungNgay() >= 0) {
                LocalDate baseDate = (ngaySanXuat != null) ? ngaySanXuat : LocalDate.now();
                finalHanSuDung = baseDate.plusDays(sp.getHanSuDungNgay());
            }
        }

        Optional<LoHang> existing = loHangRepository.findByMaLoAndIdChiNhanh(maLo, idChiNhanh);
        LoHang loHang;
        if (existing.isPresent()) {
            loHang = existing.get();
            loHang.setSoLuongTon(loHang.getSoLuongTon() + soLuong);
            if (finalHanSuDung != null) loHang.setHanSuDung(finalHanSuDung);
            if (ngaySanXuat != null) loHang.setNgaySanXuat(ngaySanXuat);
            loHang.setTrangThai("ACTIVE");
            loHang.setNgayCapNhat(LocalDateTime.now());
        } else {
            loHang = LoHang.builder()
                    .id(UUID.randomUUID())
                    .maLo(maLo)
                    .idSanPham(idSanPham)
                    .idChiNhanh(idChiNhanh)
                    .soLuongTon(soLuong)
                    .hanSuDung(finalHanSuDung)
                    .ngaySanXuat(ngaySanXuat)
                    .giaVon(giaVon != null ? giaVon : BigDecimal.ZERO)
                    .trangThai("ACTIVE")
                    .ngayTao(LocalDateTime.now())
                    .ngayCapNhat(LocalDateTime.now())
                    .build();
        }

        LoHang saved = loHangRepository.save(loHang);
        dongBoHanSuDungGanNhat(idSanPham, idChiNhanh);
        return saved;
    }

    /**
     * Xuất kho theo nguyên tắc FEFO (Hết hạn trước xuất trước).
     * Duyệt các lô còn tồn theo HSD tăng dần, trừ số lượng tương ứng.
     * Trả về thông tin HSD của lô được xuất (dùng để lưu vào phiếu xuất kho).
     */
    @Transactional
    public LocalDate xuatKhoFEFO(UUID idSanPham, UUID idChiNhanh, int soLuongCanXuat) {
        if (soLuongCanXuat <= 0) return null;

        List<LoHang> activeLots = loHangRepository.findActiveLotsForUpdate(idChiNhanh, idSanPham);
        int remaining = soLuongCanXuat;
        LocalDate earliestExpiryUsed = null;

        for (LoHang lot : activeLots) {
            if (remaining <= 0) break;

            if (earliestExpiryUsed == null && lot.getHanSuDung() != null) {
                earliestExpiryUsed = lot.getHanSuDung();
            }

            int currentLotQty = lot.getSoLuongTon();
            if (currentLotQty <= remaining) {
                lot.setSoLuongTon(0);
                remaining -= currentLotQty;
            } else {
                lot.setSoLuongTon(currentLotQty - remaining);
                remaining = 0;
            }
            lot.setNgayCapNhat(LocalDateTime.now());
            loHangRepository.save(lot);
        }

        dongBoHanSuDungGanNhat(idSanPham, idChiNhanh);
        return earliestExpiryUsed;
    }

    /**
     * Xuất huỷ riêng 1 lô hàng bị quá hạn/hư hỏng.
     * Bảo toàn nguyên vẹn số lượng của các lô khác.
     */
    @Transactional
    public void huyLoHang(UUID idLoHang, String nguoiThucHien, String lyDo) {
        LoHang lo = loHangRepository.findById(idLoHang)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lô hàng"));

        if (lo.getSoLuongTon() <= 0) {
            throw new IllegalArgumentException("Lô hàng này hiện không còn tồn kho để huỷ");
        }

        int soLuongHuy = lo.getSoLuongTon();
        lo.setSoLuongTon(0);
        lo.setTrangThai("DISPOSED");
        lo.setNgayCapNhat(LocalDateTime.now());
        loHangRepository.save(lo);

        String maChungTu = "HUY-LO-" + LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"))
                + "-" + (int)(100 + Math.random() * 900);
        String ghiChu = "Huỷ lô " + lo.getMaLo() + (lyDo != null ? ": " + lyDo : " (hết hạn/hư hỏng)");

        jdbcTemplate.query(
                "SELECT fn_ghi_the_kho_va_dieu_chinh_ton(?::uuid, ?::uuid, 'DISPOSAL_OUT'::varchar, ?::integer, ?::numeric, ?::varchar, ?::varchar, ?::date, ?::text, NOW()::timestamp)",
                rs -> { },
                lo.getIdSanPham(), lo.getIdChiNhanh(), -soLuongHuy, lo.getGiaVon(),
                maChungTu, nguoiThucHien != null ? nguoiThucHien : "Hệ thống", lo.getHanSuDung(), ghiChu);

        dongBoHanSuDungGanNhat(lo.getIdSanPham(), lo.getIdChiNhanh());
    }

    /**
     * Lấy danh sách toàn bộ lô hàng của một sản phẩm tại một chi nhánh.
     */
    @Transactional(readOnly = true)
    public List<LoHangDTO> getDanhSachLoHang(UUID idChiNhanh, UUID idSanPham) {
        List<LoHang> list = loHangRepository.findByIdChiNhanhAndIdSanPhamOrderByHanSuDungAscNgayTaoAsc(idChiNhanh, idSanPham);
        SanPham sp = sanPhamRepository.findById(idSanPham).orElse(null);
        ChiNhanh cn = chiNhanhRepository.findById(idChiNhanh).orElse(null);

        return list.stream().map(lo -> {
            LoHangDTO dto = new LoHangDTO();
            dto.setId(lo.getId());
            dto.setMaLo(lo.getMaLo());
            dto.setIdSanPham(lo.getIdSanPham());
            dto.setTenSanPham(sp != null ? sp.getTenSanPham() : "");
            dto.setSku(sp != null ? sp.getSku() : "");
            dto.setIdChiNhanh(lo.getIdChiNhanh());
            dto.setTenChiNhanh(cn != null ? cn.getTenChiNhanh() : "");
            dto.setSoLuongTon(lo.getSoLuongTon());
            dto.setHanSuDung(lo.getHanSuDung());
            dto.setNgaySanXuat(lo.getNgaySanXuat());
            dto.setGiaVon(lo.getGiaVon());
            dto.setTrangThai(lo.getTrangThai());
            dto.setNgayTao(lo.getNgayTao());
            dto.setNgayCapNhat(lo.getNgayCapNhat());
            return dto;
        }).toList();
    }

    /**
     * Tự động đồng bộ HSD gần nhất của sản phẩm trong bảng ton_kho
     * dựa trên HSD nhỏ nhất của các lô còn tồn kho > 0.
     */
    public void dongBoHanSuDungGanNhat(UUID idSanPham, UUID idChiNhanh) {
        List<LoHang> activeLots = loHangRepository
                .findByIdChiNhanhAndIdSanPhamAndSoLuongTonGreaterThanAndTrangThaiOrderByHanSuDungAscNgayTaoAsc(
                        idChiNhanh, idSanPham, 0, "ACTIVE");

        LocalDate nextExpiry = activeLots.stream()
                .map(LoHang::getHanSuDung)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);

        jdbcTemplate.update(
                "UPDATE ton_kho SET han_su_dung_gan_nhat = ?, ngay_cap_nhat = NOW() WHERE id_san_pham = ? AND id_chi_nhanh = ?",
                nextExpiry, idSanPham, idChiNhanh);
    }

    private String generateMaLo() {
        return "LOT-" + LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"))
                + "-" + (int)(1000 + Math.random() * 9000);
    }
}
