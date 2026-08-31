package com.erp.cuahangtienloi.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

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

    @Column(name = "ma_danh_muc", unique = true)
    private String maDanhMuc;

    @Column(name = "ten_danh_muc", unique = true)
    private String tenDanhMuc;

    @Column(name = "parent_id")
    private UUID parentId;

    @Column(columnDefinition = "TEXT")
    private String moTa;

    @Column(name = "icon_emoji")
    private String iconEmoji;

    @Column(name = "mau_hex")
    private String mauHex;

    @Column(name = "thu_tu_hien_thi")
    private Integer thuTuHienThi;

    @Column(name = "product_count")
    private Integer productCount;

    @Column(name = "dang_hoat_dong")
    private Boolean dangHoatDong;

    @Column(name = "ngay_tao")
    private LocalDateTime ngayTao;

    @Column(name = "ngay_cap_nhat")
    private LocalDateTime ngayCapNhat;
}
