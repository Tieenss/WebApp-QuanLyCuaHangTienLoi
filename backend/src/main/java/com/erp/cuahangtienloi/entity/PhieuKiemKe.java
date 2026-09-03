package com.erp.cuahangtienloi.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "phieu_kiem_ke")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PhieuKiemKe {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "ma_phieu", unique = true)
    private String maPhieu;

    @Column(name = "id_chi_nhanh", nullable = false)
    private UUID idChiNhanh;

    @Column(name = "id_nguoi_tao")
    private UUID idNguoiTao;

    @Column(name = "id_nguoi_duyet")
    private UUID idNguoiDuyet;

    @Column(name = "ngay_kiem_ke")
    private LocalDate ngayKiemKe;

    @Column(name = "ngay_can_bang")
    private LocalDate ngayCanBang;

    @Column(name = "trang_thai")
    private String trangThai;

    @Column(name = "ghi_chu", columnDefinition = "TEXT")
    private String ghiChu;

    @Column(name = "ngay_tao")
    private LocalDateTime ngayTao;

    @Column(name = "ngay_cap_nhat")
    private LocalDateTime ngayCapNhat;
}
