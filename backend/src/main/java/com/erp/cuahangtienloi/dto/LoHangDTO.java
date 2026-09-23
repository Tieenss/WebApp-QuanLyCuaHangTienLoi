package com.erp.cuahangtienloi.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class LoHangDTO {
    private UUID id;
    private String maLo;
    private UUID idSanPham;
    private String tenSanPham;
    private String sku;
    private UUID idChiNhanh;
    private String tenChiNhanh;
    private Integer soLuongTon;
    private LocalDate hanSuDung;
    private LocalDate ngaySanXuat;
    private BigDecimal giaVon;
    private String trangThai;
    private LocalDateTime ngayTao;
    private LocalDateTime ngayCapNhat;
}
