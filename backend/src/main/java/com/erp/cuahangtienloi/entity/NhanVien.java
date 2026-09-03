package com.erp.cuahangtienloi.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "nhan_vien")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class NhanVien {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "ma_nhan_vien", unique = true)
    private String maNhanVien;

    @Column(name = "ten_dang_nhap", unique = true)
    private String tenDangNhap;

    @Column(name = "ho_ten")
    private String hoTen;

    @Column(unique = true)
    private String email;

    private String soDienThoai;

    @Column(name = "mat_khau")
    private String matKhau;

    @Column(name = "vai_tro")
    private String vaiTro;

    private String viTri;

    @Column(name = "loai_hop_dong")
    private String loaiHopDong;

    @Column(name = "ca_mac_dinh")
    private String caMacDinh;

    @Column(name = "luong_theo_gio")
    private Integer luongTheoGio;

    @Column(name = "luong_cung")
    private Integer luongCung;

    @Column(name = "so_tai_khoan")
    private String soTaiKhoan;

    @Column(name = "ten_ngan_hang")
    private String tenNganHang;

    @Column(name = "ngay_vao_lam")
    private LocalDate ngayVaoLam;

    @Column(name = "id_chi_nhanh")
    private UUID idChiNhanh;

    @Column(name = "trang_thai")
    private String trangThai;

    @Column(name = "ngay_tao")
    private LocalDateTime ngayTao;

    @Column(name = "nguoi_tao")
    private String nguoiTao;

    @Column(name = "ngay_cap_nhat")
    private LocalDateTime ngayCapNhat;

    @Column(name = "nguoi_cap_nhat")
    private String nguoiCapNhat;
}
