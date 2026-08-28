package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.danhmuc.DanhMucRequest;
import com.erp.cuahangtienloi.dto.danhmuc.DanhMucResponse;
import com.erp.cuahangtienloi.service.DanhMucService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * API quản lý danh mục — ERP-S1-05 mục 3.
 * Phân quyền: chỉ ADMIN.
 * TODO(ERP-S1-04): gắn @PreAuthorize("hasRole('ADMIN')") sau khi Security/JWT hoàn thành.
 */
@RestController
@RequestMapping("/api/danh-muc")
public class DanhMucController {

    private final DanhMucService danhMucService;

    public DanhMucController(DanhMucService danhMucService) {
        this.danhMucService = danhMucService;
    }

    @GetMapping
    public List<DanhMucResponse> danhSach() {
        return danhMucService.findAll();
    }

    @GetMapping("/{id}")
    public DanhMucResponse chiTiet(@PathVariable UUID id) {
        return danhMucService.findById(id);
    }

    @PostMapping
    public ResponseEntity<DanhMucResponse> taoMoi(@Valid @RequestBody DanhMucRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(danhMucService.create(request));
    }

    @PutMapping("/{id}")
    public DanhMucResponse capNhat(@PathVariable UUID id,
                                   @Valid @RequestBody DanhMucRequest request) {
        return danhMucService.update(id, request);
    }

    /** Xóa danh mục — chỉ thành công nếu chưa có sản phẩm nào thuộc danh mục. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> xoa(@PathVariable UUID id) {
        danhMucService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
