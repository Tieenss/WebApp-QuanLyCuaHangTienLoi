package com.erp.cuahangtienloi.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class TonKhoDTO {
    private UUID idSanPham;
    private String tenSanPham;
    private String maVach;
    private UUID idChiNhanh;
    private String tenChiNhanh;
    private Integer soLuongTon;
    private BigDecimal giaVonTrungBinh;
    private BigDecimal giaTriTon;
    private Integer tonToiThieu;
    private Integer tonToiDa;
    private LocalDate hanSuDungGanNhat;
    private LocalDateTime lanBienDongCuoi;
}
