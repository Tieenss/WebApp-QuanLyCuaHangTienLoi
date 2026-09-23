package com.erp.cuahangtienloi.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "lo_hang")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoHang {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "ma_lo", nullable = false, length = 50)
    private String maLo;

    @Column(name = "id_san_pham", nullable = false)
    private UUID idSanPham;

    @Column(name = "id_chi_nhanh", nullable = false)
    private UUID idChiNhanh;

    @Column(name = "so_luong_ton", nullable = false)
    private Integer soLuongTon;

    @Column(name = "han_su_dung")
    private LocalDate hanSuDung;

    @Column(name = "ngay_san_xuat")
    private LocalDate ngaySanXuat;

    @Column(name = "gia_von", nullable = false)
    private BigDecimal giaVon;

    @Column(name = "trang_thai", nullable = false, length = 20)
    private String trangThai; // ACTIVE, EXPIRED, DISPOSED

    @Column(name = "ngay_tao")
    private LocalDateTime ngayTao;

    @Column(name = "ngay_cap_nhat")
    private LocalDateTime ngayCapNhat;
}
