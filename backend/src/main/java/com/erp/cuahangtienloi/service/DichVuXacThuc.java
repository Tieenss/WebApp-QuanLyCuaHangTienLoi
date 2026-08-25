package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.YeuCauDangNhap;
import com.erp.cuahangtienloi.dto.PhanHoiDangNhap;
import com.erp.cuahangtienloi.dto.PhanHoiThongTinNguoiDung;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import com.erp.cuahangtienloi.security.ChiTietNguoiDung;
import com.erp.cuahangtienloi.security.DichVuJwt;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class DichVuXacThuc {

    private final AuthenticationManager authenticationManager;
    private final DichVuJwt dichVuJwt;
    private final NhanVienRepository nhanVienRepository;

    public DichVuXacThuc(AuthenticationManager authenticationManager,
                         DichVuJwt dichVuJwt,
                         NhanVienRepository nhanVienRepository) {
        this.authenticationManager = authenticationManager;
        this.dichVuJwt = dichVuJwt;
        this.nhanVienRepository = nhanVienRepository;
    }

    @Transactional(readOnly = true)
    public PhanHoiDangNhap login(YeuCauDangNhap request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getTenDangNhap(),
                            request.getMatKhau()
                    )
            );

            ChiTietNguoiDung userDetails = (ChiTietNguoiDung) authentication.getPrincipal();
            NhanVien nhanVien = userDetails.getNhanVien();

            if (!nhanVien.getDangHoatDong()) {
                throw new BadCredentialsException("Tài khoản đã bị khóa hoạt động.");
            }

            UUID chiNhanhId = nhanVien.getChiNhanh() != null ? nhanVien.getChiNhanh().getId() : null;
            String tenChiNhanh = nhanVien.getChiNhanh() != null ? nhanVien.getChiNhanh().getTenChiNhanh() : null;

            String token = dichVuJwt.generateToken(
                    nhanVien.getTenDangNhap(),
                    nhanVien.getId(),
                    nhanVien.getVaiTro().name(),
                    chiNhanhId
            );

            PhanHoiThongTinNguoiDung userInfo = PhanHoiThongTinNguoiDung.builder()
                    .id(nhanVien.getId())
                    .tenDangNhap(nhanVien.getTenDangNhap())
                    .hoTen(nhanVien.getHoTen())
                    .vaiTro(nhanVien.getVaiTro().name())
                    .chiNhanhId(chiNhanhId)
                    .tenChiNhanh(tenChiNhanh)
                    .build();

            return PhanHoiDangNhap.builder()
                    .accessToken(token)
                    .nguoiDung(userInfo)
                    .build();

        } catch (Exception e) {
            throw new BadCredentialsException("Tên đăng nhập hoặc mật khẩu không chính xác.");
        }
    }

    @Transactional(readOnly = true)
    public PhanHoiThongTinNguoiDung getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof ChiTietNguoiDung userDetails)) {
            throw new BadCredentialsException("Chưa đăng nhập.");
        }

        NhanVien nhanVien = userDetails.getNhanVien();
        
        nhanVien = nhanVienRepository.findById(nhanVien.getId())
                .orElseThrow(() -> new BadCredentialsException("Người dùng không còn tồn tại trong hệ thống."));

        UUID chiNhanhId = nhanVien.getChiNhanh() != null ? nhanVien.getChiNhanh().getId() : null;
        String tenChiNhanh = nhanVien.getChiNhanh() != null ? nhanVien.getChiNhanh().getTenChiNhanh() : null;

        return PhanHoiThongTinNguoiDung.builder()
                .id(nhanVien.getId())
                .tenDangNhap(nhanVien.getTenDangNhap())
                .hoTen(nhanVien.getHoTen())
                .vaiTro(nhanVien.getVaiTro().name())
                .chiNhanhId(chiNhanhId)
                .tenChiNhanh(tenChiNhanh)
                .build();
    }
}
