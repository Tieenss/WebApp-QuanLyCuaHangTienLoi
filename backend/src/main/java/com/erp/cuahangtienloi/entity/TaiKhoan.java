package com.erp.cuahangtienloi.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;
import java.time.LocalDateTime;

@Entity
@Table(name = "tai_khoan")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TaiKhoan {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "ten_dang_nhap", unique = true)
    private String tenDangNhap;

    @Column(name = "mat_khau_hash")
    private String matKhauHash;

    @Column(name = "id_nhan_vien")
    private UUID idNhanVien;

    @Column(name = "trang_thai")
    private String trangThai;

    @Column(name = "ngay_tao")
    private LocalDateTime ngayTao;
}
