package com.erp.cuahangtienloi.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "the_kho")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TheKho {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "ngay_phat_sinh")
    private LocalDateTime ngayPhatSinh;

    @Column(name = "id_san_pham")
    private UUID idSanPham;

    @Column(name = "id_chi_nhanh")
    private UUID idChiNhanh;

    @Column(name = "loai_giao_dich")
    private String loaiGiaoDich;

    @Column(name = "so_luong")
    private Integer soLuong;

    @Column(name = "don_gia")
    private BigDecimal donGia;

    @Column(name = "thanh_tien")
    private BigDecimal thanhTien;

    @Column(name = "ton_truoc")
    private Integer tonTruoc;

    @Column(name = "ton_sau")
    private Integer tonSau;

    @Column(name = "ma_chung_tu")
    private String maChungTu;

    @Column(name = "nguoi_thuc_hien")
    private String nguoiThucHien;

    @Column(name = "han_su_dung")
    private LocalDate hanSuDung;

    @Column(name = "ghi_chu", columnDefinition = "TEXT")
    private String ghiChu;

    @Column(name = "ngay_tao")
    private LocalDateTime ngayTao;
}
