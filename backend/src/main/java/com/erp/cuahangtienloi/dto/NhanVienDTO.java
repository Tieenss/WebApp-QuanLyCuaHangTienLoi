package com.erp.cuahangtienloi.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class NhanVienDTO {
    private UUID id;
    private String maNhanVien;
    private String hoTen;
    private String email;
    private String soDienThoai;
    private String vaiTro;
    private UUID idChiNhanh;
    private String trangThai;
}
