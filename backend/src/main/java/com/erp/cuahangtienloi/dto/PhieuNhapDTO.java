package com.erp.cuahangtienloi.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class PhieuNhapDTO {
    private UUID id;
    private String maPhieu;
    private UUID idChiNhanh;
    private String tenChiNhanh;
    private UUID idNcc;
    private String tenNcc;
    private UUID idNguoiNhap;
    private String tenNguoiNhap;
    private LocalDate ngayDatHang;
    private LocalDate ngayDuKienGiao;
    private LocalDate ngayNhanThucTe;
    private BigDecimal subTotal;
    private BigDecimal vatTotal;
    private BigDecimal giamGia;
    private BigDecimal grandTotal;
    private BigDecimal daThanhToan;
    private BigDecimal congNo;
    private String trangThai;
    private String ghiChu;
}
