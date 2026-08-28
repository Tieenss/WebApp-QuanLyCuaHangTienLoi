package com.erp.cuahangtienloi.dto.nhanvien;

import com.erp.cuahangtienloi.enums.VaiTro;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Payload tạo nhân viên (POST). Mật khẩu bắt buộc và sẽ được hash BCrypt trong service.
 */
@Getter
@Setter
public class NhanVienCreateRequest {

    @NotBlank(message = "Tên đăng nhập không được để trống")
    @Size(max = 100, message = "Tên đăng nhập tối đa 100 ký tự")
    private String tenDangNhap;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 6, max = 100, message = "Mật khẩu từ 6 đến 100 ký tự")
    private String matKhau;

    @NotBlank(message = "Họ tên không được để trống")
    @Size(max = 255, message = "Họ tên tối đa 255 ký tự")
    private String hoTen;

    @Size(max = 20, message = "Số điện thoại tối đa 20 ký tự")
    private String soDienThoai;

    @NotNull(message = "Vai trò không được để trống")
    private VaiTro vaiTro;

    /** Bắt buộc gán chi nhánh nơi làm việc. */
    @NotNull(message = "Chi nhánh không được để trống")
    private UUID idChiNhanh;

    @NotNull(message = "Lương theo giờ không được để trống")
    @DecimalMin(value = "0", inclusive = false, message = "Lương theo giờ phải lớn hơn 0")
    private BigDecimal luongTheoGio;

    @Size(max = 30, message = "Số tài khoản tối đa 30 ký tự")
    private String soTaiKhoan;

    @Size(max = 100, message = "Tên ngân hàng tối đa 100 ký tự")
    private String tenNganHang;
}
