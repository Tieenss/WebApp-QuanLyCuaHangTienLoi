package com.erp.cuahangtienloi.dto;

import lombok.Data;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class PhieuXuatKhoDTO {
    private UUID id;
    private String maPhieu;
    private UUID idChiNhanhXuat;
    private String tenChiNhanhXuat;
    private UUID idChiNhanhNhan;
    private String tenChiNhanhNhan;
    private UUID idNguoiTao;
    private String tenNguoiTao;
    private UUID idNguoiDuyet;
    private String tenNguoiDuyet;
    private UUID idNguoiNhan;
    private String tenNguoiNhan;
    private LocalDate ngayYeuCau;
    private LocalDate ngayXuatThucTe;
    private LocalDate ngayNhanThucTe;
    private String trangThai;
    private String ghiChu;
}
