package com.erp.cuahangtienloi.dto.sanpham;

import com.erp.cuahangtienloi.entity.SanPham;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Dữ liệu sản phẩm trả về.
 */
@Getter
@Setter
public class SanPhamResponse {
    private UUID id;
    private String maVach;
    private String tenSanPham;
    private UUID idDanhMuc;
    private String tenDanhMuc;
    private BigDecimal giaVon;
    private BigDecimal giaBan;
    private Boolean dangHoatDong;
    private LocalDateTime ngayTao;

    public static SanPhamResponse from(SanPham e) {
        SanPhamResponse r = new SanPhamResponse();
        r.id = e.getId();
        r.maVach = e.getMaVach();
        r.tenSanPham = e.getTenSanPham();
        if (e.getDanhMuc() != null) {
            r.idDanhMuc = e.getDanhMuc().getId();
            r.tenDanhMuc = e.getDanhMuc().getTenDanhMuc();
        }
        r.giaVon = e.getGiaVon();
        r.giaBan = e.getGiaBan();
        r.dangHoatDong = e.getDangHoatDong();
        r.ngayTao = e.getNgayTao();
        return r;
    }
}
