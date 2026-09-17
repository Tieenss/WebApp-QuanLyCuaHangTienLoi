package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.entity.ChiTietPhieuXuat;
import com.erp.cuahangtienloi.repository.*;
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

    @GetMapping("/by-phieu/{idPhieuXuat}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<List<ChiTietPhieuXuat>> getByPhieuXuat(@PathVariable UUID idPhieuXuat) {
        return ResponseEntity.ok(chiTietPhieuXuatRepository.findByIdPhieuXuat(idPhieuXuat));
    }

    @GetMapping("/by-san-pham/{idSanPham}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<List<ChiTietPhieuXuat>> getBySanPham(@PathVariable UUID idSanPham) {
        return ResponseEntity.ok(chiTietPhieuXuatRepository.findByIdSanPham(idSanPham));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> create(@RequestBody ChiTietPhieuXuat request) {
        validate(request);
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
    public ResponseEntity<?> createBatch(@RequestBody List<ChiTietPhieuXuat> requests) {
        if (requests == null || requests.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Danh sách chi tiết phiếu xuất rỗng"));
        }
        for (ChiTietPhieuXuat request : requests) {
            validate(request);
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

    private void validate(ChiTietPhieuXuat request) {
        if (request.getIdPhieuXuat() == null || !phieuXuatKhoRepository.existsById(request.getIdPhieuXuat())) {
            throw new IllegalArgumentException("Phiếu xuất không tồn tại");
        }
        if (request.getIdSanPham() == null || !sanPhamRepository.existsById(request.getIdSanPham())) {
            throw new IllegalArgumentException("Sản phẩm không tồn tại");
        }
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
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (chiTietPhieuXuatRepository.existsById(id)) {
            chiTietPhieuXuatRepository.deleteById(id);
            return ResponseEntity.ok( ApiResponse.ok("Xóa chi tiết thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/by-phieu/{idPhieuXuat}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO')")
    public ResponseEntity<?> deleteByPhieuXuat(@PathVariable UUID idPhieuXuat) {
        List<ChiTietPhieuXuat> list = chiTietPhieuXuatRepository.findByIdPhieuXuat(idPhieuXuat);
        chiTietPhieuXuatRepository.deleteAll(list);
        return ResponseEntity.ok( ApiResponse.ok("Xóa tất cả chi tiết phiếu xuất"));
    }

//    record SuccessResponse(String message) {}
}
