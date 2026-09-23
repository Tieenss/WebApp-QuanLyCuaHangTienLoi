package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.CreateSanPhamRequest;
import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.dto.SanPhamDTO;
import com.erp.cuahangtienloi.dto.UpdateSanPhamRequest;
import com.erp.cuahangtienloi.entity.DanhMuc;
import com.erp.cuahangtienloi.entity.NhaCungCap;
import com.erp.cuahangtienloi.entity.SanPham;
import com.erp.cuahangtienloi.repository.DanhMucRepository;
import com.erp.cuahangtienloi.repository.NhaCungCapRepository;
import com.erp.cuahangtienloi.repository.SanPhamRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/san-pham")
@RequiredArgsConstructor
//@CrossOrigin(origins = "*")
public class SanPhamController {

    private final SanPhamRepository sanPhamRepository;
    private final DanhMucRepository danhMucRepository;
    private final NhaCungCapRepository nhaCungCapRepository;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<SanPhamDTO>> getAll() {
        return ResponseEntity.ok(toDTOList(sanPhamRepository.findAll()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getById(@PathVariable UUID id) {
        return sanPhamRepository.findById(id)
                .map(sp -> ResponseEntity.ok(toDTO(sp)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-danh-muc/{idDanhMuc}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<SanPhamDTO>> getByDanhMuc(@PathVariable UUID idDanhMuc) {
        return ResponseEntity.ok(toDTOList(sanPhamRepository.findByIdDanhMuc(idDanhMuc)));
    }

    @GetMapping("/by-ma-vach/{maVach}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getByMaVach(@PathVariable String maVach) {
        return sanPhamRepository.findByMaVach(maVach)
                .map(sp -> ResponseEntity.ok(toDTO(sp)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/active")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<SanPhamDTO>> getActive() {
        return ResponseEntity.ok(toDTOList(sanPhamRepository.findByDangHoatDong(true)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<?> create(@Valid @RequestBody CreateSanPhamRequest request) {
        if (sanPhamRepository.existsBySku(request.getSku())) {
            return ResponseEntity.badRequest().body( ApiResponse.err("SKU đã tồn tại"));
        }
        if (request.getMaVach() != null && !request.getMaVach().isBlank()
                && sanPhamRepository.existsByMaVach(request.getMaVach())) {
            return ResponseEntity.badRequest().body( ApiResponse.err("Mã vạch đã tồn tại"));
        }
        if (!danhMucRepository.existsById(request.getIdDanhMuc())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Danh mục không tồn tại"));
        }
        if (request.getIdNhaCungCap() != null && !nhaCungCapRepository.existsById(request.getIdNhaCungCap())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Nhà cung cấp không tồn tại"));
        }
        int tonToiThieu = request.getTonToiThieu() != null ? request.getTonToiThieu() : 0;
        int tonToiDa = request.getTonToiDa() != null ? request.getTonToiDa() : 0;
        if (tonToiDa > 0 && tonToiDa < tonToiThieu) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Tồn tối đa phải lớn hơn hoặc bằng tồn tối thiểu"));
        }

        SanPham sp = new SanPham();
        sp.setId(UUID.randomUUID());
        sp.setIdDanhMuc(request.getIdDanhMuc());
        sp.setSku(request.getSku());
        sp.setMaVach(request.getMaVach());
        sp.setTenSanPham(request.getTenSanPham());
        sp.setDonVi(request.getDonVi() != null ? request.getDonVi() : "PIECE");
        sp.setImageUrl(request.getImageUrl());
        sp.setMoTa(request.getMoTa());
        sp.setDangHoatDong(request.getDangHoatDong() != null ? request.getDangHoatDong() : true);
        sp.setGiaVon(request.getGiaVon() != null ? request.getGiaVon() : BigDecimal.ZERO);
        sp.setGiaBan(request.getGiaBan());
        sp.setVatPhantram(request.getVatPhantram() != null ? request.getVatPhantram() : 8);
        sp.setIdNhaCungCap(request.getIdNhaCungCap());
        sp.setTonToiThieu(request.getTonToiThieu() != null ? request.getTonToiThieu() : 0);
        sp.setTonToiDa(request.getTonToiDa() != null ? request.getTonToiDa() : 0);
        sp.setDeHong(request.getDeHong() != null ? request.getDeHong() : false);
        sp.setHanSuDungNgay(request.getHanSuDungNgay() != null ? request.getHanSuDungNgay() : 0);
        sp.setNgayTao(LocalDateTime.now());
        sp.setNgayCapNhat(LocalDateTime.now());

        sanPhamRepository.save(sp);
        return ResponseEntity.ok(toDTO(sp));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<?> update(@PathVariable UUID id, @Valid @RequestBody UpdateSanPhamRequest request) {
        return sanPhamRepository.findById(id)
                .map(sp -> {
                    if (request.getTenSanPham() != null && request.getTenSanPham().isBlank()) {
                        return ResponseEntity.badRequest().body(ApiResponse.err("Tên sản phẩm không được để trống"));
                    }
                    if (request.getSku() != null) {
                        SanPham duplicate = sanPhamRepository.findBySku(request.getSku()).orElse(null);
                        if (duplicate != null && !duplicate.getId().equals(id)) {
                            return ResponseEntity.badRequest().body(ApiResponse.err("SKU đã tồn tại"));
                        }
                    }
                    if (request.getMaVach() != null && !request.getMaVach().isBlank()) {
                        SanPham duplicate = sanPhamRepository.findByMaVach(request.getMaVach()).orElse(null);
                        if (duplicate != null && !duplicate.getId().equals(id)) {
                            return ResponseEntity.badRequest().body(ApiResponse.err("Mã vạch đã tồn tại"));
                        }
                    }
                    if (request.getIdDanhMuc() != null && !danhMucRepository.existsById(request.getIdDanhMuc())) {
                        return ResponseEntity.badRequest().body(ApiResponse.err("Danh mục không tồn tại"));
                    }
                    if (request.getIdNhaCungCap() != null && !nhaCungCapRepository.existsById(request.getIdNhaCungCap())) {
                        return ResponseEntity.badRequest().body(ApiResponse.err("Nhà cung cấp không tồn tại"));
                    }
                    int min = request.getTonToiThieu() != null
                            ? request.getTonToiThieu()
                            : (sp.getTonToiThieu() != null ? sp.getTonToiThieu() : 0);
                    int max = request.getTonToiDa() != null
                            ? request.getTonToiDa()
                            : (sp.getTonToiDa() != null ? sp.getTonToiDa() : 0);
                    if (max > 0 && max < min) {
                        return ResponseEntity.badRequest().body(ApiResponse.err("Tồn tối đa phải lớn hơn hoặc bằng tồn tối thiểu"));
                    }
                    if (request.getIdDanhMuc() != null) sp.setIdDanhMuc(request.getIdDanhMuc());
                    if (request.getSku() != null) sp.setSku(request.getSku());
                    if (request.getMaVach() != null) sp.setMaVach(request.getMaVach());
                    if (request.getTenSanPham() != null) sp.setTenSanPham(request.getTenSanPham());
                    if (request.getDonVi() != null) sp.setDonVi(request.getDonVi());
                    if (request.getImageUrl() != null) sp.setImageUrl(request.getImageUrl());
                    if (request.getMoTa() != null) sp.setMoTa(request.getMoTa());
                    if (request.getDangHoatDong() != null) sp.setDangHoatDong(request.getDangHoatDong());
                    if (request.getGiaVon() != null) sp.setGiaVon(request.getGiaVon());
                    if (request.getGiaBan() != null) sp.setGiaBan(request.getGiaBan());
                    if (request.getVatPhantram() != null) sp.setVatPhantram(request.getVatPhantram());
                    if (request.getIdNhaCungCap() != null) sp.setIdNhaCungCap(request.getIdNhaCungCap());
                    if (request.getTonToiThieu() != null) sp.setTonToiThieu(request.getTonToiThieu());
                    if (request.getTonToiDa() != null) sp.setTonToiDa(request.getTonToiDa());
                    if (request.getDeHong() != null) sp.setDeHong(request.getDeHong());
                    if (request.getHanSuDungNgay() != null) sp.setHanSuDungNgay(request.getHanSuDungNgay());
                    sp.setNgayCapNhat(LocalDateTime.now());
                    
                    sanPhamRepository.save(sp);
                    return ResponseEntity.ok(toDTO(sp));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (sanPhamRepository.existsById(id)) {
            sanPhamRepository.deleteById(id);
            return ResponseEntity.ok( ApiResponse.ok("Xóa sản phẩm thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    /** Batch load: map 1 danh sách sản phẩm → DTO với chỉ 3 SELECT tổng (thay vì 2N+1). */
    private List<SanPhamDTO> toDTOList(List<SanPham> products) {
        if (products.isEmpty()) return List.of();
        Set<UUID> dmIds = products.stream().map(SanPham::getIdDanhMuc)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Set<UUID> nccIds = products.stream().map(SanPham::getIdNhaCungCap)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Map<UUID, String> dmNames = danhMucRepository.findAllById(dmIds).stream()
                .collect(Collectors.toMap(DanhMuc::getId, DanhMuc::getTenDanhMuc));
        Map<UUID, String> nccNames = nhaCungCapRepository.findAllById(nccIds).stream()
                .collect(Collectors.toMap(NhaCungCap::getId, NhaCungCap::getTenNcc));
        return products.stream().map(sp -> toDTO(sp, dmNames, nccNames)).collect(Collectors.toList());
    }

    /** Map một sản phẩm sang DTO dùng pre-loaded lookup maps – không gọi DB. */
    private SanPhamDTO toDTO(SanPham sp, Map<UUID, String> dmNames, Map<UUID, String> nccNames) {
        SanPhamDTO dto = new SanPhamDTO();
        dto.setId(sp.getId());
        dto.setIdDanhMuc(sp.getIdDanhMuc());
        dto.setSku(sp.getSku());
        dto.setMaVach(sp.getMaVach());
        dto.setTenSanPham(sp.getTenSanPham());
        dto.setDonVi(sp.getDonVi());
        dto.setImageUrl(sp.getImageUrl());
        dto.setMoTa(sp.getMoTa());
        dto.setDangHoatDong(sp.getDangHoatDong());
        dto.setGiaVon(sp.getGiaVon());
        dto.setGiaBan(sp.getGiaBan());
        dto.setVatPhantram(sp.getVatPhantram());
        dto.setIdNhaCungCap(sp.getIdNhaCungCap());
        dto.setTonToiThieu(sp.getTonToiThieu());
        dto.setTonToiDa(sp.getTonToiDa());
        dto.setDeHong(sp.getDeHong());
        dto.setHanSuDungNgay(sp.getHanSuDungNgay());
        dto.setTenDanhMuc(sp.getIdDanhMuc() != null ? dmNames.get(sp.getIdDanhMuc()) : null);
        dto.setTenNhaCungCap(sp.getIdNhaCungCap() != null ? nccNames.get(sp.getIdNhaCungCap()) : null);
        return dto;
    }

    /** Dùng cho getById / getByMaVach – 1 sản phẩm, gọi DB theo từng ID vẫn OK. */
    private SanPhamDTO toDTO(SanPham sp) {
        String tenDanhMuc = sp.getIdDanhMuc() != null
                ? danhMucRepository.findById(sp.getIdDanhMuc()).map(DanhMuc::getTenDanhMuc).orElse(null)
                : null;
        String tenNhaCungCap = sp.getIdNhaCungCap() != null
                ? nhaCungCapRepository.findById(sp.getIdNhaCungCap()).map(NhaCungCap::getTenNcc).orElse(null)
                : null;
        return toDTO(sp,
                tenDanhMuc != null ? Map.of(sp.getIdDanhMuc(), tenDanhMuc) : Map.of(),
                tenNhaCungCap != null ? Map.of(sp.getIdNhaCungCap(), tenNhaCungCap) : Map.of());
    }

//    record ErrorResponse(String message) {}
//    record SuccessResponse(String message) {}
}
