package com.erp.cuahangtienloi.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class BoLocXacThucJwt extends OncePerRequestFilter {

    private static final org.slf4j.Logger log = LoggerFactory.getLogger(BoLocXacThucJwt.class);

    private final DichVuJwt dichVuJwt;
    private final DichVuChiTietNguoiDung dichVuChiTietNguoiDung;

    public BoLocXacThucJwt(DichVuJwt dichVuJwt, DichVuChiTietNguoiDung dichVuChiTietNguoiDung) {
        this.dichVuJwt = dichVuJwt;
        this.dichVuChiTietNguoiDung = dichVuChiTietNguoiDung;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String token = extractTokenFromRequest(request);

            if (token != null && dichVuJwt.validateToken(token)) {
                String username = dichVuJwt.extractUsername(token);

                UserDetails userDetails = dichVuChiTietNguoiDung.loadUserByUsername(username);

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null,
                                userDetails.getAuthorities()
                        );
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception e) {
            log.error("Không thể xác thực người dùng: {}", e.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    private String extractTokenFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
