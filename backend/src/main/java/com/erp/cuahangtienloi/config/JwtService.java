package com.erp.cuahangtienloi.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration-ms}") long expirationMs) {

        this.key = Keys.hmacShaKeyFor(
                secret.getBytes(StandardCharsets.UTF_8)
        );

        this.expirationMs = expirationMs;
    }

    public String generateToken(
            UUID taiKhoanId,
            String role,
            UUID idNhanVien,
            UUID idChiNhanh) {

        Instant now = Instant.now();

        return Jwts.builder()
                .subject(taiKhoanId.toString())
                .claim("role", role)
                .claim(
                        "idNhanVien",
                        idNhanVien != null
                                ? idNhanVien.toString()
                                : null
                )
                .claim(
                        "idChiNhanh",
                        idChiNhanh != null
                                ? idChiNhanh.toString()
                                : null
                )
                .issuedAt(Date.from(now))
                .expiration(
                        Date.from(
                                now.plus(
                                        Duration.ofMillis(expirationMs)
                                )
                        )
                )
                .signWith(key)
                .compact();
    }

    /**
     * Trả về null nếu token không hợp lệ hoặc hết hạn.
     */
    public Claims parseToken(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

        } catch (Exception e) {
            return null;
        }
    }
}