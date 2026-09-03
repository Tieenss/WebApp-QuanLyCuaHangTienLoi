package com.erp.cuahangtienloi.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "nha_cung_cap")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class NhaCungCap {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "ma_ncc", unique = true)
    private String maNcc;

    @Column(name = "ten_ncc")
    private String tenNcc;

    @Column(name = "ma_so_thue")
    private String maSoThue;

    @Column(name = "so_dien_thoai")
    private String soDienThoai;

    @Column
    private String email;

    @Column
    private String diaChi;

    @Column(name = "nguoi_lien_he")
    private String nguoiLienHe;

    @Column(name = "chuc_danh_lien_he")
    private String chucDanhLienHe;

    @Column(name = "sdt_lien_he")
    private String sdtLienHe;

    @Column(name = "dieu_khoan_thanh_toan")
    private String dieuKhoanThanhToan;

    @Column(name = "so_ngay_duoc_no")
    private Integer soNgayDuocNo;

    @Column(name = "tong_cong_no")
    private BigDecimal tongCongNo;

    @Column(name = "tong_don_hang")
    private Integer tongDonHang;

    @Column(name = "dang_hoat_dong")
    private Boolean dangHoatDong;

    @Column(columnDefinition = "TEXT")
    private String ghiChu;

    @Column(name = "ngay_tao")
    private LocalDateTime ngayTao;

    @Column(name = "ngay_cap_nhat")
    private LocalDateTime ngayCapNhat;
}
