package com.erp.cuahangtienloi.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.util.UUID;

@Data
public class UpdateTaiKhoanRequest {
    @Size(min = 8, max = 100, message = "Mật khẩu phải từ 8 đến 100 ký tự")
    private String matKhau;
    @Pattern(regexp = "ACTIVE|INACTIVE|LOCKED", message = "Trạng thái phải là ACTIVE, INACTIVE hoặc LOCKED")
    private String trangThai;
    @Pattern(regexp = "ADMIN|KE_TOAN|THU_KHO|QUAN_LY|THU_NGAN", message = "Vai trò không hợp lệ")
    private String vaiTro;
}
