package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.entity.ChiNhanh;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.repository.ChiNhanhRepository;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
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
public class ChiNhanhService {

    private final ChiNhanhRepository chiNhanhRepository;
    private final NhanVienRepository nhanVienRepository;

    public List<ChiNhanh> getAll() {
        return chiNhanhRepository.findAll();
    }

    public Optional<ChiNhanh> getById(UUID id) {
        return chiNhanhRepository.findById(id);
    }

    public List<ChiNhanh> getActive() {
        return chiNhanhRepository.findAll().stream()
                .filter(cn -> cn.getDangHoatDong() != null && cn.getDangHoatDong())
                .toList();
    }

    public List<ChiNhanh> getByLoai(String loai) {
        return chiNhanhRepository.findAll().stream()
                .filter(cn -> loai.equals(cn.getLoai()))
                .toList();
    }

    public List<ChiNhanh> getKhoTong() {
        return chiNhanhRepository.findAll().stream()
                .filter(cn -> "KHO_TONG".equals(cn.getLoai()) && Boolean.TRUE.equals(cn.getDangHoatDong()))
                .toList();
    }

    public List<ChiNhanh> getCuaHang() {
        return chiNhanhRepository.findAll().stream()
                .filter(cn -> "CUA_HANG_BAN_LE".equals(cn.getLoai()) && Boolean.TRUE.equals(cn.getDangHoatDong()))
                .toList();
    }

    @Transactional
    public ChiNhanh create(ChiNhanh request) {
        if (request.getMaChiNhanh() == null || request.getMaChiNhanh().trim().isEmpty()) {
            request.setMaChiNhanh(generateNextMaChiNhanh());
        } else {
            request.setMaChiNhanh(requireText(request.getMaChiNhanh(), "Mã chi nhánh", 1, 50));
        }
        request.setTenChiNhanh(requireText(request.getTenChiNhanh(), "Tên chi nhánh", 1, 255));
        oneOf(request.getLoai(), "Loại chi nhánh", Set.of("KHO_TONG", "CUA_HANG_BAN_LE"));
        request.setSoDienThoai(requirePhone(request.getSoDienThoai(), "SĐT liên hệ chi nhánh"));
        if (request.getIdQuanLy() != null) {
            throw new IllegalArgumentException("Tạo chi nhánh không gán người phụ trách; hãy bổ nhiệm sau khi đã có nhân sự");
        }
        if (chiNhanhRepository.findByMaChiNhanh(request.getMaChiNhanh()).isPresent()) {
            throw new IllegalArgumentException("Mã chi nhánh đã tồn tại");
        }

        ChiNhanh cn = new ChiNhanh();
        cn.setId(UUID.randomUUID());
        cn.setMaChiNhanh(request.getMaChiNhanh());
        cn.setTenChiNhanh(request.getTenChiNhanh());
        cn.setDiaChi(request.getDiaChi());
        cn.setDiaChiChiTiet(request.getDiaChiChiTiet());
        cn.setTinhThanh(request.getTinhThanh());
        cn.setQuanHuyen(request.getQuanHuyen());
        cn.setVungMien(request.getVungMien());
        cn.setSoDienThoai(request.getSoDienThoai());
        cn.setGioMoCua(request.getGioMoCua());
        cn.setDienTichM2(request.getDienTichM2());
        cn.setDoanhThuThang(request.getDoanhThuThang() != null ? request.getDoanhThuThang() : 0L);
        cn.setNgayKhaiTruong(request.getNgayKhaiTruong());
        cn.setLoai(request.getLoai());
        cn.setIdQuanLy(null);
        cn.setDangHoatDong(request.getDangHoatDong() != null ? request.getDangHoatDong() : true);
        cn.setNgayTao(LocalDateTime.now());
        cn.setNguoiTao(request.getNguoiTao());
        cn.setNgayCapNhat(LocalDateTime.now());
        cn.setNguoiCapNhat(request.getNguoiCapNhat());

        return chiNhanhRepository.save(cn);
    }

