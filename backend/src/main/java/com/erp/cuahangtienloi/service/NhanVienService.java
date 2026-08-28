package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.nhanvien.NhanVienCreateRequest;
import com.erp.cuahangtienloi.dto.nhanvien.NhanVienResponse;
import com.erp.cuahangtienloi.dto.nhanvien.NhanVienUpdateRequest;
import com.erp.cuahangtienloi.entity.ChiNhanh;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.exception.BusinessException;
import com.erp.cuahangtienloi.exception.ResourceNotFoundException;
import com.erp.cuahangtienloi.repository.ChiNhanhRepository;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Nghiệp vụ quản lý tài khoản nhân viên (ERP-S1-05, mục 2).
 * Rule: mật khẩu lưu dạng hash BCrypt; khóa tài khoản thay vì xóa;
 * tài khoản bị khóa không đăng nhập được (AC #3 — thực thi tại luồng đăng nhập của ERP-S1-04
 * dựa trên cờ dang_hoat_dong này).
 */
@Service
public class NhanVienService {

    private final NhanVienRepository nhanVienRepository;
    private final ChiNhanhRepository chiNhanhRepository;
    private final PasswordEncoder passwordEncoder;

    public NhanVienService(NhanVienRepository nhanVienRepository,
                           ChiNhanhRepository chiNhanhRepository,
                           PasswordEncoder passwordEncoder) {
        this.nhanVienRepository = nhanVienRepository;
        this.chiNhanhRepository = chiNhanhRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public List<NhanVienResponse> findAll() {
        return nhanVienRepository.findAll().stream()
                .map(NhanVienResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public NhanVienResponse findById(UUID id) {
        return NhanVienResponse.from(getOrThrow(id));
    }

    @Transactional
    public NhanVienResponse create(NhanVienCreateRequest req) {
        String tenDangNhap = req.getTenDangNhap().trim();
        if (nhanVienRepository.existsByTenDangNhap(tenDangNhap)) {
            throw new BusinessException("Tên đăng nhập đã tồn tại: " + tenDangNhap);
        }
        ChiNhanh chiNhanh = layChiNhanh(req.getIdChiNhanh());

        NhanVien e = new NhanVien();
        e.setTenDangNhap(tenDangNhap);
        e.setMatKhau(passwordEncoder.encode(req.getMatKhau()));
        e.setHoTen(req.getHoTen().trim());
        e.setSoDienThoai(req.getSoDienThoai());
        e.setVaiTro(req.getVaiTro());
        e.setChiNhanh(chiNhanh);
        e.setLuongTheoGio(req.getLuongTheoGio());
        e.setSoTaiKhoan(req.getSoTaiKhoan());
        e.setTenNganHang(req.getTenNganHang());
        e.setDangHoatDong(true);
        return NhanVienResponse.from(nhanVienRepository.save(e));
    }

    @Transactional
    public NhanVienResponse update(UUID id, NhanVienUpdateRequest req) {
        NhanVien e = getOrThrow(id);
        ChiNhanh chiNhanh = layChiNhanh(req.getIdChiNhanh());

        e.setHoTen(req.getHoTen().trim());
        e.setSoDienThoai(req.getSoDienThoai());
        e.setVaiTro(req.getVaiTro());
        e.setChiNhanh(chiNhanh);
        e.setLuongTheoGio(req.getLuongTheoGio());
        e.setSoTaiKhoan(req.getSoTaiKhoan());
        e.setTenNganHang(req.getTenNganHang());

        // Chỉ hash lại khi client thực sự gửi mật khẩu mới.
        if (req.getMatKhau() != null && !req.getMatKhau().isBlank()) {
            e.setMatKhau(passwordEncoder.encode(req.getMatKhau()));
        }
        return NhanVienResponse.from(nhanVienRepository.save(e));
    }

    /**
     * Khóa / mở khóa tài khoản. KHÔNG xóa dữ liệu vì nhân viên còn liên quan
     * tới chấm công, bảng lương, hóa đơn, phiếu nhập/xuất.
     */
    @Transactional
    public NhanVienResponse doiTrangThai(UUID id, boolean dangHoatDong) {
        NhanVien e = getOrThrow(id);
        e.setDangHoatDong(dangHoatDong);
        return NhanVienResponse.from(nhanVienRepository.save(e));
    }

    private ChiNhanh layChiNhanh(UUID idChiNhanh) {
        ChiNhanh chiNhanh = chiNhanhRepository.findById(idChiNhanh)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy chi nhánh với id: " + idChiNhanh));
        if (Boolean.FALSE.equals(chiNhanh.getDangHoatDong())) {
            throw new BusinessException("Không thể gán nhân viên vào chi nhánh đã bị khóa: "
                    + chiNhanh.getTenChiNhanh());
        }
        return chiNhanh;
    }

    private NhanVien getOrThrow(UUID id) {
        return nhanVienRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên với id: " + id));
    }
}
