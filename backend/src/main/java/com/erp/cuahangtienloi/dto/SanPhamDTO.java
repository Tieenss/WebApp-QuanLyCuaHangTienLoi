package com.erp.cuahangtienloi.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

@Data
public class SanPhamDTO {
    private UUID id;
    private UUID idDanhMuc;
    private String tenDanhMuc;
    private String sku;
    private String maVach;
    private String tenSanPham;
    private String donVi;
    private String imageUrl;
    private String moTa;
    private Boolean dangHoatDong;
    private BigDecimal giaVon;
    private BigDecimal giaBan;
    private Integer vatPhantram;
    private UUID idNhaCungCap;
    private String tenNhaCungCap;
    private Integer tonToiThieu;
    private Integer tonToiDa;
    private Boolean deHong;
    private Integer hanSuDungNgay;
}
