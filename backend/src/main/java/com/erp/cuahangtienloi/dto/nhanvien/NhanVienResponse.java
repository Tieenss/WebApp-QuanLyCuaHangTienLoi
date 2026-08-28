package com.erp.cuahangtienloi.dto.nhanvien;

import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.enums.VaiTro;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Dữ liệu nhân viên trả về. KHÔNG bao giờ chứa mật khẩu.
 */
@Getter
@Setter
public class NhanVienResponse {
    private UUID id;
    private String tenDangNhap;
    private String hoTen;
    private String soDienThoai;
    private VaiTro vaiTro;
    private UUID idChiNhanh;
    private String tenChiNhanh;
    private BigDecimal luongTheoGio;
    private String soTaiKhoan;
    private String tenNganHang;
    private Boolean dangHoatDong;
    private LocalDateTime ngayTao;

    public static NhanVienResponse from(NhanVien e) {
        NhanVienResponse r = new NhanVienResponse();
        r.id = e.getId();
        r.tenDangNhap = e.getTenDangNhap();
        r.hoTen = e.getHoTen();
        r.soDienThoai = e.getSoDienThoai();
        r.vaiTro = e.getVaiTro();
        if (e.getChiNhanh() != null) {
            r.idChiNhanh = e.getChiNhanh().getId();
            r.tenChiNhanh = e.getChiNhanh().getTenChiNhanh();
        }
        r.luongTheoGio = e.getLuongTheoGio();
        r.soTaiKhoan = e.getSoTaiKhoan();
        r.tenNganHang = e.getTenNganHang();
        r.dangHoatDong = e.getDangHoatDong();
        r.ngayTao = e.getNgayTao();
        return r;
    }
}
