package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.NhaCungCapDTO;
import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.entity.NhaCungCap;
import com.erp.cuahangtienloi.entity.NhaCungCapDanhMuc;
import com.erp.cuahangtienloi.repository.DanhMucRepository;
import com.erp.cuahangtienloi.repository.NhaCungCapDanhMucRepository;
import com.erp.cuahangtienloi.repository.NhaCungCapRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/nha-cung-cap")
@RequiredArgsConstructor
//@CrossOrigin(origins = "*")
public class NhaCungCapController {

    private final NhaCungCapRepository nhaCungCapRepository;
    private final NhaCungCapDanhMucRepository nccDanhMucRepository;
    private final DanhMucRepository danhMucRepository;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<NhaCungCapDTO>> getAll() {
        List<NhaCungCapDTO> list = nhaCungCapRepository.findAll().stream()
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(list);
    }
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getById(@PathVariable UUID id) {
        return nhaCungCapRepository.findById(id)
                .map(ncc -> ResponseEntity.ok(toDTO(ncc)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/active")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<NhaCungCapDTO>> getActive() {
        List<NhaCungCapDTO> list = nhaCungCapRepository.findAll().stream()
                .filter(ncc -> ncc.getDangHoatDong() != null && ncc.getDangHoatDong())
                .map(this::toDTO)
                .toList();

        return ResponseEntity.ok(list);
    }

    @Transactional
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> create(@Valid @RequestBody NhaCungCapDTO request) {

        if (request.getTenNcc() == null || request.getTenNcc().isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Tên NCC không được để trống"));
        }

        if (nhaCungCapRepository.existsByMaNcc(request.getMaNcc())) {
            return ResponseEntity.badRequest()
                    .body( ApiResponse.err("Mã NCC đã tồn tại"));
        }
        if (request.getCategoryIds() != null
                && request.getCategoryIds().stream().anyMatch(categoryId -> !danhMucRepository.existsById(categoryId))) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Danh mục của nhà cung cấp không tồn tại"));
        }

        NhaCungCap ncc = new NhaCungCap();

        ncc.setId(UUID.randomUUID());

        String maNcc = request.getMaNcc();

        if (maNcc == null || maNcc.isBlank()) {
            maNcc = "NCC-" +
                    UUID.randomUUID()
                            .toString()
                            .substring(0, 8)
                            .toUpperCase();
        }

        ncc.setMaNcc(maNcc);
        ncc.setTenNcc(request.getTenNcc());
        ncc.setMaSoThue(request.getMaSoThue());
        ncc.setSoDienThoai(request.getSoDienThoai());
        ncc.setEmail(request.getEmail());
        ncc.setDiaChi(request.getDiaChi());
        ncc.setNguoiLienHe(request.getNguoiLienHe());
        ncc.setChucDanhLienHe(request.getChucDanhLienHe());
        ncc.setSdtLienHe(request.getSdtLienHe());

        ncc.setDieuKhoanThanhToan(
                request.getDieuKhoanThanhToan() != null
                        ? request.getDieuKhoanThanhToan()
                        : "Thanh toán ngay"
        );

        ncc.setSoNgayDuocNo(
                request.getSoNgayDuocNo() != null
                        ? request.getSoNgayDuocNo()
                        : 0
        );

        ncc.setTongCongNo(
                request.getTongCongNo() != null
                        ? request.getTongCongNo()
                        : BigDecimal.ZERO
        );

        ncc.setTongDonHang(
                request.getTongDonHang() != null
                        ? request.getTongDonHang()
                        : 0
        );

        ncc.setDangHoatDong(
                request.getDangHoatDong() != null
                        ? request.getDangHoatDong()
                        : true
        );

        ncc.setGhiChu(request.getGhiChu());
        ncc.setNgayTao(LocalDateTime.now());
        ncc.setNgayCapNhat(LocalDateTime.now());

        NhaCungCap saved = nhaCungCapRepository.save(ncc);

        saveCategories(
                saved.getId(),
                request.getCategoryIds()
        );

        return ResponseEntity.ok(toDTO(saved));
    }

    @Transactional
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> update(
            @PathVariable UUID id,
            @Valid @RequestBody NhaCungCapDTO request
    ) {
        return nhaCungCapRepository.findById(id)
                .map(ncc -> {

                    if (request.getTenNcc() != null && request.getTenNcc().isBlank()) {
                        return ResponseEntity.badRequest().body(ApiResponse.err("Tên NCC không được để trống"));
                    }
                    if (request.getMaNcc() != null) {
                        NhaCungCap duplicate = nhaCungCapRepository.findByMaNcc(request.getMaNcc()).orElse(null);
                        if (duplicate != null && !duplicate.getId().equals(id)) {
                            return ResponseEntity.badRequest().body(ApiResponse.err("Mã NCC đã tồn tại"));
                        }
                    }
                    if (request.getCategoryIds() != null
                            && request.getCategoryIds().stream().anyMatch(categoryId -> !danhMucRepository.existsById(categoryId))) {
                        return ResponseEntity.badRequest().body(ApiResponse.err("Danh mục của nhà cung cấp không tồn tại"));
                    }

                    if (request.getMaNcc() != null) {
                        ncc.setMaNcc(request.getMaNcc());
                    }

                    if (request.getTenNcc() != null) {
                        ncc.setTenNcc(request.getTenNcc());
                    }

                    if (request.getMaSoThue() != null) {
                        ncc.setMaSoThue(request.getMaSoThue());
                    }

                    if (request.getSoDienThoai() != null) {
                        ncc.setSoDienThoai(request.getSoDienThoai());
                    }

                    if (request.getEmail() != null) {
                        ncc.setEmail(request.getEmail());
                    }

                    if (request.getDiaChi() != null) {
                        ncc.setDiaChi(request.getDiaChi());
                    }

                    if (request.getNguoiLienHe() != null) {
                        ncc.setNguoiLienHe(request.getNguoiLienHe());
                    }

                    if (request.getChucDanhLienHe() != null) {
                        ncc.setChucDanhLienHe(request.getChucDanhLienHe());
                    }

                    if (request.getSdtLienHe() != null) {
                        ncc.setSdtLienHe(request.getSdtLienHe());
                    }

                    if (request.getDieuKhoanThanhToan() != null) {
                        ncc.setDieuKhoanThanhToan(
                                request.getDieuKhoanThanhToan()
                        );
                    }

                    if (request.getSoNgayDuocNo() != null) {
                        ncc.setSoNgayDuocNo(request.getSoNgayDuocNo());
                    }

                    if (request.getTongCongNo() != null) {
                        ncc.setTongCongNo(request.getTongCongNo());
                    }

                    if (request.getTongDonHang() != null) {
                        ncc.setTongDonHang(request.getTongDonHang());
                    }

                    if (request.getDangHoatDong() != null) {
                        ncc.setDangHoatDong(request.getDangHoatDong());
                    }

                    if (request.getGhiChu() != null) {
                        ncc.setGhiChu(request.getGhiChu());
                    }

                    ncc.setNgayCapNhat(LocalDateTime.now());

                    NhaCungCap saved = nhaCungCapRepository.save(ncc);

                    // categoryIds được gửi lên thì cập nhật lại toàn bộ quan hệ
                    if (request.getCategoryIds() != null) {
                        nccDanhMucRepository.deleteByIdNhaCungCap(id);

                        saveCategories(
                                id,
                                request.getCategoryIds()
                        );
                    }

                    return ResponseEntity.ok(toDTO(saved));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (nhaCungCapRepository.existsById(id)) {
            nhaCungCapRepository.deleteById(id);
            return ResponseEntity.ok( ApiResponse.ok("Xóa NCC thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    private void saveCategories(UUID nccId, List<UUID> categoryIds) {

        if (categoryIds == null || categoryIds.isEmpty()) {
            return;
        }

        List<NhaCungCapDanhMuc> links = categoryIds.stream()
                .distinct()
                .map(categoryId -> {
                    NhaCungCapDanhMuc link = new NhaCungCapDanhMuc();

                    link.setIdNhaCungCap(nccId);
                    link.setIdDanhMuc(categoryId);
                    link.setNgayTao(LocalDateTime.now());

                    return link;
                })
                .toList();

        nccDanhMucRepository.saveAll(links);
    }

    private NhaCungCapDTO toDTO(NhaCungCap ncc) {

        NhaCungCapDTO dto = new NhaCungCapDTO();

        dto.setId(ncc.getId());
        dto.setMaNcc(ncc.getMaNcc());
        dto.setTenNcc(ncc.getTenNcc());
        dto.setMaSoThue(ncc.getMaSoThue());
        dto.setSoDienThoai(ncc.getSoDienThoai());
        dto.setEmail(ncc.getEmail());
        dto.setDiaChi(ncc.getDiaChi());

        dto.setNguoiLienHe(ncc.getNguoiLienHe());
        dto.setChucDanhLienHe(ncc.getChucDanhLienHe());
        dto.setSdtLienHe(ncc.getSdtLienHe());

        dto.setDieuKhoanThanhToan(ncc.getDieuKhoanThanhToan());
        dto.setSoNgayDuocNo(ncc.getSoNgayDuocNo());
        dto.setTongCongNo(ncc.getTongCongNo());
        dto.setTongDonHang(ncc.getTongDonHang());

        dto.setDangHoatDong(ncc.getDangHoatDong());
        dto.setGhiChu(ncc.getGhiChu());

        List<NhaCungCapDanhMuc> links =
                nccDanhMucRepository.findByIdNhaCungCap(ncc.getId());

        List<NhaCungCapDTO.DanhMucSummary> categories = links.stream()
                .map(link -> danhMucRepository.findById(link.getIdDanhMuc())
                        .map(dm -> {
                            NhaCungCapDTO.DanhMucSummary summary =
                                    new NhaCungCapDTO.DanhMucSummary();

                            summary.setId(dm.getId());
                            summary.setTenDanhMuc(dm.getTenDanhMuc());
                            summary.setIconEmoji(dm.getIconEmoji());
                            summary.setMauHex(dm.getMauHex());

                            return summary;
                        })
                        .orElse(null))
                .filter(Objects::nonNull)
                .toList();

        dto.setCategories(categories);

        dto.setCategoryIds(
                categories.stream()
                        .map(NhaCungCapDTO.DanhMucSummary::getId)
                        .toList()
        );

        return dto;
    }

//    record ErrorResponse(String message) {}
//    record SuccessResponse(String message) {}
}
