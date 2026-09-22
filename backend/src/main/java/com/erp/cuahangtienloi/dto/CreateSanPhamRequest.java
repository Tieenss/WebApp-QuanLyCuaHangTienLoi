package com.erp.cuahangtienloi.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

@Data
public class CreateSanPhamRequest {
    @NotNull(message = "Danh mục bắt buộc chọn")
    private UUID idDanhMuc;
    @NotBlank(message = "SKU không được để trống")
    @Size(max = 50, message = "SKU tối đa 50 ký tự")
    private String sku;
    @Size(max = 50, message = "Mã vạch tối đa 50 ký tự")
    private String maVach;
    @NotBlank(message = "Tên sản phẩm không được để trống")
    @Size(max = 200, message = "Tên sản phẩm tối đa 200 ký tự")
    private String tenSanPham;
    private String donVi;
    private String imageUrl;
    private String moTa;
    private Boolean dangHoatDong;
    @DecimalMin(value = "0", message = "Giá vốn phải lớn hơn hoặc bằng 0")
    private BigDecimal giaVon;
    @NotNull(message = "Giá bán không được để trống")
    @DecimalMin(value = "0", message = "Giá bán phải lớn hơn hoặc bằng 0")
    private BigDecimal giaBan;
    @Min(value = 0, message = "VAT phải từ 0 đến 100")
    @Max(value = 100, message = "VAT phải từ 0 đến 100")
    private Integer vatPhantram;
    private UUID idNhaCungCap;
    @Min(value = 0, message = "Tồn tối thiểu phải lớn hơn hoặc bằng 0")
    private Integer tonToiThieu;
    @Min(value = 0, message = "Tồn tối đa phải lớn hơn hoặc bằng 0")
    private Integer tonToiDa;
    private Boolean deHong;
    @Min(value = 0, message = "Số ngày hạn sử dụng phải lớn hơn hoặc bằng 0")
    private Integer hanSuDungNgay;
}
