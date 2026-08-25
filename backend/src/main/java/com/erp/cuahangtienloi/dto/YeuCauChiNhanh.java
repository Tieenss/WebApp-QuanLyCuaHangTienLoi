package com.erp.cuahangtienloi.dto;

import com.erp.cuahangtienloi.entity.enums.LoaiChiNhanh;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class YeuCauChiNhanh {
    private String tenChiNhanh;
    private String diaChi;
    private LoaiChiNhanh loai;
}
