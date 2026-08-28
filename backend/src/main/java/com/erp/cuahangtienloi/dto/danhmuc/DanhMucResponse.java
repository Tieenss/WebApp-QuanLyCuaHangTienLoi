package com.erp.cuahangtienloi.dto.danhmuc;

import com.erp.cuahangtienloi.entity.DanhMuc;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Dữ liệu danh mục trả về.
 */
@Getter
@Setter
public class DanhMucResponse {
    private UUID id;
    private String tenDanhMuc;
    private LocalDateTime ngayTao;

    public static DanhMucResponse from(DanhMuc e) {
        DanhMucResponse r = new DanhMucResponse();
        r.id = e.getId();
        r.tenDanhMuc = e.getTenDanhMuc();
        r.ngayTao = e.getNgayTao();
        return r;
    }
}
