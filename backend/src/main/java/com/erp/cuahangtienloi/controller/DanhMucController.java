package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.entity.DanhMuc;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.entity.SanPham;
import com.erp.cuahangtienloi.repository.DanhMucRepository;
import com.erp.cuahangtienloi.repository.SanPhamRepository;
import com.erp.cuahangtienloi.service.BranchAccessService;
import com.erp.cuahangtienloi.service.BranchProductStatusService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.erp.cuahangtienloi.validation.InputValidator.*;

@RestController
@RequestMapping("/api/danh-muc")
@RequiredArgsConstructor
//@CrossOrigin(origins = "*")
public class DanhMucController {

    private final DanhMucRepository danhMucRepository;
    private final SanPhamRepository sanPhamRepository;
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
    public ResponseEntity<List<DanhMuc>> getAll(HttpServletRequest request) {
        UUID branchId = resolveBranchId(request);
        boolean isAdmin = isAdmin();

        List<DanhMuc> list = danhMucRepository.findAll().stream()
                .map(dm -> {
                    // Clone hoặc map trạng thái theo ngữ cảnh chi nhánh
                    DanhMuc res = new DanhMuc();
                    res.setId(dm.getId());
                    res.setMaDanhMuc(dm.getMaDanhMuc());
                    res.setTenDanhMuc(dm.getTenDanhMuc());
                    res.setParentId(dm.getParentId());
                    res.setMoTa(dm.getMoTa());
                    res.setIconEmoji(dm.getIconEmoji());
                    res.setImageUrl(dm.getImageUrl());
                    res.setMauHex(dm.getMauHex());
                    res.setThuTuHienThi(dm.getThuTuHienThi());
                    res.setProductCount(dm.getProductCount());
                    res.setNgayTao(dm.getNgayTao());
                    res.setNgayCapNhat(dm.getNgayCapNhat());

                    // Nếu Admin tắt trên hệ thống -> false toàn bộ
                    if (Boolean.FALSE.equals(dm.getDangHoatDong())) {
                        res.setDangHoatDong(false);
                    } else if (!isAdmin && branchId != null && branchProductStatusService.isCategoryInactiveForBranch(branchId, dm.getId())) {
                        // Nếu chi nhánh tắt riêng danh mục này
                        res.setDangHoatDong(false);
                    } else {
                        res.setDangHoatDong(dm.getDangHoatDong() != null ? dm.getDangHoatDong() : true);
                    }
                    return res;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY', 'THU_KHO', 'THU_NGAN', 'KE_TOAN')")
    public ResponseEntity<?> getById(@PathVariable UUID id, HttpServletRequest request) {
        UUID branchId = resolveBranchId(request);
        boolean isAdmin = isAdmin();

        return danhMucRepository.findById(id)
                .map(dm -> {
                    if (Boolean.FALSE.equals(dm.getDangHoatDong())) {
                        dm.setDangHoatDong(false);
                    } else if (!isAdmin && branchId != null && branchProductStatusService.isCategoryInactiveForBranch(branchId, dm.getId())) {
                        dm.setDangHoatDong(false);
                    }
                    return ResponseEntity.ok(dm);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/active")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<DanhMuc>> getActive(HttpServletRequest request) {
        UUID branchId = resolveBranchId(request);
        boolean isAdmin = isAdmin();

        List<DanhMuc> list = danhMucRepository.findAll().stream()
                .filter(dm -> dm.getDangHoatDong() != null && dm.getDangHoatDong())
                .filter(dm -> isAdmin || branchId == null || !branchProductStatusService.isCategoryInactiveForBranch(branchId, dm.getId()))
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/parent/{parentId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<DanhMuc>> getByParent(@PathVariable UUID parentId) {
        List<DanhMuc> list = danhMucRepository.findAll().stream()
                .filter(dm -> parentId == null ? dm.getParentId() == null : parentId.equals(dm.getParentId()))
                .toList();
        return ResponseEntity.ok(list);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> create(@RequestBody DanhMuc request) {
        request.setTenDanhMuc(requireText(request.getTenDanhMuc(), "Tên danh mục", 2, 100));
        if (request.getMaDanhMuc() != null && request.getMaDanhMuc().length() > 20) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Mã danh mục tối đa 20 ký tự"));
        }
        if (request.getThuTuHienThi() != null) {
            nonNegative(request.getThuTuHienThi(), "Thứ tự hiển thị");
        }
        if (request.getParentId() != null && !danhMucRepository.existsById(request.getParentId())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Danh mục cha không tồn tại"));
        }
        if (danhMucRepository.existsByMaDanhMuc(request.getMaDanhMuc())) {
            return ResponseEntity.badRequest().body( ApiResponse.err("Mã danh mục đã tồn tại"));
        }

        DanhMuc dm = new DanhMuc();
        dm.setId(UUID.randomUUID());
        String maDM = request.getMaDanhMuc();
        if (maDM == null || maDM.isBlank()) {
            maDM = "DM-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        }
        dm.setMaDanhMuc(maDM);
        dm.setTenDanhMuc(request.getTenDanhMuc());
        dm.setParentId(request.getParentId());
        dm.setMoTa(request.getMoTa());
        dm.setIconEmoji(request.getIconEmoji());
        dm.setImageUrl(request.getImageUrl());
        dm.setMauHex(request.getMauHex());
        dm.setThuTuHienThi(request.getThuTuHienThi() != null ? request.getThuTuHienThi() : 999);
        dm.setProductCount(0);
        dm.setDangHoatDong(request.getDangHoatDong() != null ? request.getDangHoatDong() : true);
        dm.setNgayTao(LocalDateTime.now());
        dm.setNgayCapNhat(LocalDateTime.now());

        danhMucRepository.save(dm);
        return ResponseEntity.ok(dm);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody DanhMuc request) {
        return danhMucRepository.findById(id)
                .map(dm -> {
                    if (request.getTenDanhMuc() != null) {
                        request.setTenDanhMuc(requireText(request.getTenDanhMuc(), "Tên danh mục", 2, 100));
                    }
                    nonNegative(request.getThuTuHienThi(), "Thứ tự hiển thị");
                    if (request.getParentId() != null) {
                        if (request.getParentId().equals(id)) {
                            return ResponseEntity.badRequest().body(ApiResponse.err("Danh mục không thể là cha của chính nó"));
                        }
                        if (!danhMucRepository.existsById(request.getParentId())) {
                            return ResponseEntity.badRequest().body(ApiResponse.err("Danh mục cha không tồn tại"));
                        }
                    }
                    if (request.getMaDanhMuc() != null) {
                        DanhMuc duplicate = danhMucRepository.findByMaDanhMuc(request.getMaDanhMuc()).orElse(null);
                        if (duplicate != null && !duplicate.getId().equals(id)) {
                            return ResponseEntity.badRequest().body(ApiResponse.err("Mã danh mục đã tồn tại"));
                        }
                    }
                    if (request.getMaDanhMuc() != null) dm.setMaDanhMuc(request.getMaDanhMuc());
                    if (request.getTenDanhMuc() != null) dm.setTenDanhMuc(request.getTenDanhMuc());
                    if (request.getParentId() != null) dm.setParentId(request.getParentId());
                    if (request.getMoTa() != null) dm.setMoTa(request.getMoTa());
                    if (request.getIconEmoji() != null) dm.setIconEmoji(request.getIconEmoji());
                    if (request.getImageUrl() != null) dm.setImageUrl(request.getImageUrl());
                    if (request.getMauHex() != null) dm.setMauHex(request.getMauHex());
                    if (request.getThuTuHienThi() != null) dm.setThuTuHienThi(request.getThuTuHienThi());
                    if (request.getDangHoatDong() != null) dm.setDangHoatDong(request.getDangHoatDong());
                    dm.setNgayCapNhat(LocalDateTime.now());
                    danhMucRepository.save(dm);
                    return ResponseEntity.ok(dm);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Ngừng hoạt động (xoá mềm) danh mục:
     * - ADMIN: Ngừng hoạt động toàn hệ thống (dangHoatDong = false)
     *          Đồng thời chuyển tất cả sản phẩm thuộc danh mục đó thành dangHoatDong = false.
     * - QUẢN LÝ CHI NHÁNH: Chỉ ngừng hoạt động tại chi nhánh mình quản lý
     *          Đồng thời vô hiệu hóa tất cả sản phẩm thuộc danh mục đó tại chi nhánh này.
     *          Các chi nhánh khác vẫn sử dụng danh mục và sản phẩm bình thường.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<?> delete(@PathVariable UUID id, HttpServletRequest request) {
        DanhMuc dm = danhMucRepository.findById(id).orElse(null);
        if (dm == null) {
            return ResponseEntity.notFound().build();
        }

        boolean isAdmin = isAdmin();
        UUID branchId = resolveBranchId(request);

        if (!isAdmin) {
            if (branchId == null) {
                return ResponseEntity.badRequest().body(ApiResponse.err("Tài khoản chưa được gán chi nhánh để thực hiện thao tác"));
            }
            // 1. Tắt danh mục tại chi nhánh này
            branchProductStatusService.deactivateCategoryForBranch(branchId, id);

            // 2. Cascade: Tắt tất cả sản phẩm thuộc danh mục này tại chi nhánh
            List<SanPham> products = sanPhamRepository.findByIdDanhMuc(id);
            for (SanPham p : products) {
                branchProductStatusService.deactivateForBranch(branchId, p.getId());
            }

            return ResponseEntity.ok(ApiResponse.ok("Danh mục và các sản phẩm thuộc danh mục đã được chuyển sang ngừng kinh doanh tại chi nhánh này"));
        }

        // ADMIN: Ngừng hoạt động toàn hệ thống
        dm.setDangHoatDong(false);
        dm.setNgayCapNhat(LocalDateTime.now());
        danhMucRepository.save(dm);

        // Cascade: Tắt tất cả sản phẩm thuộc danh mục trên toàn hệ thống
        List<SanPham> products = sanPhamRepository.findByIdDanhMuc(id);
        for (SanPham p : products) {
            p.setDangHoatDong(false);
            p.setNgayCapNhat(LocalDateTime.now());
            sanPhamRepository.save(p);
        }

        return ResponseEntity.ok(ApiResponse.ok("Danh mục và toàn bộ sản phẩm thuộc danh mục đã được chuyển sang ngừng hoạt động trên toàn hệ thống"));
    }

    /**
     * Khôi phục hoạt động danh mục:
     * - ADMIN: Khôi phục toàn hệ thống (dangHoatDong = true)
     * - QUẢN LÝ CHI NHÁNH: Khôi phục tại chi nhánh mình
     */
    @PatchMapping("/{id}/restore")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<?> restore(@PathVariable UUID id, HttpServletRequest request) {
        DanhMuc dm = danhMucRepository.findById(id).orElse(null);
        if (dm == null) {
            return ResponseEntity.notFound().build();
        }

        boolean isAdmin = isAdmin();
        UUID branchId = resolveBranchId(request);

        if (isAdmin) {
            dm.setDangHoatDong(true);
            dm.setNgayCapNhat(LocalDateTime.now());
            danhMucRepository.save(dm);

            // Khôi phục các sản phẩm thuộc danh mục
            List<SanPham> products = sanPhamRepository.findByIdDanhMuc(id);
            for (SanPham p : products) {
                p.setDangHoatDong(true);
                p.setNgayCapNhat(LocalDateTime.now());
                sanPhamRepository.save(p);
            }
            return ResponseEntity.ok(ApiResponse.ok("Danh mục và các sản phẩm thuộc danh mục đã được kích hoạt lại trên toàn hệ thống"));
        } else {
            if (Boolean.FALSE.equals(dm.getDangHoatDong())) {
                return ResponseEntity.badRequest().body(ApiResponse.err("Danh mục đang bị Admin ngừng kinh doanh toàn hệ thống, không thể mở lại từ chi nhánh"));
            }
            if (branchId != null) {
                branchProductStatusService.activateCategoryForBranch(branchId, id);

                // Khôi phục các sản phẩm thuộc danh mục tại chi nhánh
                List<SanPham> products = sanPhamRepository.findByIdDanhMuc(id);
                for (SanPham p : products) {
                    branchProductStatusService.activateForBranch(branchId, p.getId());
                }
            }
            return ResponseEntity.ok(ApiResponse.ok("Danh mục và các sản phẩm đã được kích hoạt kinh doanh lại tại chi nhánh"));
        }
    }

    /**
     * Di chuyển danh mục lên trên (giảm thuTuHienThi) bằng cách swap với danh mục
     * có thuTuHienThi nhỏ hơn liền kề nhất.
     */
    @PatchMapping("/{id}/move-up")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> moveUp(@PathVariable UUID id) {
        return danhMucRepository.findById(id)
                .map(current -> {
                    List<DanhMuc> all = danhMucRepository.findAll();
                    Optional<DanhMuc> target = all.stream()
                            .filter(dm -> dm.getThuTuHienThi() != null
                                    && current.getThuTuHienThi() != null
                                    && dm.getThuTuHienThi() < current.getThuTuHienThi()
                                    && !dm.getId().equals(id))
                            .max(Comparator.comparingInt(DanhMuc::getThuTuHienThi));
                    if (target.isEmpty()) {
                        return ResponseEntity.ok(ApiResponse.ok("Danh mục đã ở vị trí đầu"));
                    }
                    int tmp = current.getThuTuHienThi();
                    current.setThuTuHienThi(target.get().getThuTuHienThi());
                    target.get().setThuTuHienThi(tmp);
                    current.setNgayCapNhat(LocalDateTime.now());
                    target.get().setNgayCapNhat(LocalDateTime.now());
                    danhMucRepository.save(current);
                    danhMucRepository.save(target.get());
                    return ResponseEntity.ok(ApiResponse.ok("Di chuyển lên thành công"));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Di chuyển danh mục xuống dưới (tăng thuTuHienThi) bằng cách swap với danh mục
     * có thuTuHienThi lớn hơn liền kề nhất.
     */
    @PatchMapping("/{id}/move-down")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> moveDown(@PathVariable UUID id) {
        return danhMucRepository.findById(id)
                .map(current -> {
                    List<DanhMuc> all = danhMucRepository.findAll();
                    Optional<DanhMuc> target = all.stream()
                            .filter(dm -> dm.getThuTuHienThi() != null
                                    && current.getThuTuHienThi() != null
                                    && dm.getThuTuHienThi() > current.getThuTuHienThi()
                                    && !dm.getId().equals(id))
                            .min(Comparator.comparingInt(DanhMuc::getThuTuHienThi));
                    if (target.isEmpty()) {
                        return ResponseEntity.ok(ApiResponse.ok("Danh mục đã ở vị trí cuối"));
                    }
                    int tmp = current.getThuTuHienThi();
                    current.setThuTuHienThi(target.get().getThuTuHienThi());
                    target.get().setThuTuHienThi(tmp);
                    current.setNgayCapNhat(LocalDateTime.now());
                    target.get().setNgayCapNhat(LocalDateTime.now());
                    danhMucRepository.save(current);
                    danhMucRepository.save(target.get());
                    return ResponseEntity.ok(ApiResponse.ok("Di chuyển xuống thành công"));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
