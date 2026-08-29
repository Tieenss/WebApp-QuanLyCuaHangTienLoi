package com.erp.cuahangtienloi.dto;

import com.erp.cuahangtienloi.entity.enums.LoaiChiNhanh;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@Builder
public class PhanHoiChiNhanh {
    private UUID id;
    private String tenChiNhanh;
    private String diaChi;
    private LoaiChiNhanh loai;
    private Boolean dangHoatDong;
    private LocalDateTime ngayTao;
}
