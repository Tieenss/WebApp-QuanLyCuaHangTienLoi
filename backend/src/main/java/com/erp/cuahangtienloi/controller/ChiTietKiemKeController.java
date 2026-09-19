package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.entity.ChiTietKiemKe;
import com.erp.cuahangtienloi.repository.*;
import com.erp.cuahangtienloi.service.BranchAccessService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chi-tiet-kiem-ke")
@RequiredArgsConstructor
//@CrossOrigin(origins = "*")
@PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
public class ChiTietKiemKeController {

    private final ChiTietKiemKeRepository chiTietKiemKeRepository;
    private final PhieuKiemKeRepository phieuKiemKeRepository;
    private final SanPhamRepository sanPhamRepository;
    private final BranchAccessService branchAccessService;

    @GetMapping("/by-phieu/{idPhieuKiemKe}")
    public ResponseEntity<List<ChiTietKiemKe>> getByPhieuKiemKe(@PathVariable UUID idPhieuKiemKe, HttpServletRequest request) {
        requireReadableHeader(idPhieuKiemKe, request);
        return ResponseEntity.ok(chiTietKiemKeRepository.findByIdPhieuKiemKe(idPhieuKiemKe));
    }

    @GetMapping("/by-san-pham/{idSanPham}")
    public ResponseEntity<List<ChiTietKiemKe>> getBySanPham(@PathVariable UUID idSanPham, HttpServletRequest request) {
        var actor = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(chiTietKiemKeRepository.findByIdSanPham(idSanPham).stream()
                .filter(ct -> canReadHeader(actor, ct.getIdPhieuKiemKe())).toList());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> create(@RequestBody ChiTietKiemKe request, HttpServletRequest httpRequest) {
        validate(request, httpRequest);
        ChiTietKiemKe ct = new ChiTietKiemKe();
        ct.setId(UUID.randomUUID());
        ct.setIdPhieuKiemKe(request.getIdPhieuKiemKe());
        ct.setIdSanPham(request.getIdSanPham());
        ct.setTonHeThong(request.getTonHeThong());
        ct.setTonThucTe(request.getTonThucTe());
        ct.setSoLuongLech(request.getSoLuongLech());
        ct.setLyDoLech(request.getLyDoLech());
        ct.setDonGiaVon(request.getDonGiaVon());
        ct.setGiaTriLech(request.getGiaTriLech());
        ct.setNgayTao(LocalDateTime.now());

        chiTietKiemKeRepository.save(ct);
        return ResponseEntity.ok(ct);
    }

    @PostMapping("/batch")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    @Transactional
    public ResponseEntity<?> createBatch(@RequestBody List<ChiTietKiemKe> requests, HttpServletRequest httpRequest) {
        if (requests == null || requests.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Danh sách chi tiết rỗng"));
        }
        List<ChiTietKiemKe> saved = new ArrayList<>();
        for (ChiTietKiemKe request : requests) {
            validate(request, httpRequest);
            ChiTietKiemKe ct = new ChiTietKiemKe();
            ct.setId(UUID.randomUUID());
            ct.setIdPhieuKiemKe(request.getIdPhieuKiemKe());
            ct.setIdSanPham(request.getIdSanPham());
            ct.setTonHeThong(request.getTonHeThong());
            ct.setTonThucTe(request.getTonThucTe());
            ct.setSoLuongLech(request.getSoLuongLech());
            ct.setLyDoLech(request.getLyDoLech());
            ct.setDonGiaVon(request.getDonGiaVon());
            ct.setGiaTriLech(request.getGiaTriLech());
            ct.setNgayTao(LocalDateTime.now());
            saved.add(chiTietKiemKeRepository.save(ct));
        }
        chiTietKiemKeRepository.flush();
        return ResponseEntity.ok(saved);
    }

    private void validate(ChiTietKiemKe request, HttpServletRequest httpRequest) {
        if (request.getIdPhieuKiemKe() == null || !phieuKiemKeRepository.existsById(request.getIdPhieuKiemKe())) {
            throw new IllegalArgumentException("Phiếu kiểm kê không tồn tại");
        }
        if (request.getIdSanPham() == null || !sanPhamRepository.existsById(request.getIdSanPham())) {
            throw new IllegalArgumentException("Sản phẩm không tồn tại");
        }
        requireReadableHeader(request.getIdPhieuKiemKe(), httpRequest);
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getTonHeThong(), "Tồn hệ thống");
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getTonThucTe(), "Tồn thực tế");
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getDonGiaVon(), "Đơn giá vốn");
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> delete(@PathVariable UUID id, HttpServletRequest request) {
        return chiTietKiemKeRepository.findById(id).map(ct -> {
            requireReadableHeader(ct.getIdPhieuKiemKe(), request);
            chiTietKiemKeRepository.delete(ct);
            return ResponseEntity.ok(ApiResponse.ok("Xóa chi tiết thành công"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/by-phieu/{idPhieuKiemKe}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> deleteByPhieuKiemKe(@PathVariable UUID idPhieuKiemKe, HttpServletRequest request) {
        requireReadableHeader(idPhieuKiemKe, request);
        List<ChiTietKiemKe> list = chiTietKiemKeRepository.findByIdPhieuKiemKe(idPhieuKiemKe);
        chiTietKiemKeRepository.deleteAll(list);
        return ResponseEntity.ok( ApiResponse.ok("Xóa tất cả chi tiết kiểm kê"));
    }

    private boolean canReadHeader(com.erp.cuahangtienloi.entity.NhanVien actor, UUID idPhieuKiemKe) {
        return phieuKiemKeRepository.findById(idPhieuKiemKe)
                .map(header -> branchAccessService.canReadBranch(actor, header.getIdChiNhanh()))
                .orElse(false);
    }

    private void requireReadableHeader(UUID idPhieuKiemKe, HttpServletRequest request) {
        var actor = branchAccessService.requireAuthenticatedEmployee(request);
        if (!canReadHeader(actor, idPhieuKiemKe)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "Không được xem hoặc sửa chi tiết kiểm kê của chi nhánh khác");
        }
    }

//    record SuccessResponse(String message) {}
}
