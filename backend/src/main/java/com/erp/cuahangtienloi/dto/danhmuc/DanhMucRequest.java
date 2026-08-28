package com.erp.cuahangtienloi.dto.danhmuc;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Payload tạo/sửa danh mục.
 */
@Getter
@Setter
public class DanhMucRequest {

    @NotBlank(message = "Tên danh mục không được để trống")
    @Size(max = 255, message = "Tên danh mục tối đa 255 ký tự")
    private String tenDanhMuc;
}
