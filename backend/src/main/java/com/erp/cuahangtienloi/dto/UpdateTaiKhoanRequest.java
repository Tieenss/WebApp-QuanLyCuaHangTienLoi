package com.erp.cuahangtienloi.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class UpdateTaiKhoanRequest {
    private String matKhau;
    private String trangThai;
    private String vaiTro;
}
