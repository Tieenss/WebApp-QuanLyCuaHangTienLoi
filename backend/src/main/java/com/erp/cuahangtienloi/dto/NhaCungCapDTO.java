package com.erp.cuahangtienloi.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
public class NhaCungCapDTO {

    private UUID id;

    private String maNcc;

    private String tenNcc;

    private String maSoThue;

    private String soDienThoai;

    private String email;

    private String diaChi;

    private String nguoiLienHe;

    private String chucDanhLienHe;

    private String sdtLienHe;

    private String dieuKhoanThanhToan;

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