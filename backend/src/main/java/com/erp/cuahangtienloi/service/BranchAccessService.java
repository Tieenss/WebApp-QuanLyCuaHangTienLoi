package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

/** Phạm vi dữ liệu chi nhánh được quyết định ở backend, không tin giá trị từ UI. */
@Service
@RequiredArgsConstructor
public class BranchAccessService {

    private final NhanVienRepository nhanVienRepository;

    public NhanVien requireAuthenticatedEmployee(HttpServletRequest request) {
        Object attribute = request.getAttribute("authenticatedIdNhanVien");
        if (attribute instanceof String value) {
            try {
                return nhanVienRepository.findById(UUID.fromString(value))
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                                "Nhân viên đăng nhập không tồn tại"));
            } catch (IllegalArgumentException ignored) {
                // Trả lỗi thống nhất ở dưới nếu attribute không phải UUID hợp lệ.
            }
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                "Tài khoản chưa liên kết nhân viên");
    }

    public boolean isSystemWide(NhanVien employee) {
        return "ADMIN".equals(employee.getVaiTro()) || "KE_TOAN".equals(employee.getVaiTro());
    }

    /**
     * Kiểm tra một chi nhánh cụ thể. Nhân viên gán thiếu chi nhánh bị từ chối
     * thay vì vô tình được cấp quyền xem toàn hệ thống.
     */
    public void requireReadableBranch(NhanVien employee, UUID requestedBranchId) {
        if (isSystemWide(employee)) return;
        if (employee.getIdChiNhanh() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Nhân viên chưa được gán chi nhánh");
        }
        if (!employee.getIdChiNhanh().equals(requestedBranchId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Không được xem dữ liệu của chi nhánh khác");
        }
    }

    public boolean canReadBranch(NhanVien employee, UUID branchId) {
        return isSystemWide(employee)
                || (employee.getIdChiNhanh() != null && employee.getIdChiNhanh().equals(branchId));
    }

    /** ADMIN/Kế toán xem toàn hệ thống; Quản lý xem nhân sự chi nhánh mình;
     * các vai trò khác chỉ xem hồ sơ của chính mình. */
    public boolean canReadEmployee(NhanVien actor, NhanVien target) {
        if (isSystemWide(actor)) return true;
        if (actor.getId().equals(target.getId())) return true;
        return "QUAN_LY".equals(actor.getVaiTro())
                && actor.getIdChiNhanh() != null
                && actor.getIdChiNhanh().equals(target.getIdChiNhanh());
    }

    /** Điều chuyển có hai đầu kho: thủ kho chỉ xem đầu xuất, quản lý chỉ xem đầu nhận. */
    public boolean canReadTransfer(NhanVien actor, UUID sourceBranchId, UUID destinationBranchId) {
        if (isSystemWide(actor) || actor.getIdChiNhanh() == null) return isSystemWide(actor);
        if ("THU_KHO".equals(actor.getVaiTro())) {
            return actor.getIdChiNhanh().equals(sourceBranchId);
        }
        if ("QUAN_LY".equals(actor.getVaiTro())) {
            return actor.getIdChiNhanh().equals(destinationBranchId);
        }
        return false;
    }

    public UUID requiredOwnBranch(NhanVien employee) {
        if (employee.getIdChiNhanh() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Nhân viên chưa được gán chi nhánh");
        }
        return employee.getIdChiNhanh();
    }
}
