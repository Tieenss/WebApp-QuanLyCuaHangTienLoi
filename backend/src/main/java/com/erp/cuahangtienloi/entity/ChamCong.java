package com.erp.cuahangtienloi.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "cham_cong")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ChamCong {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "id_nhan_vien")
    private UUID idNhanVien;

    @Column(name = "work_date")
    private LocalDate workDate;

    @Column(name = "ca_lam_viec")
    private String caLamViec;

    @Column(name = "check_in_at")
    private LocalDateTime checkInAt;

    @Column(name = "check_out_at")
    private LocalDateTime checkOutAt;

    @Column(name = "clock_in_at")
    private LocalDateTime clockInAt;

    @Column(name = "clock_out_at")
    private LocalDateTime clockOutAt;

    @Column(name = "di_tre_phut")
    private Integer diTrePhut;

    @Column(name = "overtime_hours")
    private BigDecimal overtimeHours;

    @Column(name = "break_hours")
    private BigDecimal breakHours;

    @Column(name = "tong_gio_lam")
    private BigDecimal tongGioLam;

    @Column(name = "trang_thai")
    private String trangThai;

    @Column(name = "da_thanh_toan")
    private Boolean daThanhToan;

    @Column(name = "ghi_chu", columnDefinition = "TEXT")
    private String ghiChu;

    @Column(name = "ngay_tao")
    private LocalDateTime ngayTao;

    @Column(name = "ngay_cap_nhat")
    private LocalDateTime ngayCapNhat;
}
