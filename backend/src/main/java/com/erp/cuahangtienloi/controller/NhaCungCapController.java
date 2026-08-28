package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.nhacungcap.NhaCungCapRequest;
import com.erp.cuahangtienloi.dto.nhacungcap.NhaCungCapResponse;
import com.erp.cuahangtienloi.service.NhaCungCapService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * API quản lý nhà cung cấp — ERP-S1-05 mục 5.
 * Phân quyền: chỉ ADMIN. Đặc tả MVP chỉ yêu cầu tạo/sửa nên không có endpoint xóa.
 * TODO(ERP-S1-04): gắn @PreAuthorize("hasRole('ADMIN')") sau khi Security/JWT hoàn thành.
 */
@RestController
@RequestMapping("/api/nha-cung-cap")
public class NhaCungCapController {

    private final NhaCungCapService nhaCungCapService;

    public NhaCungCapController(NhaCungCapService nhaCungCapService) {
        this.nhaCungCapService = nhaCungCapService;
    }

    @GetMapping
    public List<NhaCungCapResponse> danhSach() {
        return nhaCungCapService.findAll();
    }

    @GetMapping("/{id}")
    public NhaCungCapResponse chiTiet(@PathVariable UUID id) {
        return nhaCungCapService.findById(id);
    }

    @PostMapping
    public ResponseEntity<NhaCungCapResponse> taoMoi(@Valid @RequestBody NhaCungCapRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(nhaCungCapService.create(request));
    }

    @PutMapping("/{id}")
    public NhaCungCapResponse capNhat(@PathVariable UUID id,
                                      @Valid @RequestBody NhaCungCapRequest request) {
        return nhaCungCapService.update(id, request);
    }
}
