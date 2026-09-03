package com.erp.cuahangtienloi.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "chi_tiet_hoa_don")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ChiTietHoaDon {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "id_hoa_don")
    private UUID idHoaDon;

    @Column(name = "id_san_pham")
    private UUID idSanPham;

    @Column(name = "so_luong")
    private Integer soLuong;

    @Column(name = "don_gia")
    private BigDecimal donGia;

    @Column(name = "giam_gia_dong")
    private BigDecimal giamGiaDong;

    @Column(name = "vat_phantram")
    private Integer vatPhantram;

    @Column(name = "thanh_tien")
    private BigDecimal thanhTien;

    @Column(name = "don_gia_von")
    private BigDecimal donGiaVon;

    @Column(name = "thu_tu")
    private Integer thuTu;

    @Column(name = "ngay_tao")
    private LocalDateTime ngayTao;
}
