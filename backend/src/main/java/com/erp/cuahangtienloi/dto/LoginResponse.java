package com.erp.cuahangtienloi.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.util.UUID;

@Data
@AllArgsConstructor
public class LoginResponse {
    private String token;
    private TaiKhoanDTO user;
    private String expiresAt;
}
