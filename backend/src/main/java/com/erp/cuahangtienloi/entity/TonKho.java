package com.erp.cuahangtienloi.entity;

import jakarta.persistence.*;
import lombok.*;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ton_kho")
@IdClass(TonKho.TonKhoId.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TonKho {
    @Id
    @Column(name = "id_san_pham")
    private UUID idSanPham;

    @Id
    @Column(name = "id_chi_nhanh")
    private UUID idChiNhanh;

    @Column(name = "so_luong_ton")
    private Integer soLuongTon;

    @Column(name = "gia_von_trung_binh")
    private BigDecimal giaVonTrungBinh;

    @Column(name = "gia_tri_ton")
    private BigDecimal giaTriTon;

    @Column(name = "ton_toi_thieu")
    private Integer tonToiThieu;

    @Column(name = "ton_toi_da")
    private Integer tonToiDa;

    @Column(name = "han_su_dung_gan_nhat")
    private LocalDate hanSuDungGanNhat;

    @Column(name = "lan_bien_dong_cuoi")
    private LocalDateTime lanBienDongCuoi;

    @Column(name = "ngay_tao")
    private LocalDateTime ngayTao;

    @Column(name = "ngay_cap_nhat")
    private LocalDateTime ngayCapNhat;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TonKhoId implements Serializable {
        private UUID idSanPham;
        private UUID idChiNhanh;
    }
}
