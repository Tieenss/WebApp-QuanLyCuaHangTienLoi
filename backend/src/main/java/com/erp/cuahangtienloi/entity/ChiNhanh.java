package com.erp.cuahangtienloi.entity;

import com.erp.cuahangtienloi.enums.LoaiChiNhanh;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Bảng 1 — chi_nhanh.
 * Lưu danh sách tất cả địa điểm trong chuỗi. Kho Tổng cũng là 1 chi nhánh (loai = KHO_TONG).
 * Tham chiếu: co_so_du_lieu.md (Khối 1).
 */
@Entity
@Table(name = "chi_nhanh")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ChiNhanh {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "ten_chi_nhanh", nullable = false, length = 255)
    private String tenChiNhanh;

    @Column(name = "dia_chi", length = 500)
    private String diaChi;

    @Enumerated(EnumType.STRING)
    @Column(name = "loai", nullable = false, length = 20)
    private LoaiChiNhanh loai;

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
