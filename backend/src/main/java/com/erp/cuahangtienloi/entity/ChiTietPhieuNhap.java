package com.erp.cuahangtienloi.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "chi_tiet_phieu_nhap")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ChiTietPhieuNhap {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "id_phieu_nhap")
    private UUID idPhieuNhap;

    @Column(name = "id_san_pham")
    private UUID idSanPham;

    @Column(name = "so_luong_dat")
    private Integer soLuongDat;

    @Column(name = "so_luong_nhan")
    private Integer soLuongNhan;

    @Column(name = "don_gia_nhap")
    private BigDecimal donGiaNhap;

    @Column(name = "vat_phantram")
    private Integer vatPhantram;

    @Column(name = "thanh_tien")
    private BigDecimal thanhTien;

    @Column(name = "han_su_dung")
    private LocalDate hanSuDung;

    @Column(name = "thu_tu")
    private Integer thuTu;

    @Column(name = "ngay_tao")
    private LocalDateTime ngayTao;
}
