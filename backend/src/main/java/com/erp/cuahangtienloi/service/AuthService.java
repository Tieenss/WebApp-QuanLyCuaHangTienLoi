package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.LoginRequest;
import com.erp.cuahangtienloi.dto.LoginResponse;
import com.erp.cuahangtienloi.dto.TaiKhoanDTO;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.entity.TaiKhoan;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import com.erp.cuahangtienloi.repository.TaiKhoanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final TaiKhoanRepository taiKhoanRepository;
    private final NhanVienRepository nhanVienRepository;
    private final PasswordEncoder passwordEncoder;

    public LoginResponse login(LoginRequest request) {
        TaiKhoan taiKhoan = taiKhoanRepository.findByTenDangNhap(request.getUsername())
                .orElseThrow(() -> new RuntimeException("Tài khoản hoặc mật khẩu không đúng"));

        if (!passwordEncoder.matches(request.getPassword(), taiKhoan.getMatKhauHash())) {
            throw new RuntimeException("Tài khoản hoặc mật khẩu không đúng");
        }

        if (!"ACTIVE".equals(taiKhoan.getTrangThai())) {
            throw new RuntimeException("Tài khoản đã bị vô hiệu hóa");
        }

        NhanVien nhanVien = null;
        if (taiKhoan.getIdNhanVien() != null) {
            nhanVien = nhanVienRepository.findById(taiKhoan.getIdNhanVien()).orElse(null);
        }

        String token = UUID.randomUUID().toString();
        String expiresAt = LocalDateTime.now().plusHours(24).toString();

        return new LoginResponse(token, toDTO(taiKhoan, nhanVien), expiresAt);
    }

    public TaiKhoanDTO toDTO(TaiKhoan taiKhoan, NhanVien nhanVien) {
        TaiKhoanDTO dto = new TaiKhoanDTO();
        dto.setId(taiKhoan.getId());
        dto.setTenDangNhap(taiKhoan.getTenDangNhap());
        dto.setTrangThai(taiKhoan.getTrangThai());
        dto.setIdNhanVien(taiKhoan.getIdNhanVien());
        
        if (nhanVien != null) {
            dto.setEmail(nhanVien.getEmail());
            dto.setHoTen(nhanVien.getHoTen());
            dto.setVaiTro(nhanVien.getVaiTro());
            dto.setIdChiNhanh(nhanVien.getIdChiNhanh());
        }
        
        return dto;
    }
}
