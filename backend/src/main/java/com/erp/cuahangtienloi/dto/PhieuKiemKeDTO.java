package com.erp.cuahangtienloi.dto;

import lombok.Data;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class PhieuKiemKeDTO {
    private UUID id;
    private String maPhieu;
    private UUID idChiNhanh;
    private String tenChiNhanh;
    private UUID idNguoiTao;
    private String tenNguoiTao;
    private UUID idNguoiDuyet;
    private String tenNguoiDuyet;
    private LocalDate ngayKiemKe;
    private LocalDate ngayCanBang;
    private String trangThai;
    private String ghiChu;
}
