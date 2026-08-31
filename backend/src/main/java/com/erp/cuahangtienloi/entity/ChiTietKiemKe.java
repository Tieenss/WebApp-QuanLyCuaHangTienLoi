package com.erp.cuahangtienloi.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "chi_tiet_kiem_ke")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ChiTietKiemKe {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "id_phieu_kiem_ke")
    private UUID idPhieuKiemKe;

    @Column(name = "id_san_pham")
    private UUID idSanPham;

    @Column(name = "ton_he_thong")
    private Integer tonHeThong;

    @Column(name = "ton_thuc_te")
    private Integer tonThucTe;

    @Column(name = "so_luong_lech")
    private Integer soLuongLech;

    @Column(name = "ly_do_lech", columnDefinition = "TEXT")
    private String lyDoLech;

    @Column(name = "don_gia_von")
    private BigDecimal donGiaVon;

    @Column(name = "gia_tri_lech")
    private BigDecimal giaTriLech;

    @Column(name = "ngay_tao")
    private LocalDateTime ngayTao;
}
