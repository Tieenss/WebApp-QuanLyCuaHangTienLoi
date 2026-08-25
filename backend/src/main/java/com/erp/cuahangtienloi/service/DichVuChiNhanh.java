package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.PhanHoiChiNhanh;
import com.erp.cuahangtienloi.dto.YeuCauChiNhanh;
import com.erp.cuahangtienloi.entity.ChiNhanh;
import com.erp.cuahangtienloi.repository.ChiNhanhRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class DichVuChiNhanh {

    private final ChiNhanhRepository chiNhanhRepository;

    public DichVuChiNhanh(ChiNhanhRepository chiNhanhRepository) {
        this.chiNhanhRepository = chiNhanhRepository;
    }

    private boolean isUserAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    private PhanHoiChiNhanh mapToResponse(ChiNhanh chiNhanh) {
        return PhanHoiChiNhanh.builder()
                .id(chiNhanh.getId())
                .tenChiNhanh(chiNhanh.getTenChiNhanh())
                .diaChi(chiNhanh.getDiaChi())
                .loai(chiNhanh.getLoai())
                .dangHoatDong(chiNhanh.getDangHoatDong())
                .ngayTao(chiNhanh.getNgayTao())
                .build();
    }

    /**
     * Lấy danh sách toàn bộ chi nhánh.
     * Admin xem được tất cả (cả chi nhánh ngừng hoạt động).
     * Các vai trò khác chỉ xem được chi nhánh đang hoạt động.
     */
    @Transactional(readOnly = true)
    public List<PhanHoiChiNhanh> layDanhSachTatCa() {
        boolean isAdmin = isUserAdmin();
        List<ChiNhanh> list = chiNhanhRepository.findAll();

        return list.stream()
                .filter(cn -> isAdmin || cn.getDangHoatDong())
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Xem chi tiết 1 chi nhánh.
     */
    @Transactional(readOnly = true)
    public PhanHoiChiNhanh layChiTiet(UUID id) {
        ChiNhanh chiNhanh = chiNhanhRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chi nhánh với ID: " + id));

        // Người dùng không phải Admin không được xem chi nhánh đã bị vô hiệu hóa
        if (!chiNhanh.getDangHoatDong() && !isUserAdmin()) {
            throw new AccessDeniedException("Bạn không có quyền xem thông tin chi nhánh đã ngừng hoạt động.");
        }

        return mapToResponse(chiNhanh);
    }

    /**
     * Tạo mới chi nhánh. Chỉ dành cho Admin.
     */
    @Transactional
    public PhanHoiChiNhanh taoMoi(YeuCauChiNhanh request) {
        ChiNhanh chiNhanh = ChiNhanh.builder()
                .tenChiNhanh(request.getTenChiNhanh())
                .diaChi(request.getDiaChi())
                .loai(request.getLoai())
                .dangHoatDong(true)
                .build();

        ChiNhanh saved = chiNhanhRepository.save(chiNhanh);
        return mapToResponse(saved);
    }

    /**
     * Cập nhật thông tin chi nhánh. Chỉ dành cho Admin.
     */
    @Transactional
    public PhanHoiChiNhanh capNhat(UUID id, YeuCauChiNhanh request) {
        ChiNhanh chiNhanh = chiNhanhRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chi nhánh với ID: " + id));

        chiNhanh.setTenChiNhanh(request.getTenChiNhanh());
        chiNhanh.setDiaChi(request.getDiaChi());
        chiNhanh.setLoai(request.getLoai());

        ChiNhanh updated = chiNhanhRepository.save(chiNhanh);
        return mapToResponse(updated);
    }

    /**
     * Vô hiệu hóa (Khóa/Ngừng hoạt động) chi nhánh thay vì xóa vật lý khỏi cơ sở dữ liệu.
     * Chỉ dành cho Admin.
     */
    @Transactional
    public void voHieuHoa(UUID id) {
        ChiNhanh chiNhanh = chiNhanhRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chi nhánh với ID: " + id));

        chiNhanh.setDangHoatDong(false);
        chiNhanhRepository.save(chiNhanh);
    }
}
