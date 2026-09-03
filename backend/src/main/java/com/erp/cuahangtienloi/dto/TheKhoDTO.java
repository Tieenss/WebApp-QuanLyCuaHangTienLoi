package com.erp.cuahangtienloi.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class TheKhoDTO {
    private UUID id;
    private LocalDateTime ngayPhatSinh;
    private UUID idSanPham;
    private String tenSanPham;
    private String maVach;
    private UUID idChiNhanh;
    private String tenChiNhanh;
    private String loaiGiaoDich;
    private Integer soLuong;
    private BigDecimal donGia;
    private BigDecimal thanhTien;
    private Integer tonTruoc;
    private Integer tonSau;
    private String maChungTu;
    private String nguoiThucHien;
    private LocalDate hanSuDung;
    private String ghiChu;
}
