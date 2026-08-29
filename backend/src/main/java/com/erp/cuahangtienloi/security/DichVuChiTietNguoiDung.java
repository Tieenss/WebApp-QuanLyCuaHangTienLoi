package com.erp.cuahangtienloi.security;

import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DichVuChiTietNguoiDung implements UserDetailsService {

    private final NhanVienRepository nhanVienRepository;

    public DichVuChiTietNguoiDung(NhanVienRepository nhanVienRepository) {
        this.nhanVienRepository = nhanVienRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String tenDangNhap) throws UsernameNotFoundException {
        NhanVien nhanVien = nhanVienRepository.findByTenDangNhap(tenDangNhap)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "Không tìm thấy tài khoản: " + tenDangNhap));

        return new ChiTietNguoiDung(nhanVien);
    }
}
