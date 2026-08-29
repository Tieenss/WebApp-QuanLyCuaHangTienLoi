package com.erp.cuahangtienloi.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class DichVuJwt {

    private static final Logger logger = LoggerFactory.getLogger(DichVuJwt.class);

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration}")
    private long jwtExpiration; // milliseconds

    private SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(jwtSecret);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(String tenDangNhap, UUID userId, String vaiTro, UUID chiNhanhId) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId.toString());
        claims.put("vaiTro", vaiTro);
        if (chiNhanhId != null) {
            claims.put("chiNhanhId", chiNhanhId.toString());
        }

        return Jwts.builder()
                .claims(claims)
                .subject(tenDangNhap)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(getSigningKey())
                .compact();
    }

    public String extractUsername(String token) {
        return extractAllClaims(token).getSubject();
    }

    public UUID extractUserId(String token) {
        String userId = extractAllClaims(token).get("userId", String.class);
        return UUID.fromString(userId);
    }

    public String extractVaiTro(String token) {
        return extractAllClaims(token).get("vaiTro", String.class);
    }

    public UUID extractChiNhanhId(String token) {
        String chiNhanhId = extractAllClaims(token).get("chiNhanhId", String.class);
        return chiNhanhId != null ? UUID.fromString(chiNhanhId) : null;
    }

    public boolean validateToken(String token) {
        try {
            extractAllClaims(token);
            return true;
        } catch (ExpiredJwtException e) {
            logger.warn("JWT đã hết hạn: {}", e.getMessage());
        } catch (MalformedJwtException e) {
            logger.warn("JWT không hợp lệ: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            logger.warn("JWT không được hỗ trợ: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            logger.warn("JWT claims rỗng: {}", e.getMessage());
        }
        return false;
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
