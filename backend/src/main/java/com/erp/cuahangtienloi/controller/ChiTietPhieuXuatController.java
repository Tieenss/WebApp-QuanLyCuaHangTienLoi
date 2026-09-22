package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.entity.ChiTietPhieuXuat;
import com.erp.cuahangtienloi.repository.*;
import com.erp.cuahangtienloi.service.BranchAccessService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chi-tiet-phieu-xuat")
@RequiredArgsConstructor
//@CrossOrigin(origins = "*")
public class ChiTietPhieuXuatController {

    private final ChiTietPhieuXuatRepository chiTietPhieuXuatRepository;
    private final PhieuXuatKhoRepository phieuXuatKhoRepository;
    private final SanPhamRepository sanPhamRepository;
    private final BranchAccessService branchAccessService;

    @GetMapping("/by-phieu/{idPhieuXuat}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<List<ChiTietPhieuXuat>> getByPhieuXuat(@PathVariable UUID idPhieuXuat, HttpServletRequest request) {
        requireReadableHeader(idPhieuXuat, request);
        return ResponseEntity.ok(chiTietPhieuXuatRepository.findByIdPhieuXuat(idPhieuXuat));
    }

    @GetMapping("/by-san-pham/{idSanPham}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<List<ChiTietPhieuXuat>> getBySanPham(@PathVariable UUID idSanPham, HttpServletRequest request) {
        var actor = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(chiTietPhieuXuatRepository.findByIdSanPham(idSanPham).stream()
                .filter(ct -> canReadHeader(actor, ct.getIdPhieuXuat())).toList());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> create(@RequestBody ChiTietPhieuXuat request, HttpServletRequest httpRequest) {
        validate(request, httpRequest);
        ChiTietPhieuXuat ct = new ChiTietPhieuXuat();
        ct.setId(UUID.randomUUID());
        ct.setIdPhieuXuat(request.getIdPhieuXuat());
        ct.setIdSanPham(request.getIdSanPham());
        ct.setSoLuongYeuCau(request.getSoLuongYeuCau());
        ct.setSoLuongXuat(request.getSoLuongXuat() != null ? request.getSoLuongXuat() : 0);
        ct.setSoLuongNhan(request.getSoLuongNhan() != null ? request.getSoLuongNhan() : 0);
        ct.setDonGiaVon(request.getDonGiaVon());
        ct.setThanhTien(request.getThanhTien());
        ct.setHanSuDung(request.getHanSuDung());
        ct.setThuTu(request.getThuTu() != null ? request.getThuTu() : 0);
        ct.setNgayTao(LocalDateTime.now());

        chiTietPhieuXuatRepository.save(ct);
        return ResponseEntity.ok(ct);
    }

    @PostMapping("/batch")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> createBatch(@RequestBody List<ChiTietPhieuXuat> requests, HttpServletRequest httpRequest) {
        if (requests == null || requests.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Danh sách chi tiết phiếu xuất rỗng"));
        }
        for (ChiTietPhieuXuat request : requests) {
            validate(request, httpRequest);
            ChiTietPhieuXuat ct = new ChiTietPhieuXuat();
            ct.setId(UUID.randomUUID());
            ct.setIdPhieuXuat(request.getIdPhieuXuat());
            ct.setIdSanPham(request.getIdSanPham());
            ct.setSoLuongYeuCau(request.getSoLuongYeuCau());
            ct.setSoLuongXuat(request.getSoLuongXuat() != null ? request.getSoLuongXuat() : 0);
            ct.setSoLuongNhan(request.getSoLuongNhan() != null ? request.getSoLuongNhan() : 0);
            ct.setDonGiaVon(request.getDonGiaVon());
            ct.setThanhTien(request.getThanhTien());
            ct.setHanSuDung(request.getHanSuDung());
            ct.setThuTu(request.getThuTu() != null ? request.getThuTu() : 0);
            ct.setNgayTao(LocalDateTime.now());
            chiTietPhieuXuatRepository.save(ct);
        }
        return ResponseEntity.ok( ApiResponse.ok("Tạo chi tiết phiếu xuất thành công"));
    }

    private void validate(ChiTietPhieuXuat request, HttpServletRequest httpRequest) {
        if (request.getIdPhieuXuat() == null || !phieuXuatKhoRepository.existsById(request.getIdPhieuXuat())) {
            throw new IllegalArgumentException("Phiếu xuất không tồn tại");
        }
        if (request.getIdSanPham() == null || !sanPhamRepository.existsById(request.getIdSanPham())) {
            throw new IllegalArgumentException("Sản phẩm không tồn tại");
        }
        requireReadableHeader(request.getIdPhieuXuat(), httpRequest);
        com.erp.cuahangtienloi.validation.InputValidator.positive(request.getSoLuongYeuCau(), "Số lượng yêu cầu");
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getSoLuongXuat(), "Số lượng xuất");
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getSoLuongNhan(), "Số lượng nhận");
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getDonGiaVon(), "Đơn giá vốn");
        if (request.getSoLuongXuat() != null && request.getSoLuongXuat() > request.getSoLuongYeuCau()) {
            throw new IllegalArgumentException("Số lượng xuất không được vượt số lượng yêu cầu");
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO')")
    public ResponseEntity<?> delete(@PathVariable UUID id, HttpServletRequest request) {
        return chiTietPhieuXuatRepository.findById(id).map(ct -> {
            requireReadableHeader(ct.getIdPhieuXuat(), request);
            chiTietPhieuXuatRepository.delete(ct);
            return ResponseEntity.ok(ApiResponse.ok("Xóa chi tiết thành công"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/by-phieu/{idPhieuXuat}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO')")
    public ResponseEntity<?> deleteByPhieuXuat(@PathVariable UUID idPhieuXuat, HttpServletRequest request) {
        requireReadableHeader(idPhieuXuat, request);
        List<ChiTietPhieuXuat> list = chiTietPhieuXuatRepository.findByIdPhieuXuat(idPhieuXuat);
        chiTietPhieuXuatRepository.deleteAll(list);
        return ResponseEntity.ok( ApiResponse.ok("Xóa tất cả chi tiết phiếu xuất"));
    }

    private boolean canReadHeader(com.erp.cuahangtienloi.entity.NhanVien actor, UUID idPhieuXuat) {
        return phieuXuatKhoRepository.findById(idPhieuXuat)
                .map(header -> branchAccessService.canReadTransfer(actor,
                        header.getIdChiNhanhXuat(), header.getIdChiNhanhNhan()))
                .orElse(false);
    }

    private void requireReadableHeader(UUID idPhieuXuat, HttpServletRequest request) {
        var actor = branchAccessService.requireAuthenticatedEmployee(request);
        if (!canReadHeader(actor, idPhieuXuat)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "Không được xem hoặc sửa chi tiết điều chuyển ngoài phạm vi");
        }
    }

//    record SuccessResponse(String message) {}
}
