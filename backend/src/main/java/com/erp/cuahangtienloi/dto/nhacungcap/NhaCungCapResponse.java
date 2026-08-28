package com.erp.cuahangtienloi.dto.nhacungcap;

import com.erp.cuahangtienloi.entity.NhaCungCap;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Dữ liệu nhà cung cấp trả về.
 */
@Getter
@Setter
public class NhaCungCapResponse {
    private UUID id;
    private String tenNcc;
    private String soDienThoai;
    private String diaChi;
    private LocalDateTime ngayTao;

    public static NhaCungCapResponse from(NhaCungCap e) {
        NhaCungCapResponse r = new NhaCungCapResponse();
        r.id = e.getId();
        r.tenNcc = e.getTenNcc();
        r.soDienThoai = e.getSoDienThoai();
        r.diaChi = e.getDiaChi();
        r.ngayTao = e.getNgayTao();
        return r;
    }
}
