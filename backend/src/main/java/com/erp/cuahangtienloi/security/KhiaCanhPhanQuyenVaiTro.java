package com.erp.cuahangtienloi.security;

import com.erp.cuahangtienloi.entity.enums.VaiTro;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Arrays;

@Aspect
@Component
public class KhiaCanhPhanQuyenVaiTro {

    @Before("@annotation(yeuCauVaiTro)")
    public void checkRole(JoinPoint joinPoint, YeuCauVaiTro yeuCauVaiTro) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Chưa đăng nhập");
        }

        if (!(authentication.getPrincipal() instanceof ChiTietNguoiDung userDetails)) {
            throw new AccessDeniedException("Không thể xác định quyền truy cập");
        }

        VaiTro currentRole = userDetails.getNhanVien().getVaiTro();
        VaiTro[] allowedRoles = yeuCauVaiTro.value();

        boolean hasPermission = Arrays.asList(allowedRoles).contains(currentRole);

        if (!hasPermission) {
            throw new AccessDeniedException(
                    String.format("Vai trò '%s' không có quyền truy cập chức năng này. Yêu cầu: %s",
                            currentRole, Arrays.toString(allowedRoles)));
        }
    }
}
