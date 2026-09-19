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

    public UUID requiredOwnBranch(NhanVien employee) {
        if (employee.getIdChiNhanh() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Nhân viên chưa được gán chi nhánh");
        }
        return employee.getIdChiNhanh();
    }
}
