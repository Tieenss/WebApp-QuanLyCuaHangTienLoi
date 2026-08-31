package com.erp.cuahangtienloi.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class HoaDonDTO {
    private UUID id;
    private String maHoaDon;
    private UUID idChiNhanh;
    private String tenChiNhanh;
    private UUID idThuNgan;
    private String tenThuNgan;
    private String caLamViec;
    private LocalDateTime ngayBan;
    private String hinhThucTt;
    private String sdtThanhVien;
    private BigDecimal subTotal;
    private BigDecimal giamGia;
    private BigDecimal vatTotal;
    private BigDecimal grandTotal;
    private BigDecimal tienKhachDua;
    private BigDecimal tienThoi;
    private String trangThai;
    private UUID idNguoiHoan;
    private LocalDateTime ngayHoan;
    private String lyDoHoan;
    private String ghiChu;
}
