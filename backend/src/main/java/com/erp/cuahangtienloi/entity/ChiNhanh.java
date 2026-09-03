package com.erp.cuahangtienloi.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.math.BigDecimal;

@Entity
@Table(name = "chi_nhanh")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ChiNhanh {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "ma_chi_nhanh", unique = true)
    private String maChiNhanh;

    @Column(name = "ten_chi_nhanh")
    private String tenChiNhanh;

    @Column(name = "dia_chi")
    private String diaChi;

    @Column(name = "dia_chi_chi_tiet")
    private String diaChiChiTiet;

    @Column(name = "tinh_thanh")
    private String tinhThanh;

    @Column(name = "quan_huyen")
    private String quanHuyen;

    @Column(name = "vung_mien")
    private String vungMien;

    @Column(name = "so_dien_thoai")
    private String soDienThoai;

    @Column(name = "gio_mo_cua")
    private String gioMoCua;

    @Column(name = "dien_tich_m2")
    private BigDecimal dienTichM2;

    @Column(name = "doanh_thu_thang")
    private Long doanhThuThang;

    @Column(name = "ngay_khai_truong")
    private LocalDate ngayKhaiTruong;

    @Column(name = "trang_thai")
    private String trangThai;

    @Column(name = "loai", nullable = false)
    private String loai;

    @Column(name = "loai_chi_nhanh")
    private String loaiChiNhanh;

    @Column(name = "id_quan_ly")
    private UUID idQuanLy;

    @Column(name = "ten_quan_ly")
    private String tenQuanLy;

    @Column(name = "dang_hoat_dong")
    private Boolean dangHoatDong;

    @Column(name = "ngay_tao")
    private LocalDateTime ngayTao;

    @Column(name = "nguoi_tao")
    private String nguoiTao;

    @Column(name = "ngay_cap_nhat")
    private LocalDateTime ngayCapNhat;

    @Column(name = "nguoi_cap_nhat")
    private String nguoiCapNhat;
}
