package com.erp.cuahangtienloi.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "phieu_xuat_kho")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PhieuXuatKho {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "ma_phieu", unique = true)
    private String maPhieu;

    @Column(name = "id_chi_nhanh_xuat")
    private UUID idChiNhanhXuat;

    @Column(name = "id_chi_nhanh_nhan")
    private UUID idChiNhanhNhan;

    @Column(name = "id_nguoi_tao")
    private UUID idNguoiTao;

    @Column(name = "id_nguoi_duyet")
    private UUID idNguoiDuyet;

    @Column(name = "id_nguoi_nhan")
    private UUID idNguoiNhan;

    @Column(name = "ngay_yeu_cau")
    private LocalDate ngayYeuCau;

    @Column(name = "ngay_xuat_thuc_te")
    private LocalDate ngayXuatThucTe;

    @Column(name = "ngay_nhan_thuc_te")
    private LocalDate ngayNhanThucTe;

    @Column(name = "trang_thai")
    private String trangThai;

    @Column(name = "ghi_chu", columnDefinition = "TEXT")
    private String ghiChu;

    @Column(name = "ngay_tao")
    private LocalDateTime ngayTao;

    @Column(name = "ngay_cap_nhat")
    private LocalDateTime ngayCapNhat;
}
