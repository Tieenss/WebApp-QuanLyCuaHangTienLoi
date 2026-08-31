package com.erp.cuahangtienloi.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class CreateTaiKhoanRequest {
    private String tenDangNhap;
    private String matKhau;
    private UUID idNhanVien;
    private String vaiTro;
}
