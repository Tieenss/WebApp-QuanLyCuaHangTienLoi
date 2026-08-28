package com.erp.cuahangtienloi.dto.nhanvien;

import com.erp.cuahangtienloi.enums.VaiTro;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Payload sửa nhân viên (PUT).
 * Không cho đổi tên đăng nhập. Mật khẩu để trống = giữ nguyên; có giá trị = đổi mật khẩu (hash lại).
 */
@Getter
@Setter
public class NhanVienUpdateRequest {

    @NotBlank(message = "Họ tên không được để trống")
    @Size(max = 255, message = "Họ tên tối đa 255 ký tự")
    private String hoTen;

    @Size(max = 20, message = "Số điện thoại tối đa 20 ký tự")
    private String soDienThoai;

    @NotNull(message = "Vai trò không được để trống")
    private VaiTro vaiTro;

    @NotNull(message = "Chi nhánh không được để trống")
    private UUID idChiNhanh;

    @NotNull(message = "Lương theo giờ không được để trống")
    @DecimalMin(value = "0", inclusive = false, message = "Lương theo giờ phải lớn hơn 0")
    private BigDecimal luongTheoGio;

    @Size(max = 30, message = "Số tài khoản tối đa 30 ký tự")
    private String soTaiKhoan;

    @Size(max = 100, message = "Tên ngân hàng tối đa 100 ký tự")
    private String tenNganHang;

    /** Tùy chọn. Nếu null/blank thì giữ mật khẩu cũ. */
    @Size(min = 6, max = 100, message = "Mật khẩu từ 6 đến 100 ký tự")
    private String matKhau;
}
