package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.entity.ChiNhanh;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.repository.ChiNhanhRepository;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import com.erp.cuahangtienloi.repository.TaiKhoanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static com.erp.cuahangtienloi.validation.InputValidator.*;

@Service
@RequiredArgsConstructor
public class NhanVienService {

    private final NhanVienRepository nhanVienRepository;
    private final ChiNhanhRepository chiNhanhRepository;
    private final TaiKhoanRepository taiKhoanRepository;
    private final BranchAccessService branchAccessService;

    public List<NhanVien> getAll(NhanVien actor) {
        return nhanVienRepository.findAll().stream()
                .filter(nv -> branchAccessService.canReadEmployee(actor, nv))
                .toList();
    }

    public Optional<NhanVien> getById(UUID id, NhanVien actor) {
        return nhanVienRepository.findById(id)
                .filter(nv -> branchAccessService.canReadEmployee(actor, nv));
    }

    public List<NhanVien> getByChiNhanh(UUID idChiNhanh, NhanVien actor) {
        branchAccessService.requireReadableBranch(actor, idChiNhanh);
        return nhanVienRepository.findAll().stream()
                .filter(nv -> idChiNhanh.equals(nv.getIdChiNhanh()))
                .toList();
    }

    public List<NhanVien> getActive(NhanVien actor) {
        return nhanVienRepository.findAll().stream()
                .filter(nv -> branchAccessService.canReadEmployee(actor, nv))
                .filter(nv -> nv.getTrangThai() != null && !"INACTIVE".equals(nv.getTrangThai()))
                .toList();
    }

    @Transactional
    public NhanVien create(NhanVien request, NhanVien actor) {
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
            throw new IllegalArgumentException("Email đã tồn tại");
        }
        if (request.getMaNhanVien() == null || request.getMaNhanVien().trim().isEmpty()) {
            request.setMaNhanVien(generateNextMaNhanVien());
        }
        if (nhanVienRepository.existsByMaNhanVien(request.getMaNhanVien())) {
            throw new IllegalArgumentException("Mã nhân viên đã tồn tại");
        }

        String scopeError = managerScopeError(
                actor,
                request.getVaiTro(),
                request.getIdChiNhanh()
        );

        if (scopeError != null) {
            throw new IllegalArgumentException(scopeError);
        }

        NhanVien nv = new NhanVien();
        nv.setId(UUID.randomUUID());
        nv.setMaNhanVien(request.getMaNhanVien());
        String username = request.getMaNhanVien() != null ? request.getMaNhanVien() : ("nv_" + UUID.randomUUID().toString().substring(0, 8));
        nv.setTenDangNhap(username);
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
            throw new IllegalArgumentException(branchError);
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
        if (nv.getNgayVaoLam() == null) {
            nv.setNgayVaoLam(java.time.LocalDate.now());
        }

