package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.nhanvien.NhanVienCreateRequest;
import com.erp.cuahangtienloi.dto.nhanvien.NhanVienResponse;
import com.erp.cuahangtienloi.dto.nhanvien.NhanVienUpdateRequest;
import com.erp.cuahangtienloi.service.NhanVienService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * API quản lý tài khoản nhân viên — ERP-S1-05 mục 2.
 * Phân quyền: chỉ ADMIN.
 * TODO(ERP-S1-04): gắn @PreAuthorize("hasRole('ADMIN')") sau khi Security/JWT hoàn thành.
 */
@RestController
@RequestMapping("/api/nhan-vien")
public class NhanVienController {

    private final NhanVienService nhanVienService;

    public NhanVienController(NhanVienService nhanVienService) {
        this.nhanVienService = nhanVienService;
    }

    @GetMapping
    public List<NhanVienResponse> danhSach() {
        return nhanVienService.findAll();
    }

    @GetMapping("/{id}")
    public NhanVienResponse chiTiet(@PathVariable UUID id) {
        return nhanVienService.findById(id);
    }

    @PostMapping
    public ResponseEntity<NhanVienResponse> taoMoi(@Valid @RequestBody NhanVienCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(nhanVienService.create(request));
    }

    @PutMapping("/{id}")
    public NhanVienResponse capNhat(@PathVariable UUID id,
                                    @Valid @RequestBody NhanVienUpdateRequest request) {
        return nhanVienService.update(id, request);
    }

    /** Khóa tài khoản — nhân viên bị khóa sẽ không đăng nhập được (AC #3). */
    @PatchMapping("/{id}/khoa")
    public NhanVienResponse khoa(@PathVariable UUID id) {
        return nhanVienService.doiTrangThai(id, false);
    }

    /** Mở khóa tài khoản. */
    @PatchMapping("/{id}/mo-khoa")
    public NhanVienResponse moKhoa(@PathVariable UUID id) {
        return nhanVienService.doiTrangThai(id, true);
    }
}
