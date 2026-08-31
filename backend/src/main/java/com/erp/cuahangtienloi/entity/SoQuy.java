package com.erp.cuahangtienloi.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "so_quy")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SoQuy {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "ma_chung_tu", unique = true)
    private String maChungTu;

    @Column(name = "ma_chung_tu_lien_quan")
    private String maChungTuLienQuan;

    @Column(name = "id_chi_nhanh")
    private UUID idChiNhanh;

    @Column(name = "id_nguoi_tao")
    private UUID idNguoiTao;

    @Column
    private String direction;

    @Column
    private String hangMuc;

    @Column(name = "hinh_thuc_tt")
    private String hinhThucTt;

    @Column(name = "entry_date")
    private LocalDate entryDate;

    @Column(name = "so_tien")
    private BigDecimal soTien;

    @Column
    private String doiTuong;

    @Column(columnDefinition = "TEXT")
    private String dienGiai;

    @Column(name = "running_balance")
    private BigDecimal runningBalance;

    @Column(name = "trang_thai")
    private String trangThai;

    @Column(name = "ngay_tao")
    private LocalDateTime ngayTao;

    @Column(name = "ngay_cap_nhat")
    private LocalDateTime ngayCapNhat;
}
