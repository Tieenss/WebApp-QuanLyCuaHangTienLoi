package com.erp.cuahangtienloi.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class TaiKhoanDTO {
    private UUID id;
    private String tenDangNhap;
    private String email;
    private String hoTen;
    private String vaiTro;
    private UUID idNhanVien;
    private UUID idChiNhanh;
    private String trangThai;
}
