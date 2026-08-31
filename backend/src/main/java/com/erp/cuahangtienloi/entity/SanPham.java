package com.erp.cuahangtienloi.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "san_pham")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SanPham {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "id_danh_muc")
    private UUID idDanhMuc;

    @Column(unique = true)
    private String sku;

    @Column(name = "ma_vach", unique = true)
    private String maVach;

    @Column(name = "ten_san_pham")
    private String tenSanPham;

    @Column(name = "don_vi")
    private String donVi;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(columnDefinition = "TEXT")
    private String moTa;

    @Column(name = "dang_hoat_dong")
    private Boolean dangHoatDong;

    @Column(name = "gia_von")
    private BigDecimal giaVon;

    @Column(name = "gia_ban")
    private BigDecimal giaBan;

    @Column(name = "vat_phantram")
    private Integer vatPhantram;

    @Column(name = "id_nha_cung_cap")
    private UUID idNhaCungCap;

    @Column(name = "ton_toi_thieu")
    private Integer tonToiThieu;

    @Column(name = "ton_toi_da")
    private Integer tonToiDa;

    @Column(name = "de_hong")
    private Boolean deHong;

    @Column(name = "han_su_dung_ngay")
    private Integer hanSuDungNgay;

    @Column(name = "ngay_tao")
    private LocalDateTime ngayTao;

    @Column(name = "ngay_cap_nhat")
    private LocalDateTime ngayCapNhat;
}
