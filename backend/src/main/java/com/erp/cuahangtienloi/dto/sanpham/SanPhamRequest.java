package com.erp.cuahangtienloi.dto.sanpham;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Payload tạo/sửa sản phẩm.
 * Rule (AC #2): mã vạch unique (kiểm tra ở service), giá vốn & giá bán > 0.
 */
@Getter
@Setter
public class SanPhamRequest {

    @NotBlank(message = "Mã vạch không được để trống")
    @Size(max = 50, message = "Mã vạch tối đa 50 ký tự")
    private String maVach;

    @NotBlank(message = "Tên sản phẩm không được để trống")
    @Size(max = 255, message = "Tên sản phẩm tối đa 255 ký tự")
    private String tenSanPham;

    @NotNull(message = "Danh mục không được để trống")
    private UUID idDanhMuc;

    @NotNull(message = "Giá vốn không được để trống")
    @DecimalMin(value = "0", inclusive = false, message = "Giá vốn phải lớn hơn 0")
    private BigDecimal giaVon;

    @NotNull(message = "Giá bán không được để trống")
    @DecimalMin(value = "0", inclusive = false, message = "Giá bán phải lớn hơn 0")
    private BigDecimal giaBan;
}
