package com.erp.cuahangtienloi.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

@Data
public class UpdateSanPhamRequest {
    private UUID idDanhMuc;
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
    private Integer tonToiThieu;
    private Integer tonToiDa;
    private Boolean deHong;
    private Integer hanSuDungNgay;
}
