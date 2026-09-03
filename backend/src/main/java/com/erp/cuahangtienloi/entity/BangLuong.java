package com.erp.cuahangtienloi.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "bang_luong")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BangLuong {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "id_nhan_vien")
    private UUID idNhanVien;

    @Column(name = "id_chi_nhanh")
    private UUID idChiNhanh;

    @Column(name = "loai_hop_dong")
    private String loaiHopDong;

    @Column(name = "thang_nam")
    private String thangNam;

    @Column(name = "tong_gio_lam")
    private BigDecimal tongGioLam;

    @Column(name = "overtime_hours")
    private BigDecimal overtimeHours;

    @Column(name = "tong_so_ca")
    private Integer tongSoCa;

    @Column(name = "gio_dieu_chinh")
    private BigDecimal gioDieuChinh;

    @Column(name = "ly_do_dieu_chinh", columnDefinition = "TEXT")
    private String lyDoDieuChinh;

    @Column(name = "luong_theo_gio")
    private BigDecimal luongTheoGio;

    @Column(name = "luong_cung")
    private BigDecimal luongCung;

    @Column(name = "luong_cung_thuc_te")
    private BigDecimal luongCungThucTe;

    @Column(name = "tien_cong_theo_gio")
    private BigDecimal tienCongTheoGio;

    @Column(name = "tien_ot")
    private BigDecimal tienOt;

    @Column(name = "thuong")
    private BigDecimal thuong;

    @Column(name = "khau_tru")
    private BigDecimal khauTru;

    @Column(name = "tong_tien_luong")
    private BigDecimal tongTienLuong;

    @Column(name = "trang_thai")
    private String trangThai;

    @Column(name = "id_nguoi_xac_nhan")
    private UUID idNguoiXacNhan;

    @Column(name = "ngay_xac_nhan")
    private LocalDateTime ngayXacNhan;

    @Column(name = "id_nguoi_duyet_chi")
    private UUID idNguoiDuyetChi;

    @Column(name = "ngay_duyet_chi")
    private LocalDateTime ngayDuyetChi;

    @Column(name = "id_nguoi_thanh_toan")
    private UUID idNguoiThanhToan;

    @Column(name = "ngay_thanh_toan")
    private LocalDateTime ngayThanhToan;

    @Column(name = "ma_phieu_chi")
    private String maPhieuChi;

    @Column(name = "ngay_tao")
    private LocalDateTime ngayTao;

    @Column(name = "ngay_cap_nhat")
    private LocalDateTime ngayCapNhat;
}
