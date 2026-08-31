package com.erp.cuahangtienloi.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class BangLuongDTO {
    private UUID id;
    private UUID idNhanVien;
    private String tenNhanVien;
    private UUID idChiNhanh;
    private String tenChiNhanh;
    private String loaiHopDong;
    private String thangNam;
    private BigDecimal tongGioLam;
    private BigDecimal overtimeHours;
    private Integer tongSoCa;
    private BigDecimal gioDieuChinh;
    private String lyDoDieuChinh;
    private BigDecimal luongTheoGio;
    private BigDecimal luongCung;
    private BigDecimal luongCungThucTe;
    private BigDecimal tienCongTheoGio;
    private BigDecimal tienOt;
    private BigDecimal thuong;
    private BigDecimal khauTru;
    private BigDecimal tongTienLuong;
    private String trangThai;
    private UUID idNguoiXacNhan;
    private String tenNguoiXacNhan;
    private LocalDateTime ngayXacNhan;
    private UUID idNguoiDuyetChi;
    private String tenNguoiDuyetChi;
    private LocalDateTime ngayDuyetChi;
    private UUID idNguoiThanhToan;
    private String tenNguoiThanhToan;
    private LocalDateTime ngayThanhToan;
    private String maPhieuChi;
}
