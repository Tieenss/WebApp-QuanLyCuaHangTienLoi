package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.chinhanh.ChiNhanhRequest;
import com.erp.cuahangtienloi.dto.chinhanh.ChiNhanhResponse;
import com.erp.cuahangtienloi.service.ChiNhanhService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * API quản lý chi nhánh — ERP-S1-05 mục 1.
 * Phân quyền: chỉ ADMIN (theo ma trận phân quyền trong co_so_du_lieu.md).
 * TODO(ERP-S1-04): gắn @PreAuthorize("hasRole('ADMIN')") sau khi Security/JWT hoàn thành.
 */
@RestController
@RequestMapping("/api/chi-nhanh")
public class ChiNhanhController {

    private final ChiNhanhService chiNhanhService;

    public ChiNhanhController(ChiNhanhService chiNhanhService) {
        this.chiNhanhService = chiNhanhService;
    }

    @GetMapping
    public List<ChiNhanhResponse> danhSach() {
        return chiNhanhService.findAll();
    }

    @GetMapping("/{id}")
    public ChiNhanhResponse chiTiet(@PathVariable UUID id) {
        return chiNhanhService.findById(id);
    }

    @PostMapping
    public ResponseEntity<ChiNhanhResponse> taoMoi(@Valid @RequestBody ChiNhanhRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(chiNhanhService.create(request));
    }

    @PutMapping("/{id}")
    public ChiNhanhResponse capNhat(@PathVariable UUID id,
                                    @Valid @RequestBody ChiNhanhRequest request) {
        return chiNhanhService.update(id, request);
    }

    /** Khóa chi nhánh (thay cho xóa). */
    @PatchMapping("/{id}/khoa")
    public ChiNhanhResponse khoa(@PathVariable UUID id) {
        return chiNhanhService.doiTrangThai(id, false);
    }

    /** Mở khóa chi nhánh. */
    @PatchMapping("/{id}/mo-khoa")
    public ChiNhanhResponse moKhoa(@PathVariable UUID id) {
        return chiNhanhService.doiTrangThai(id, true);
    }
}
