package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.YeuCauDangNhap;
import com.erp.cuahangtienloi.dto.PhanHoiDangNhap;
import com.erp.cuahangtienloi.dto.PhanHoiThongTinNguoiDung;
import com.erp.cuahangtienloi.service.DichVuXacThuc;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class BoDieuKhienXacThuc {

    private final DichVuXacThuc dichVuXacThuc;

    public BoDieuKhienXacThuc(DichVuXacThuc dichVuXacThuc) {
        this.dichVuXacThuc = dichVuXacThuc;
    }

    @PostMapping("/login")
    public ResponseEntity<PhanHoiDangNhap> login(@RequestBody YeuCauDangNhap loginRequest) {
        return ResponseEntity.ok(dichVuXacThuc.login(loginRequest));
    }

    @GetMapping("/me")
    public ResponseEntity<PhanHoiThongTinNguoiDung> getCurrentUser() {
        return ResponseEntity.ok(dichVuXacThuc.getCurrentUser());
    }
}
