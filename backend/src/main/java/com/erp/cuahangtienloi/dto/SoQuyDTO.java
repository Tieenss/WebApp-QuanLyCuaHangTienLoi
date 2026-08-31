package com.erp.cuahangtienloi.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class SoQuyDTO {
    private UUID id;
    private String maChungTu;
    private String maChungTuLienQuan;
    private UUID idChiNhanh;
    private String tenChiNhanh;
    private UUID idNguoiTao;
    private String tenNguoiTao;
    private String direction;
    private String hangMuc;
    private String hinhThucTt;
    private LocalDate entryDate;
    private BigDecimal soTien;
    private String doiTuong;
    private String dienGiai;
    private BigDecimal runningBalance;
    private String trangThai;
}
