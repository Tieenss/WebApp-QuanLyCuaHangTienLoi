package com.erp.cuahangtienloi.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "phieu_nhap")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PhieuNhap {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "ma_phieu", unique = true)
    private String maPhieu;

    @Column(name = "id_chi_nhanh")
    private UUID idChiNhanh;

    @Column(name = "id_ncc")
    private UUID idNcc;

    @Column(name = "id_nguoi_nhap")
    private UUID idNguoiNhap;

    @Column(name = "ngay_dat_hang")
    private LocalDate ngayDatHang;

    @Column(name = "ngay_du_kien_giao")
    private LocalDate ngayDuKienGiao;

    @Column(name = "ngay_nhan_thuc_te")
    private LocalDate ngayNhanThucTe;

    @Column(name = "sub_total")
    private BigDecimal subTotal;

    @Column(name = "vat_total")
    private BigDecimal vatTotal;

    @Column(name = "giam_gia")
    private BigDecimal giamGia;

    @Column(name = "grand_total")
    private BigDecimal grandTotal;

    @Column(name = "da_thanh_toan")
    private BigDecimal daThanhToan;

    @Column(name = "cong_no")
    private BigDecimal congNo;

    @Column(name = "trang_thai")
    private String trangThai;

    @Column(name = "ghi_chu", columnDefinition = "TEXT")
    private String ghiChu;

    @Column(name = "ngay_tao")
    private LocalDateTime ngayTao;

    @Column(name = "ngay_cap_nhat")
    private LocalDateTime ngayCapNhat;
}
