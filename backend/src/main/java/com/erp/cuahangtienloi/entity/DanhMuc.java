package com.erp.cuahangtienloi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Bảng 5 — danh_muc.
 * Phân loại nhóm hàng (Nước uống, Bánh kẹo, Đồ gia dụng...).
 * Tham chiếu: co_so_du_lieu.md (Khối 3).
 */
@Entity
@Table(name = "danh_muc")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DanhMuc {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "ten_danh_muc", nullable = false, length = 255)
    private String tenDanhMuc;

    @Column(name = "ngay_tao", nullable = false, updatable = false)
    private LocalDateTime ngayTao;

    @PrePersist
    protected void onCreate() {
        if (ngayTao == null) {
            ngayTao = LocalDateTime.now();
        }
    }
}
