package com.erp.cuahangtienloi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.util.UUID;

@Data
public class CreateTaiKhoanRequest {
    @NotBlank(message = "Tên đăng nhập không được để trống")
    @Size(min = 3, max = 50, message = "Tên đăng nhập phải từ 3 đến 50 ký tự")
    @Pattern(regexp = "^[A-Za-z0-9_]+$", message = "Tên đăng nhập chỉ gồm chữ, số và dấu gạch dưới")
    private String tenDangNhap;
    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 8, max = 100, message = "Mật khẩu phải từ 8 đến 100 ký tự")
    private String matKhau;
    private UUID idNhanVien;
    private String vaiTro;
    private String idChiNhanh;
}
