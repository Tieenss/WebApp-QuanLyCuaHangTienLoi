package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.entity.ChiNhanh;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.entity.TaiKhoan;
import com.erp.cuahangtienloi.repository.ChiNhanhRepository;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import com.erp.cuahangtienloi.repository.TaiKhoanRepository;
import com.erp.cuahangtienloi.service.BranchAccessService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.Set;

import static com.erp.cuahangtienloi.validation.InputValidator.*;

@RestController
@RequestMapping("/api/nhan-vien")
@RequiredArgsConstructor
//@CrossOrigin(origins = "*")
public class NhanVienController {

    private final NhanVienRepository nhanVienRepository;
    private final ChiNhanhRepository chiNhanhRepository;
    private final TaiKhoanRepository taiKhoanRepository;
    private final BranchAccessService branchAccessService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<List<NhanVien>> getAll(HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        return ResponseEntity.ok(nhanVienRepository.findAll().stream()
                .filter(nv -> branchAccessService.canReadEmployee(actor, nv)).toList());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<?> getById(@PathVariable UUID id, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        return nhanVienRepository.findById(id)
                .filter(nv -> branchAccessService.canReadEmployee(actor, nv))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-chi-nhanh/{idChiNhanh}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<List<NhanVien>> getByChiNhanh(@PathVariable UUID idChiNhanh, HttpServletRequest request) {
        branchAccessService.requireReadableBranch(branchAccessService.requireAuthenticatedEmployee(request), idChiNhanh);
        List<NhanVien> list = nhanVienRepository.findAll().stream()
                .filter(nv -> idChiNhanh.equals(nv.getIdChiNhanh()))
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<List<NhanVien>> getActive(HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        List<NhanVien> list = nhanVienRepository.findAll().stream()
                .filter(nv -> branchAccessService.canReadEmployee(actor, nv))
                .filter(nv -> nv.getTrangThai() != null && !"INACTIVE".equals(nv.getTrangThai()))
                .toList();
        return ResponseEntity.ok(list);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<?> create(@RequestBody NhanVien request, HttpServletRequest httpRequest) {
        NhanVien actor =
                branchAccessService.requireAuthenticatedEmployee(httpRequest);

        request.setHoTen(requireText(request.getHoTen(), "Họ tên", 1, 255));
        optionalEmail(request.getEmail());
        optionalPhone(request.getSoDienThoai(), "Số điện thoại");
        oneOf(request.getVaiTro(), "Vai trò", Set.of("ADMIN", "KE_TOAN", "THU_KHO", "QUAN_LY", "THU_NGAN"));
        nonNegative(request.getLuongCung(), "Lương cứng");
        nonNegative(request.getLuongTheoGio(), "Lương theo giờ");
        if (request.getTrangThai() != null) {
            oneOf(request.getTrangThai(), "Trạng thái", Set.of("ACTIVE", "INACTIVE"));
        }
        if (request.getEmail() != null && nhanVienRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body( ApiResponse.err("Email đã tồn tại"));
        }
        if (request.getMaNhanVien() != null && nhanVienRepository.existsByMaNhanVien(request.getMaNhanVien())) {
            return ResponseEntity.badRequest().body( ApiResponse.err("Mã nhân viên đã tồn tại"));
        }

        String scopeError = managerScopeError(
                actor,
                request.getVaiTro(),
                request.getIdChiNhanh()
        );

        if (scopeError != null) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.err(scopeError));
        }

        NhanVien nv = new NhanVien();
        nv.setId(UUID.randomUUID());
        nv.setMaNhanVien(request.getMaNhanVien());
        // ten_dang_nhap bắt buộc NOT NULL theo DB, dùng mã NV làm username mặc định
        String username = request.getMaNhanVien() != null ? request.getMaNhanVien() : ("nv_" + UUID.randomUUID().toString().substring(0, 8));
        nv.setTenDangNhap(username);
        // mat_khau cũng NOT NULL theo DB - hash placeholder, user sẽ đổi sau qua /tai-khoan
        nv.setMatKhau("$2a$10$PLACEHOLDER_HASH_user_will_reset");
        nv.setHoTen(request.getHoTen());
        nv.setEmail(request.getEmail());
        nv.setSoDienThoai(request.getSoDienThoai());
        nv.setVaiTro(request.getVaiTro());
        nv.setViTri(request.getViTri());
        nv.setLoaiHopDong(request.getLoaiHopDong() != null ? request.getLoaiHopDong() : "FULL_TIME");
        nv.setCaMacDinh(request.getCaMacDinh() != null ? request.getCaMacDinh() : "MORNING");
        nv.setLuongTheoGio(request.getLuongTheoGio());
        nv.setLuongCung(request.getLuongCung());
        String vaiTro = request.getVaiTro();
        String branchError = branchAssignmentError(vaiTro, request.getIdChiNhanh());
        if (branchError != null) {
            return ResponseEntity.badRequest().body(ApiResponse.err(branchError));
        }
        nv.setIdChiNhanh("ADMIN".equals(vaiTro) || "KE_TOAN".equals(vaiTro)
                ? null : request.getIdChiNhanh());
        nv.setTrangThai(request.getTrangThai() != null ? request.getTrangThai() : "ACTIVE");
        nv.setSoTaiKhoan(request.getSoTaiKhoan());
        nv.setTenNganHang(request.getTenNganHang());
        nv.setNgayVaoLam(request.getNgayVaoLam());
        nv.setNguoiTao(request.getNguoiTao());
        nv.setNgayTao(LocalDateTime.now());
        nv.setNgayCapNhat(LocalDateTime.now());
        // ngay_vao_lam NOT NULL theo DB
        if (nv.getNgayVaoLam() == null) {
            nv.setNgayVaoLam(java.time.LocalDate.now());
        }

        nhanVienRepository.save(nv);
        return ResponseEntity.ok(nv);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody NhanVien request, HttpServletRequest httpRequest) {
        NhanVien actor =
                branchAccessService.requireAuthenticatedEmployee(httpRequest);

        return nhanVienRepository.findById(id)
                .map(nv -> {
                    if ("QUAN_LY".equals(actor.getVaiTro())) {
                        UUID ownBranch = branchAccessService.requiredOwnBranch(actor);

                        String scopeError = managerScopeError(
                                actor,
                                nv.getVaiTro(),
                                nv.getIdChiNhanh()
                        );

                        if (scopeError != null) {
                            return ResponseEntity
                                    .status(HttpStatus.FORBIDDEN)
                                    .body(ApiResponse.err(scopeError));
                        }

                        if (request.getVaiTro() != null
                                && !"THU_NGAN".equals(request.getVaiTro())) {

                            return ResponseEntity
                                    .badRequest()
                                    .body(ApiResponse.err(
                                            "Quản lý không được đổi vai trò khác THU_NGAN"
                                    ));
                        }

                        if (request.getIdChiNhanh() != null
                                && !ownBranch.equals(request.getIdChiNhanh())) {

                            return ResponseEntity
                                    .badRequest()
                                    .body(ApiResponse.err(
                                            "Quản lý không được điều chuyển thu ngân sang chi nhánh khác"
                                    ));
                        }
                    }

                    if (request.getHoTen() != null) {
                        request.setHoTen(requireText(request.getHoTen(), "Họ tên", 1, 255));
                    }
                    optionalEmail(request.getEmail());
                    optionalPhone(request.getSoDienThoai(), "Số điện thoại");
                    nonNegative(request.getLuongCung(), "Lương cứng");
                    nonNegative(request.getLuongTheoGio(), "Lương theo giờ");
                    if (request.getEmail() != null) {
                        NhanVien duplicate = nhanVienRepository.findByEmail(request.getEmail()).orElse(null);
                        if (duplicate != null && !duplicate.getId().equals(id)) {
                            return ResponseEntity.badRequest().body(ApiResponse.err("Email đã tồn tại"));
                        }
                    }
                    if (request.getVaiTro() != null) {
                        oneOf(request.getVaiTro(), "Vai trò", Set.of("ADMIN", "KE_TOAN", "THU_KHO", "QUAN_LY", "THU_NGAN"));
                    }
                    if (request.getTrangThai() != null) {
                        oneOf(request.getTrangThai(), "Trạng thái", Set.of("ACTIVE", "INACTIVE"));
                    }
                    if (request.getHoTen() != null) nv.setHoTen(request.getHoTen());
                    if (request.getEmail() != null) nv.setEmail(request.getEmail());
                    if (request.getSoDienThoai() != null) nv.setSoDienThoai(request.getSoDienThoai());
                    if (request.getVaiTro() != null) nv.setVaiTro(request.getVaiTro());
                    if (request.getViTri() != null) nv.setViTri(request.getViTri());
                    if (request.getLoaiHopDong() != null) nv.setLoaiHopDong(request.getLoaiHopDong());
                    if (request.getCaMacDinh() != null) nv.setCaMacDinh(request.getCaMacDinh());
                    if (request.getLuongTheoGio() != null) nv.setLuongTheoGio(request.getLuongTheoGio());
                    if (request.getLuongCung() != null) nv.setLuongCung(request.getLuongCung());
                    String effectiveRole = request.getVaiTro() != null ? request.getVaiTro() : nv.getVaiTro();
                    UUID effectiveBranchId = ("ADMIN".equals(effectiveRole) || "KE_TOAN".equals(effectiveRole))
                            ? null
                            : (request.getIdChiNhanh() != null ? request.getIdChiNhanh() : nv.getIdChiNhanh());
                    if (request.getVaiTro() != null || request.getIdChiNhanh() != null) {
                        String branchError = branchAssignmentError(effectiveRole, effectiveBranchId);
                        if (branchError != null) {
                            return ResponseEntity.badRequest().body(ApiResponse.err(branchError));
                        }
                    }
                    ChiNhanh primaryBranch = chiNhanhRepository.findByIdQuanLy(nv.getId()).orElse(null);
                    if (primaryBranch != null) {
                        String responsibilityError = responsibilityEligibilityError(
                                primaryBranch, effectiveRole, effectiveBranchId,
                                request.getTrangThai() != null ? request.getTrangThai() : nv.getTrangThai());
                        if (responsibilityError != null) {
                            return ResponseEntity.badRequest().body(ApiResponse.err(
                                    "Không thể sửa nhân viên đang là người phụ trách: " + responsibilityError));
                        }
                    }
                    nv.setIdChiNhanh(effectiveBranchId);
                    if (request.getTrangThai() != null) nv.setTrangThai(request.getTrangThai());
                    if (request.getNguoiCapNhat() != null) nv.setNguoiCapNhat(request.getNguoiCapNhat());
                    nv.setNgayCapNhat(LocalDateTime.now());
                    nhanVienRepository.save(nv);
                    // Đồng bộ trạng thái tài khoản: sửa NV "đang hoạt động" thì bật luôn tài khoản
                    if (request.getTrangThai() != null) {
                        taiKhoanRepository.findByIdNhanVien(nv.getId()).ifPresent(tk -> {
                            tk.setTrangThai(request.getTrangThai());
                            taiKhoanRepository.save(tk);
                        });
                    }
                    return ResponseEntity.ok(nv);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<?> delete(@PathVariable UUID id, HttpServletRequest httpRequest) {
        NhanVien actor =
                branchAccessService.requireAuthenticatedEmployee(httpRequest);

        NhanVien target =
                nhanVienRepository.findById(id).orElse(null);

        if (target != null) {
            String scopeError = managerScopeError(
                    actor,
                    target.getVaiTro(),
                    target.getIdChiNhanh()
            );

            if (scopeError != null) {
                return ResponseEntity
                        .status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.err(scopeError));
            }
        }

        if (chiNhanhRepository.findByIdQuanLy(id).isPresent()) {
            return ResponseEntity.badRequest().body(ApiResponse.err(
                    "Không thể xóa người phụ trách; hãy thay thế hoặc bỏ phân công trước"));
        }
        if (nhanVienRepository.existsById(id)) {
            nhanVienRepository.deleteById(id);
            return ResponseEntity.ok( ApiResponse.ok("Xóa nhân viên thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    private String branchAssignmentError(String role, UUID branchId) {
        if ("ADMIN".equals(role) || "KE_TOAN".equals(role)) return null;
        if (branchId == null) return "Vai trò " + role + " bắt buộc phải có chi nhánh";

        ChiNhanh branch = chiNhanhRepository.findById(branchId).orElse(null);
        if (branch == null) return "Chi nhánh không tồn tại";
        if (!Boolean.TRUE.equals(branch.getDangHoatDong())) {
            return "Không thể gán nhân viên vào chi nhánh ngừng hoạt động";
        }
        if ("THU_KHO".equals(role) && !"KHO_TONG".equals(branch.getLoai())) {
            return "THU_KHO chỉ được gán vào Kho tổng";
        }
        if (("QUAN_LY".equals(role) || "THU_NGAN".equals(role))
                && !"CUA_HANG_BAN_LE".equals(branch.getLoai())) {
            return role + " chỉ được gán vào Cửa hàng bán lẻ";
        }
        return null;
    }

    private String responsibilityEligibilityError(
            ChiNhanh branch, String role, UUID branchId, String status) {
        if ("INACTIVE".equals(status)) return "người phụ trách phải đang hoạt động";
        if (!branch.getId().equals(branchId)) return "người phụ trách phải làm việc tại chi nhánh này";
        String expectedRole = "KHO_TONG".equals(branch.getLoai()) ? "THU_KHO" : "QUAN_LY";
        if (!expectedRole.equals(role)) return "vai trò không còn phù hợp với loại điểm";
        return null;
    }

    private String managerScopeError(
            NhanVien actor,
            String targetRole,
            UUID targetBranchId
    ) {
        if (!"QUAN_LY".equals(actor.getVaiTro())) {
            return null;
        }

        if (!"THU_NGAN".equals(targetRole)) {
            return "Quản lý chỉ được quản lý nhân viên thu ngân (THU_NGAN)";
        }

        UUID ownBranch = branchAccessService.requiredOwnBranch(actor);

        if (targetBranchId == null || !ownBranch.equals(targetBranchId)) {
            return "Quản lý chỉ được quản lý nhân viên tại chi nhánh của mình";
        }

        return null;
    }


}
