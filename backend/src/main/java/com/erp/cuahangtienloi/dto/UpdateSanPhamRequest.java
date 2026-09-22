package com.erp.cuahangtienloi.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

@Data
public class UpdateSanPhamRequest {
    private UUID idDanhMuc;
    @Size(min = 1, max = 50, message = "SKU phải từ 1 đến 50 ký tự")
    private String sku;
    @Size(min = 1, max = 50, message = "Mã vạch phải từ 1 đến 50 ký tự")
    private String maVach;
    @Size(min = 1, max = 200, message = "Tên sản phẩm phải từ 1 đến 200 ký tự")
    private String tenSanPham;
    private String donVi;
    private String imageUrl;
    private String moTa;
    private Boolean dangHoatDong;
    @DecimalMin(value = "0", message = "Giá vốn phải lớn hơn hoặc bằng 0")
    private BigDecimal giaVon;
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
