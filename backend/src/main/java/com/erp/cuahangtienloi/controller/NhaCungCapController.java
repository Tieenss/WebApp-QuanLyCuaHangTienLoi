package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.NhaCungCapDTO;
import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.service.NhaCungCapService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/nha-cung-cap")
@RequiredArgsConstructor
public class NhaCungCapController {

    private final NhaCungCapService nhaCungCapService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<NhaCungCapDTO>> getAll() {
        return ResponseEntity.ok(nhaCungCapService.getAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getById(@PathVariable UUID id) {
        return nhaCungCapService.getById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/active")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<NhaCungCapDTO>> getActive() {
        return ResponseEntity.ok(nhaCungCapService.getActive());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> create(@Valid @RequestBody NhaCungCapDTO request) {
        return ResponseEntity.ok(nhaCungCapService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> update(@PathVariable UUID id, @Valid @RequestBody NhaCungCapDTO request) {
        return nhaCungCapService.update(id, request)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (nhaCungCapService.delete(id)) {
            return ResponseEntity.ok(ApiResponse.ok("Xóa NCC thành công"));
        }
        return ResponseEntity.notFound().build();
    }
}
