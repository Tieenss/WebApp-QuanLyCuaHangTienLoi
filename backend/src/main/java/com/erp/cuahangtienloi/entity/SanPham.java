package com.erp.cuahangtienloi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Bảng 6 — san_pham.
 * Thông tin sản phẩm dùng chung toàn hệ thống.
 * Tham chiếu: co_so_du_lieu.md (Khối 3).
 */
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_danh_muc")
    private DanhMuc danhMuc;

    /** Barcode. */
    @Column(name = "ma_vach", nullable = false, unique = true, length = 50)
    private String maVach;

    @Column(name = "ten_san_pham", nullable = false, length = 255)
    private String tenSanPham;

    /** Giá vốn trung bình (tính lại khi nhập hàng - BQGQ). */
    @Column(name = "gia_von", nullable = false, precision = 12, scale = 0)
    private BigDecimal giaVon;

    /** Giá bán lẻ. */
    @Column(name = "gia_ban", nullable = false, precision = 12, scale = 0)
    private BigDecimal giaBan;

    @Column(name = "dang_hoat_dong", nullable = false)
    private Boolean dangHoatDong = true;

    @Column(name = "ngay_tao", nullable = false, updatable = false)
    private LocalDateTime ngayTao;

    @PrePersist
    protected void onCreate() {
        if (ngayTao == null) {
            ngayTao = LocalDateTime.now();
        }
        if (dangHoatDong == null) {
            dangHoatDong = true;
        }
    }
}
