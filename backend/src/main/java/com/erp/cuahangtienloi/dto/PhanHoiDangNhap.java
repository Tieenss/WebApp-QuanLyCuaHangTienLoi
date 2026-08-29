package com.erp.cuahangtienloi.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@Builder
public class PhanHoiDangNhap {
    private String accessToken;
    private PhanHoiThongTinNguoiDung nguoiDung;
}
