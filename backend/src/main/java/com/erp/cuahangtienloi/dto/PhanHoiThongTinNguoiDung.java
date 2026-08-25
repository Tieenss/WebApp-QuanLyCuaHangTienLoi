package com.erp.cuahangtienloi.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@Builder
public class PhanHoiThongTinNguoiDung {
    private UUID id;
    private String tenDangNhap;
    private String hoTen;
    private String vaiTro;
    private UUID chiNhanhId;
    private String tenChiNhanh;
}
