package com.erp.cuahangtienloi.entity;

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
public class ChiNhanh {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "ma_chi_nhanh", unique = true)
    private String maChiNhanh;

    @Column(name = "ten_chi_nhanh")
    private String tenChiNhanh;

    @Column(name = "dia_chi")
    private String diaChi;

    @Column(name = "so_dien_thoai")
    private String soDienThoai;

    @Column(name = "trang_thai")
    private String trangThai;

    @Column(name = "loai_chi_nhanh")
    private String loaiChiNhanh;

    @Column(name = "ngay_tao")
    private LocalDateTime ngayTao;

    @Column(name = "nguoi_tao")
    private String nguoiTao;

    @Column(name = "ngay_cap_nhat")
    private LocalDateTime ngayCapNhat;

    @Column(name = "nguoi_cap_nhat")
    private String nguoiCapNhat;
}
