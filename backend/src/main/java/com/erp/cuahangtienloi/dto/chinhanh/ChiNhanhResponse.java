package com.erp.cuahangtienloi.dto.chinhanh;

import com.erp.cuahangtienloi.entity.ChiNhanh;
import com.erp.cuahangtienloi.enums.LoaiChiNhanh;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Dữ liệu chi nhánh trả về cho client.
 */
@Getter
@Setter
public class ChiNhanhResponse {
    private UUID id;
    private String tenChiNhanh;
    private String diaChi;
    private LoaiChiNhanh loai;
    private Boolean dangHoatDong;
    private LocalDateTime ngayTao;

    public static ChiNhanhResponse from(ChiNhanh e) {
        ChiNhanhResponse r = new ChiNhanhResponse();
        r.id = e.getId();
        r.tenChiNhanh = e.getTenChiNhanh();
        r.diaChi = e.getDiaChi();
        r.loai = e.getLoai();
        r.dangHoatDong = e.getDangHoatDong();
        r.ngayTao = e.getNgayTao();
        return r;
    }
}
