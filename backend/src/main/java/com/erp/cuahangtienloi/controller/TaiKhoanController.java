package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.ChangePasswordRequest;
import com.erp.cuahangtienloi.dto.CreateTaiKhoanRequest;
import com.erp.cuahangtienloi.dto.NhanVienOption;
import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.dto.TaiKhoanDTO;
import com.erp.cuahangtienloi.dto.UpdateTaiKhoanRequest;
import com.erp.cuahangtienloi.service.TaiKhoanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/tai-khoan")
@RequiredArgsConstructor
public class TaiKhoanController {

    private final TaiKhoanService taiKhoanService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<TaiKhoanDTO>> getAllTaiKhoan() {
        return ResponseEntity.ok(taiKhoanService.getAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getTaiKhoanById(@PathVariable UUID id) {
        return taiKhoanService.getById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createTaiKhoan(@Valid @RequestBody CreateTaiKhoanRequest request) {
        taiKhoanService.create(request);
        return ResponseEntity.ok(ApiResponse.ok("Tạo tài khoản thành công"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateTaiKhoan(@PathVariable UUID id, @Valid @RequestBody UpdateTaiKhoanRequest request) {
        return taiKhoanService.update(id, request)
                .map(tk -> ResponseEntity.ok(ApiResponse.ok("Cập nhật thành công")))
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteTaiKhoan(@PathVariable UUID id) {
        if (taiKhoanService.delete(id)) {
            return ResponseEntity.ok(ApiResponse.ok("Xóa tài khoản thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/nhan-vien")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<NhanVienOption>> getNhanVienChuaCoTaiKhoan() {
        return ResponseEntity.ok(taiKhoanService.getNhanVienChuaCoTaiKhoan());
    }

    @PutMapping("/{id}/change-password")
    @PreAuthorize("hasRole('ADMIN') or authentication.name == #id.toString()")
    public ResponseEntity<?> changePassword(
            @PathVariable UUID id,
            @Valid @RequestBody ChangePasswordRequest request) {
        if (taiKhoanService.changePassword(id, request)) {
            return ResponseEntity.ok(ApiResponse.ok("Đổi mật khẩu thành công"));
        }
        return ResponseEntity.notFound().build();
    }
}