    @Transactional
    public Optional<ChiNhanh> update(UUID id, ChiNhanh request) {
        return chiNhanhRepository.findById(id).map(cn -> {
            if (request.getTenChiNhanh() != null) {
                request.setTenChiNhanh(requireText(request.getTenChiNhanh(), "Tên chi nhánh", 1, 255));
            }
            if (request.getLoai() != null) {
                oneOf(request.getLoai(), "Loại chi nhánh", Set.of("KHO_TONG", "CUA_HANG_BAN_LE"));
            }
            if (request.getSoDienThoai() != null) {
                request.setSoDienThoai(requirePhone(request.getSoDienThoai(), "SĐT liên hệ chi nhánh"));
            }
            if (request.getMaChiNhanh() != null) {
                ChiNhanh duplicate = chiNhanhRepository.findByMaChiNhanh(request.getMaChiNhanh()).orElse(null);
                if (duplicate != null && !duplicate.getId().equals(id)) {
                    throw new IllegalArgumentException("Mã chi nhánh đã tồn tại");
                }
            }
            if (request.getIdQuanLy() != null) {
                throw new IllegalArgumentException("Dùng chức năng bổ nhiệm người phụ trách, không cập nhật trực tiếp");
            }
            if (request.getLoai() != null && !request.getLoai().equals(cn.getLoai())
                    && (cn.getIdQuanLy() != null || nhanVienRepository.existsByIdChiNhanh(cn.getId()))) {
                throw new IllegalArgumentException("Không thể đổi loại điểm khi chi nhánh đã có nhân sự hoặc người phụ trách");
            }
            if (request.getMaChiNhanh() != null) cn.setMaChiNhanh(request.getMaChiNhanh());
            if (request.getTenChiNhanh() != null) cn.setTenChiNhanh(request.getTenChiNhanh());
            if (request.getDiaChi() != null) cn.setDiaChi(request.getDiaChi());
            if (request.getDiaChiChiTiet() != null) cn.setDiaChiChiTiet(request.getDiaChiChiTiet());
            if (request.getTinhThanh() != null) cn.setTinhThanh(request.getTinhThanh());
            if (request.getQuanHuyen() != null) cn.setQuanHuyen(request.getQuanHuyen());
            if (request.getVungMien() != null) cn.setVungMien(request.getVungMien());
            if (request.getSoDienThoai() != null) cn.setSoDienThoai(request.getSoDienThoai());
            if (request.getGioMoCua() != null) cn.setGioMoCua(request.getGioMoCua());
            if (request.getDienTichM2() != null) cn.setDienTichM2(request.getDienTichM2());
            if (request.getDoanhThuThang() != null) cn.setDoanhThuThang(request.getDoanhThuThang());
            if (request.getNgayKhaiTruong() != null) cn.setNgayKhaiTruong(request.getNgayKhaiTruong());
            if (request.getLoai() != null) cn.setLoai(request.getLoai());
            if (request.getDangHoatDong() != null) cn.setDangHoatDong(request.getDangHoatDong());
            if (request.getNguoiCapNhat() != null) cn.setNguoiCapNhat(request.getNguoiCapNhat());
            cn.setNgayCapNhat(LocalDateTime.now());
            return chiNhanhRepository.save(cn);
        });
    }

    @Transactional
    public Optional<ChiNhanh> delete(UUID id) {
        return chiNhanhRepository.findById(id).map(cn -> {
            cn.setDangHoatDong(false);
            cn.setNgayCapNhat(LocalDateTime.now());
            return chiNhanhRepository.save(cn);
        });
    }

    @Transactional
    public Optional<ChiNhanh> assignQuanLy(UUID id, UUID idQuanLy) {
        return chiNhanhRepository.findById(id).map(cn -> {
            NhanVien nv = nhanVienRepository.findById(idQuanLy).orElse(null);
            if (nv == null) {
                throw new IllegalArgumentException("Nhân viên không tồn tại");
            }
            String validationError = responsibleAssignmentError(cn, nv);
            if (validationError != null) {
                throw new IllegalArgumentException(validationError);
            }
            if (chiNhanhRepository.existsByIdQuanLyAndIdNot(idQuanLy, id)) {
                throw new IllegalArgumentException("Nhân viên này đang là người phụ trách của chi nhánh khác");
            }
            cn.setIdQuanLy(idQuanLy);
            cn.setNgayCapNhat(LocalDateTime.now());
            return chiNhanhRepository.save(cn);
        });
    }

    @Transactional
    public Optional<ChiNhanh> clearQuanLy(UUID id) {
        return chiNhanhRepository.findById(id).map(cn -> {
            cn.setIdQuanLy(null);
            cn.setNgayCapNhat(LocalDateTime.now());
            return chiNhanhRepository.save(cn);
        });
    }

    public String responsibleAssignmentError(ChiNhanh branch, NhanVien employee) {
        if (!Boolean.TRUE.equals(branch.getDangHoatDong())) {
            return "Không thể bổ nhiệm người phụ trách cho chi nhánh ngừng hoạt động";
        }
        if ("INACTIVE".equals(employee.getTrangThai())) {
            return "Chỉ có thể bổ nhiệm nhân viên đang hoạt động";
        }
        if (!branch.getId().equals(employee.getIdChiNhanh())) {
            return "Người phụ trách phải đang làm việc tại chính chi nhánh này";
        }
        String expectedRole = "KHO_TONG".equals(branch.getLoai()) ? "THU_KHO" : "QUAN_LY";
        if (!expectedRole.equals(employee.getVaiTro())) {
            return "Kho tổng chỉ nhận THU_KHO; cửa hàng chỉ nhận QUAN_LY làm người phụ trách";
        }
        return null;
    }

    public String generateNextMaChiNhanh() {
        List<ChiNhanh> all = chiNhanhRepository.findAll();
        int max = 100;
        for (ChiNhanh cn : all) {
            String code = cn.getMaChiNhanh();
            if (code != null) {
                String trimmed = code.trim().toUpperCase();
                if (trimmed.startsWith("CK-")) {
                    String sub = trimmed.substring(3);
                    try {
                        int val = Integer.parseInt(sub);
                        if (val > max) max = val;
                    } catch (NumberFormatException ignored) {}
                }
            }
        }
        int nextVal = max + 1;
        String nextCode = String.format("CK-%04d", nextVal);
        while (chiNhanhRepository.findByMaChiNhanh(nextCode).isPresent()) {
            nextVal++;
            nextCode = String.format("CK-%04d", nextVal);
        }
        return nextCode;
    }
}
