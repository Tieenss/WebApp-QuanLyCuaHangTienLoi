package com.erp.cuahangtienloi.dto.nhacungcap;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Payload tạo/sửa nhà cung cấp.
 */
@Getter
@Setter
public class NhaCungCapRequest {

    @NotBlank(message = "Tên nhà cung cấp không được để trống")
    @Size(max = 255, message = "Tên nhà cung cấp tối đa 255 ký tự")
    private String tenNcc;

    @Size(max = 20, message = "Số điện thoại tối đa 20 ký tự")
    private String soDienThoai;

    @Size(max = 500, message = "Địa chỉ tối đa 500 ký tự")
    private String diaChi;
}
