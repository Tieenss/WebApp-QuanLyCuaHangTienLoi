package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.CreateSanPhamRequest;
import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.dto.SanPhamDTO;
import com.erp.cuahangtienloi.dto.UpdateSanPhamRequest;
import com.erp.cuahangtienloi.entity.DanhMuc;
import com.erp.cuahangtienloi.entity.NhaCungCap;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.entity.SanPham;
import com.erp.cuahangtienloi.repository.DanhMucRepository;
import com.erp.cuahangtienloi.repository.NhaCungCapRepository;
import com.erp.cuahangtienloi.repository.SanPhamRepository;
import com.erp.cuahangtienloi.service.BranchAccessService;
import com.erp.cuahangtienloi.service.BranchProductStatusService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
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
    private final BranchAccessService branchAccessService;
    private final BranchProductStatusService branchProductStatusService;

    private boolean isAdmin() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    private UUID resolveBranchId(HttpServletRequest request) {
        if (request == null) return null;
        Object attr = request.getAttribute("authenticatedIdChiNhanh");
        if (attr instanceof String value && !value.isBlank()) {
            try {
                return UUID.fromString(value);
            } catch (IllegalArgumentException ignored) {}
        }
        try {
            NhanVien emp = branchAccessService.requireAuthenticatedEmployee(request);
            return emp != null ? emp.getIdChiNhanh() : null;
        } catch (Exception ignored) {
            return null;
        }
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<SanPhamDTO>> getAll(HttpServletRequest request) {
        UUID branchId = resolveBranchId(request);
        boolean isAdmin = isAdmin();

        List<SanPhamDTO> list = sanPhamRepository.findAll().stream()
                .map(sp -> {
                    SanPhamDTO dto = toDTO(sp);
                    // Nếu Admin đã tắt dangHoatDong ở san_pham -> false cho toàn bộ chi nhánh
                    if (Boolean.FALSE.equals(sp.getDangHoatDong())) {
                        dto.setDangHoatDong(false);
                    } else if (!isAdmin && branchId != null) {
                        // Nếu Quản lý chi nhánh đã xoá mềm sản phẩm hoặc danh mục của nó tại chi nhánh này
                        if (branchProductStatusService.isInactiveForBranch(branchId, sp.getId())
                                || (sp.getIdDanhMuc() != null && branchProductStatusService.isCategoryInactiveForBranch(branchId, sp.getIdDanhMuc()))) {
                            dto.setDangHoatDong(false);
                        }
                    }
                    return dto;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
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
        List<SanPhamDTO> list = sanPhamRepository.findByIdDanhMuc(idDanhMuc).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
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
    public ResponseEntity<List<SanPhamDTO>> getActive(HttpServletRequest request) {
        UUID branchId = resolveBranchId(request);
        boolean isAdmin = isAdmin();

        List<SanPhamDTO> list = sanPhamRepository.findByDangHoatDong(true).stream()
                .filter(sp -> {
                    if (isAdmin || branchId == null) return true;
                    if (branchProductStatusService.isInactiveForBranch(branchId, sp.getId())) return false;
                    if (sp.getIdDanhMuc() != null && branchProductStatusService.isCategoryInactiveForBranch(branchId, sp.getIdDanhMuc())) return false;
                    return true;
                })
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
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
    @PreAuthorize("hasRole('ADMIN')")
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

    /**
     * Xóa sản phẩm phân luồng:
     * - Chỉ ADMIN mới có thể xóa cứng (khi chưa có dữ liệu khóa ngoại; nếu đã có khóa ngoại thì tự động chuyển sang xoá mềm toàn chuỗi).
     * - QUẢN LÝ CHI NHÁNH: Mặc định chỉ có thể xoá mềm sản phẩm thuộc chi nhánh đó (các chi nhánh khác vẫn sử dụng bình thường).
     * - Khi ADMIN xoá mềm: tất cả các chi nhánh đều bị ảnh hưởng (dangHoatDong = false trên toàn hệ thống).
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<?> delete(@PathVariable UUID id,
                                    @RequestParam(value = "permanent", defaultValue = "false") boolean permanent,
                                    HttpServletRequest request) {
        SanPham sp = sanPhamRepository.findById(id).orElse(null);
        if (sp == null) {
            return ResponseEntity.notFound().build();
        }

        boolean isAdmin = isAdmin();
        UUID branchId = resolveBranchId(request);

        if (!isAdmin) {
            // Quản lý chi nhánh: Mặc định chỉ có thể xoá mềm sản phẩm tại chi nhánh mình
            if (branchId == null) {
                return ResponseEntity.badRequest().body(ApiResponse.err("Tài khoản chưa được gán chi nhánh để thực hiện thao tác"));
            }
            branchProductStatusService.deactivateForBranch(branchId, id);
            return ResponseEntity.ok(ApiResponse.ok("Sản phẩm đã được chuyển sang ngừng kinh doanh tại chi nhánh này"));
        }

        // ADMIN
        if (permanent) {
            try {
                sanPhamRepository.deleteById(id);
                branchProductStatusService.removeProduct(id);
                return ResponseEntity.ok(ApiResponse.ok("Đã xóa vĩnh viễn sản phẩm khỏi hệ thống"));
            } catch (DataIntegrityViolationException ex) {
                // Đã có dữ liệu khóa ngoại (tồn kho, hóa đơn, phiếu nhập/xuất) -> xoá mềm toàn hệ thống
                sp.setDangHoatDong(false);
                sp.setNgayCapNhat(LocalDateTime.now());
                sanPhamRepository.save(sp);
                return ResponseEntity.ok(ApiResponse.ok("Sản phẩm đã phát sinh dữ liệu giao dịch/tồn kho nên không thể xóa vĩnh viễn. Hệ thống đã chuyển sang ngừng kinh doanh trên toàn chuỗi"));
            }
        } else {
            // Admin chọn xoá mềm (ngừng kinh doanh toàn chuỗi)
            sp.setDangHoatDong(false);
            sp.setNgayCapNhat(LocalDateTime.now());
            sanPhamRepository.save(sp);
            return ResponseEntity.ok(ApiResponse.ok("Sản phẩm đã được chuyển sang ngừng kinh doanh trên toàn hệ thống"));
        }
    }

    /**
     * Khôi phục / kích hoạt lại kinh doanh sản phẩm:
     * - Admin: khôi phục toàn hệ thống (dangHoatDong = true)
     * - Quản lý chi nhánh: khôi phục tại chi nhánh của mình
     */
    @PatchMapping("/{id}/restore")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<?> restore(@PathVariable UUID id, HttpServletRequest request) {
        SanPham sp = sanPhamRepository.findById(id).orElse(null);
        if (sp == null) {
            return ResponseEntity.notFound().build();
        }

        boolean isAdmin = isAdmin();
        UUID branchId = resolveBranchId(request);

        if (isAdmin) {
            sp.setDangHoatDong(true);
            sp.setNgayCapNhat(LocalDateTime.now());
            sanPhamRepository.save(sp);
            if (branchId != null) {
                branchProductStatusService.activateForBranch(branchId, id);
            }
            return ResponseEntity.ok(ApiResponse.ok("Sản phẩm đã được kích hoạt kinh doanh lại trên toàn hệ thống"));
        } else {
            if (Boolean.FALSE.equals(sp.getDangHoatDong())) {
                return ResponseEntity.badRequest().body(ApiResponse.err("Sản phẩm đang bị Admin ngừng kinh doanh toàn hệ thống, không thể mở lại từ chi nhánh"));
            }
            if (branchId != null) {
                if (sp.getIdDanhMuc() != null && branchProductStatusService.isCategoryInactiveForBranch(branchId, sp.getIdDanhMuc())) {
                    return ResponseEntity.badRequest().body(ApiResponse.err("Danh mục của sản phẩm này đang bị ngừng kinh doanh tại chi nhánh. Vui lòng kích hoạt lại danh mục trước."));
                }
                branchProductStatusService.activateForBranch(branchId, id);
            }
            return ResponseEntity.ok(ApiResponse.ok("Sản phẩm đã được kích hoạt kinh doanh lại tại chi nhánh"));
        }
    }

    private SanPhamDTO toDTO(SanPham sp) {
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

        if (sp.getIdDanhMuc() != null) {
            danhMucRepository.findById(sp.getIdDanhMuc())
                    .ifPresent(dm -> dto.setTenDanhMuc(dm.getTenDanhMuc()));
        }
        if (sp.getIdNhaCungCap() != null) {
            nhaCungCapRepository.findById(sp.getIdNhaCungCap())
                    .ifPresent(ncc -> dto.setTenNhaCungCap(ncc.getTenNcc()));
        }

        return dto;
    }

//    record ErrorResponse(String message) {}
//    record SuccessResponse(String message) {}
}
