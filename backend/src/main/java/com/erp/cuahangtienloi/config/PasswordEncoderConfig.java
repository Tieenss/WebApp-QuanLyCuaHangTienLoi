package com.erp.cuahangtienloi.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Bean mã hóa mật khẩu dùng cho nghiệp vụ tạo/sửa tài khoản nhân viên (ERP-S1-05).
 * Theo co_so_du_lieu.md: cột nhan_vien.mat_khau lưu dạng Hash.
 *
 * Ghi chú phối hợp: ERP-S1-04 (Spring Security + JWT) có thể dùng lại bean này.
 * Nếu S1-04 tự khai báo PasswordEncoder, cần gộp về một chỗ duy nhất để tránh trùng bean.
 */
@Configuration
public class PasswordEncoderConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
