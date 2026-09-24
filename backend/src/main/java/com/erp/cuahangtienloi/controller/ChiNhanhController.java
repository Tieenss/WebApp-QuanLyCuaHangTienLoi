package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.entity.ChiNhanh;
import com.erp.cuahangtienloi.service.ChiNhanhService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chi-nhanh")
@RequiredArgsConstructor
public class ChiNhanhController {

    private final ChiNhanhService chiNhanhService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY', 'THU_KHO', 'THU_NGAN', 'KE_TOAN')")
    public ResponseEntity<List<ChiNhanh>> getAll() {
        return ResponseEntity.ok(chiNhanhService.getAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getById(@PathVariable UUID id) {
        return chiNhanhService.getById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/active")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ChiNhanh>> getActive() {
        return ResponseEntity.ok(chiNhanhService.getActive());
    }

    @GetMapping("/by-loai/{loai}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ChiNhanh>> getByLoai(@PathVariable String loai) {
        return ResponseEntity.ok(chiNhanhService.getByLoai(loai));
    }

    @GetMapping("/kho-tong")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ChiNhanh>> getKhoTong() {
        return ResponseEntity.ok(chiNhanhService.getKhoTong());
    }

    @GetMapping("/cua-hang")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ChiNhanh>> getCuaHang() {
        return ResponseEntity.ok(chiNhanhService.getCuaHang());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> create(@RequestBody ChiNhanh request) {
        ChiNhanh created = chiNhanhService.create(request);
        return ResponseEntity.ok(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody ChiNhanh request) {
        return chiNhanhService.update(id, request)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        return chiNhanhService.delete(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/quan-ly/{idQuanLy}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> assignQuanLy(@PathVariable UUID id, @PathVariable UUID idQuanLy) {
        return chiNhanhService.assignQuanLy(id, idQuanLy)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}/quan-ly")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> clearQuanLy(@PathVariable UUID id) {
        return chiNhanhService.clearQuanLy(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
