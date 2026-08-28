package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.sanpham.SanPhamRequest;
import com.erp.cuahangtienloi.dto.sanpham.SanPhamResponse;
import com.erp.cuahangtienloi.service.SanPhamService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * API quản lý sản phẩm — ERP-S1-05 mục 4.
 * Phân quyền: chỉ ADMIN.
 * Theo BR-03 không có endpoint xóa: sản phẩm chỉ được tắt hoạt động.
 * TODO(ERP-S1-04): gắn @PreAuthorize("hasRole('ADMIN')") sau khi Security/JWT hoàn thành.
 */
@RestController
@RequestMapping("/api/san-pham")
public class SanPhamController {

    private final SanPhamService sanPhamService;

    public SanPhamController(SanPhamService sanPhamService) {
        this.sanPhamService = sanPhamService;
    }

    @GetMapping
    public List<SanPhamResponse> danhSach() {
        return sanPhamService.findAll();
    }

    @GetMapping("/{id}")
    public SanPhamResponse chiTiet(@PathVariable UUID id) {
        return sanPhamService.findById(id);
    }

    @PostMapping
    public ResponseEntity<SanPhamResponse> taoMoi(@Valid @RequestBody SanPhamRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sanPhamService.create(request));
    }

    @PutMapping("/{id}")
    public SanPhamResponse capNhat(@PathVariable UUID id,
                                   @Valid @RequestBody SanPhamRequest request) {
        return sanPhamService.update(id, request);
    }

    /** Tắt hoạt động sản phẩm (thay cho xóa — BR-03). */
    @PatchMapping("/{id}/tat")
    public SanPhamResponse tat(@PathVariable UUID id) {
        return sanPhamService.doiTrangThai(id, false);
    }

    /** Bật lại hoạt động sản phẩm. */
    @PatchMapping("/{id}/bat")
    public SanPhamResponse bat(@PathVariable UUID id) {
        return sanPhamService.doiTrangThai(id, true);
    }
}
