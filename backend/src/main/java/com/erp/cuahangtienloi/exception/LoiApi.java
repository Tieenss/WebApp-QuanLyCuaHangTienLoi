package com.erp.cuahangtienloi.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
public class LoiApi {
    private int trangThai;
    private String thongBao;
    private LocalDateTime thoiGian;
}
