package com.erp.cuahangtienloi.security;

import com.erp.cuahangtienloi.entity.NhanVien;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public class ChiTietNguoiDung implements UserDetails {

    private final NhanVien nhanVien;

    public ChiTietNguoiDung(NhanVien nhanVien) {
        this.nhanVien = nhanVien;
    }

    public NhanVien getNhanVien() {
        return nhanVien;
    }

    public UUID getUserId() {
        return nhanVien.getId();
    }

    public UUID getChiNhanhId() {
        return nhanVien.getChiNhanh() != null ? nhanVien.getChiNhanh().getId() : null;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + nhanVien.getVaiTro().name()));
    }

    @Override
    public String getPassword() {
        return nhanVien.getMatKhau();
    }

    @Override
    public String getUsername() {
        return nhanVien.getTenDangNhap();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return nhanVien.getDangHoatDong();
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return nhanVien.getDangHoatDong();
    }
}
