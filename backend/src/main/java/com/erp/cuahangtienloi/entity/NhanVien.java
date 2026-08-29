package com.erp.cuahangtienloi.entity;

import com.erp.cuahangtienloi.entity.enums.VaiTro;
import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;
import java.time.LocalDateTime;
import java.math.BigDecimal;

@Entity
@Table(name = "nhan_vien")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NhanVien {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_chi_nhanh")
    private ChiNhanh chiNhanh;

    @Column(name = "ten_dang_nhap", unique = true, nullable = false, length = 100)
    private String tenDangNhap;

    @Column(name = "mat_khau", nullable = false)
    private String matKhau;

    @Column(name = "ho_ten", nullable = false)
    private String hoTen;

    @Column(name = "so_dien_thoai", length = 20)
    private String soDienThoai;

    @Enumerated(EnumType.STRING)
    @Column(name = "vai_tro", nullable = false, length = 20)
    private VaiTro vaiTro;

    @Column(name = "luong_theo_gio", nullable = false, precision = 12, scale = 0)
    private BigDecimal luongTheoGio;

    @Column(name = "so_tai_khoan", length = 30)
    private String soTaiKhoan;

    @Column(name = "ten_ngan_hang", length = 100)
    private String tenNganHang;

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