        return nhanVienRepository.save(nv);
    }

    @Transactional
    public Optional<NhanVien> update(UUID id, NhanVien request, NhanVien actor) {
        return nhanVienRepository.findById(id).map(nv -> {
            if (actor != null && "QUAN_LY".equals(actor.getVaiTro())) {
                UUID ownBranch = branchAccessService.requiredOwnBranch(actor);

                String scopeError = managerScopeError(
                        actor,
                        nv.getVaiTro(),
                        nv.getIdChiNhanh()
                );

                if (scopeError != null) {
                    throw new IllegalArgumentException(scopeError);
                }

                if (request.getVaiTro() != null && !"THU_NGAN".equals(request.getVaiTro())) {
                    throw new IllegalArgumentException("Quản lý không được đổi vai trò khác THU_NGAN");
                }

                if (request.getIdChiNhanh() != null && !ownBranch.equals(request.getIdChiNhanh())) {
                    throw new IllegalArgumentException("Quản lý không được điều chuyển thu ngân sang chi nhánh khác");
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
                    throw new IllegalArgumentException("Email đã tồn tại");
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
                    throw new IllegalArgumentException(branchError);
                }
            }
            ChiNhanh primaryBranch = chiNhanhRepository.findByIdQuanLy(nv.getId()).orElse(null);
            if (primaryBranch != null) {
                String responsibilityError = responsibilityEligibilityError(
                        primaryBranch, effectiveRole, effectiveBranchId,
                        request.getTrangThai() != null ? request.getTrangThai() : nv.getTrangThai());
                if (responsibilityError != null) {
                    throw new IllegalArgumentException("Không thể sửa nhân viên đang là người phụ trách: " + responsibilityError);
                }
            }
            nv.setIdChiNhanh(effectiveBranchId);
            if (request.getTrangThai() != null) nv.setTrangThai(request.getTrangThai());
            if (request.getNguoiCapNhat() != null) nv.setNguoiCapNhat(request.getNguoiCapNhat());
            nv.setNgayCapNhat(LocalDateTime.now());
            nhanVienRepository.save(nv);

            if (request.getTrangThai() != null) {
                taiKhoanRepository.findByIdNhanVien(nv.getId()).ifPresent(tk -> {
                    tk.setTrangThai(request.getTrangThai());
                    taiKhoanRepository.save(tk);
                });
            }
            return nv;
        });
    }

    @Transactional
    public Optional<NhanVien> update(UUID id, NhanVien request) {
        return update(id, request, null);
    }

    @Transactional
    public void delete(UUID id, NhanVien actor) {
        NhanVien target = nhanVienRepository.findById(id).orElse(null);
        if (target == null) {
            throw new IllegalArgumentException("Nhân viên không tồn tại");
        }

        if (actor != null) {
            String scopeError = managerScopeError(
                    actor,
                    target.getVaiTro(),
                    target.getIdChiNhanh()
            );

            if (scopeError != null) {
                throw new IllegalArgumentException(scopeError);
            }
        }

        if (chiNhanhRepository.findByIdQuanLy(id).isPresent()) {
            throw new IllegalArgumentException("Không thể xóa người phụ trách chi nhánh; hãy thay thế hoặc bỏ phân công trước");
        }

        taiKhoanRepository.findByIdNhanVien(id).ifPresent(taiKhoanRepository::delete);

        nhanVienRepository.deleteById(id);
    }

    public String branchAssignmentError(String role, UUID branchId) {
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

    public String responsibilityEligibilityError(
            ChiNhanh branch, String role, UUID branchId, String status) {
        if ("INACTIVE".equals(status)) return "người phụ trách phải đang hoạt động";
        if (!branch.getId().equals(branchId)) return "người phụ trách phải làm việc tại chi nhánh này";
        String expectedRole = "KHO_TONG".equals(branch.getLoai()) ? "THU_KHO" : "QUAN_LY";
        if (!expectedRole.equals(role)) return "vai trò không còn phù hợp với loại điểm";
        return null;
    }

    public String managerScopeError(
            NhanVien actor,
            String targetRole,
            UUID targetBranchId
    ) {
        if (actor == null || !"QUAN_LY".equals(actor.getVaiTro())) {
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

    public String generateNextMaNhanVien() {
        List<NhanVien> all = nhanVienRepository.findAll();
        int max = 0;
        for (NhanVien nv : all) {
            String code = nv.getMaNhanVien();
            if (code != null) {
                String trimmed = code.trim().toUpperCase();
                if (trimmed.startsWith("NV-")) {
                    String sub = trimmed.substring(3);
                    try {
                        int val = Integer.parseInt(sub);
                        if (val > max) max = val;
                    } catch (NumberFormatException ignored) {}
                }
            }
        }
        int nextVal = max + 1;
        String nextCode = String.format("NV-%04d", nextVal);
        while (nhanVienRepository.existsByMaNhanVien(nextCode)) {
            nextVal++;
            nextCode = String.format("NV-%04d", nextVal);
        }
        return nextCode;
    }
}
