package com.erp.cuahangtienloi.dto.chinhanh;

import com.erp.cuahangtienloi.enums.LoaiChiNhanh;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * Payload tạo/sửa chi nhánh. Dùng cho POST và PUT.
 */
@Getter
@Setter
public class ChiNhanhRequest {

    @NotBlank(message = "Tên chi nhánh không được để trống")
    @Size(max = 255, message = "Tên chi nhánh tối đa 255 ký tự")
    private String tenChiNhanh;

    @Size(max = 500, message = "Địa chỉ tối đa 500 ký tự")
    private String diaChi;

    @NotNull(message = "Loại chi nhánh không được để trống")
    private LoaiChiNhanh loai;
}
