package com.erp.cuahangtienloi.entity;

import com.erp.cuahangtienloi.entity.enums.LoaiChiNhanh;
import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;
import java.time.LocalDateTime;

@Entity
@Table(name = "chi_nhanh")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChiNhanh {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "ten_chi_nhanh", nullable = false)
    private String tenChiNhanh;

    @Column(name = "dia_chi", length = 500)
    private String diaChi;

    @Enumerated(EnumType.STRING)
    @Column(name = "loai", nullable = false, length = 20)
    private LoaiChiNhanh loai;

    @Builder.Default
    @Column(name = "dang_hoat_dong", nullable = false)
    private Boolean dangHoatDong = true;

    @Column(name = "ngay_tao", updatable = false)
    private LocalDateTime ngayTao;

    @PrePersist
    protected void onCreate() {
        this.ngayTao = LocalDateTime.now();
        if (this.dangHoatDong == null) {
            this.dangHoatDong = true;
        }
    }
}
