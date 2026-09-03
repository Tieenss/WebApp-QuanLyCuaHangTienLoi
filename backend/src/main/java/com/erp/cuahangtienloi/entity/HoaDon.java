package com.erp.cuahangtienloi.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "hoa_don")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class HoaDon {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "ma_hoa_don", unique = true)
    private String maHoaDon;

    @Column(name = "id_chi_nhanh")
    private UUID idChiNhanh;

    @Column(name = "id_thu_ngan")
    private UUID idThuNgan;

    @Column(name = "ca_lam_viec")
    private String caLamViec;

    @Column(name = "ngay_ban")
    private LocalDateTime ngayBan;

    @Column(name = "hinh_thuc_tt")
    private String hinhThucTt;

    @Column(name = "sdt_thanh_vien")
    private String sdtThanhVien;

    @Column(name = "sub_total")
    private BigDecimal subTotal;

    @Column(name = "giam_gia")
    private BigDecimal giamGia;

    @Column(name = "vat_total")
    private BigDecimal vatTotal;

    @Column(name = "grand_total")
    private BigDecimal grandTotal;

    @Column(name = "tien_khach_dua")
    private BigDecimal tienKhachDua;

    @Column(name = "tien_thoi")
    private BigDecimal tienThoi;

    @Column(name = "trang_thai")
    private String trangThai;

    @Column(name = "id_nguoi_hoan")
    private UUID idNguoiHoan;

    @Column(name = "ngay_hoan")
    private LocalDateTime ngayHoan;

    @Column(name = "ly_do_hoan", columnDefinition = "TEXT")
    private String lyDoHoan;

    @Column(name = "ghi_chu", columnDefinition = "TEXT")
    private String ghiChu;

    @Column(name = "ngay_tao")
    private LocalDateTime ngayTao;

    @Column(name = "ngay_cap_nhat")
    private LocalDateTime ngayCapNhat;
}
