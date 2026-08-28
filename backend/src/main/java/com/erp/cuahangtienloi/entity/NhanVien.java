package com.erp.cuahangtienloi.entity;

import com.erp.cuahangtienloi.enums.VaiTro;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Bảng 2 — nhan_vien.
 * Tài khoản đăng nhập, phân quyền, thông tin ngân hàng nhận lương.
 * Tham chiếu: co_so_du_lieu.md (Khối 2).
 */
@Entity
@Table(name = "nhan_vien")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class NhanVien {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Nơi làm việc. FK → chi_nhanh.id */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_chi_nhanh")
    private ChiNhanh chiNhanh;

    @Column(name = "ten_dang_nhap", nullable = false, unique = true, length = 100)
    private String tenDangNhap;

    /** Lưu dạng Hash (BCrypt). */
    @Column(name = "mat_khau", nullable = false, length = 255)
    private String matKhau;

    @Column(name = "ho_ten", nullable = false, length = 255)
    private String hoTen;

    @Column(name = "so_dien_thoai", length = 20)
    private String soDienThoai;

    @Enumerated(EnumType.STRING)
    @Column(name = "vai_tro", nullable = false, length = 20)
    private VaiTro vaiTro;

    /** Đơn vị VNĐ. */
    @Column(name = "luong_theo_gio", nullable = false, precision = 12, scale = 0)
    private BigDecimal luongTheoGio;

    @Column(name = "so_tai_khoan", length = 30)
    private String soTaiKhoan;

    @Column(name = "ten_ngan_hang", length = 100)
    private String tenNganHang;

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
