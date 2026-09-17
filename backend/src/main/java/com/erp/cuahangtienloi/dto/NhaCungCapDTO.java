package com.erp.cuahangtienloi.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
public class NhaCungCapDTO {

    private UUID id;

    @Size(max = 20, message = "Mã NCC tối đa 20 ký tự")
    private String maNcc;

    @Size(min = 1, max = 255, message = "Tên NCC tối đa 255 ký tự và không được rỗng")
    private String tenNcc;

    private String maSoThue;

    @Pattern(regexp = "^$|^0\\d{9,10}$", message = "Số điện thoại không hợp lệ")
    private String soDienThoai;

    @Email(message = "Email không đúng định dạng")
    private String email;

    private String diaChi;

    private String nguoiLienHe;

    private String chucDanhLienHe;

    @Pattern(regexp = "^$|^0\\d{9,10}$", message = "Số điện thoại liên hệ không hợp lệ")
    private String sdtLienHe;

    private String dieuKhoanThanhToan;

    @Min(value = 0, message = "Số ngày được nợ phải lớn hơn hoặc bằng 0")
    private Integer soNgayDuocNo;

    private BigDecimal tongCongNo;

    private Integer tongDonHang;

    private Boolean dangHoatDong;

    private String ghiChu;

    /**
     * Dùng khi CREATE / UPDATE.
     * Frontend gửi danh sách UUID của danh mục.
     */
    private List<UUID> categoryIds;

    /**
     * Dùng khi GET.
     * Backend trả thông tin danh mục để frontend hiển thị.
     */
    private List<DanhMucSummary> categories;

    @Data
    public static class DanhMucSummary {

        private UUID id;

        private String tenDanhMuc;

        private String iconEmoji;

        private String mauHex;
    }
}
