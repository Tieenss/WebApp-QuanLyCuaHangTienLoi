package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.entity.ChiNhanh;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.repository.ChiNhanhRepository;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.Set;

import static com.erp.cuahangtienloi.validation.InputValidator.*;

@RestController
@RequestMapping("/api/chi-nhanh")
@RequiredArgsConstructor
//@CrossOrigin(origins = "*")
public class ChiNhanhController {

    private final ChiNhanhRepository chiNhanhRepository;
    private final NhanVienRepository nhanVienRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY', 'THU_KHO', 'THU_NGAN', 'KE_TOAN')")
    public ResponseEntity<List<ChiNhanh>> getAll() {
        return ResponseEntity.ok(chiNhanhRepository.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getById(@PathVariable UUID id) {
        return chiNhanhRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/active")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ChiNhanh>> getActive() {
        List<ChiNhanh> list = chiNhanhRepository.findAll().stream()
                .filter(cn -> cn.getDangHoatDong() != null && cn.getDangHoatDong())
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-loai/{loai}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ChiNhanh>> getByLoai(@PathVariable String loai) {
        List<ChiNhanh> list = chiNhanhRepository.findAll().stream()
                .filter(cn -> loai.equals(cn.getLoai()))
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/kho-tong")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ChiNhanh>> getKhoTong() {
        List<ChiNhanh> list = chiNhanhRepository.findAll().stream()
                .filter(cn -> "KHO_TONG".equals(cn.getLoai()))
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/cua-hang")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ChiNhanh>> getCuaHang() {
        List<ChiNhanh> list = chiNhanhRepository.findAll().stream()
                .filter(cn -> "CUA_HANG_BAN_LE".equals(cn.getLoai()))
                .toList();
        return ResponseEntity.ok(list);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> create(@RequestBody ChiNhanh request) {
        request.setMaChiNhanh(requireText(request.getMaChiNhanh(), "Mã chi nhánh", 1, 50));
        request.setTenChiNhanh(requireText(request.getTenChiNhanh(), "Tên chi nhánh", 1, 255));
        oneOf(request.getLoai(), "Loại chi nhánh", Set.of("KHO_TONG", "CUA_HANG_BAN_LE"));
        request.setSoDienThoai(requirePhone(request.getSoDienThoai(), "SĐT liên hệ chi nhánh"));
        if (request.getIdQuanLy() != null) {
            return ResponseEntity.badRequest().body(ApiResponse.err(
                    "Tạo chi nhánh không gán người phụ trách; hãy bổ nhiệm sau khi đã có nhân sự"));
        }
        if (chiNhanhRepository.findByMaChiNhanh(request.getMaChiNhanh()).isPresent()) {
            return ResponseEntity.badRequest().body( ApiResponse.err("Mã chi nhánh đã tồn tại"));
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

        chiNhanhRepository.save(cn);
        return ResponseEntity.ok(cn);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody ChiNhanh request) {
        return chiNhanhRepository.findById(id)
                .map(cn -> {
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
                            return ResponseEntity.badRequest().body(ApiResponse.err("Mã chi nhánh đã tồn tại"));
                        }
                    }
                    if (request.getIdQuanLy() != null) {
                        return ResponseEntity.badRequest().body(ApiResponse.err(
                                "Dùng chức năng bổ nhiệm người phụ trách, không cập nhật trực tiếp"));
                    }
                    if (request.getLoai() != null && !request.getLoai().equals(cn.getLoai())
                            && (cn.getIdQuanLy() != null || nhanVienRepository.existsByIdChiNhanh(cn.getId()))) {
                        return ResponseEntity.badRequest().body(ApiResponse.err(
                                "Không thể đổi loại điểm khi chi nhánh đã có nhân sự hoặc người phụ trách"));
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
                    chiNhanhRepository.save(cn);
                    return ResponseEntity.ok(cn);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        return chiNhanhRepository.findById(id)
                .map(cn -> {
                    cn.setDangHoatDong(false);
                    cn.setNgayCapNhat(LocalDateTime.now());
                    return ResponseEntity.ok(chiNhanhRepository.save(cn));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/quan-ly/{idQuanLy}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> assignQuanLy(@PathVariable UUID id, @PathVariable UUID idQuanLy) {
        return chiNhanhRepository.findById(id)
                .map(cn -> {
                    NhanVien nv = nhanVienRepository.findById(idQuanLy).orElse(null);
                    if (nv == null) {
                        return ResponseEntity.badRequest().body( ApiResponse.err("Nhân viên không tồn tại"));
                    }
                    String validationError = responsibleAssignmentError(cn, nv);
                    if (validationError != null) {
                        return ResponseEntity.badRequest().body(ApiResponse.err(validationError));
                    }
                    if (chiNhanhRepository.existsByIdQuanLyAndIdNot(idQuanLy, id)) {
                        return ResponseEntity.badRequest().body(ApiResponse.err(
                                "Nhân viên này đang là người phụ trách của chi nhánh khác"));
                    }
                    cn.setIdQuanLy(idQuanLy);
                    cn.setNgayCapNhat(LocalDateTime.now());
                    chiNhanhRepository.save(cn);
                    return ResponseEntity.ok(cn);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}/quan-ly")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> clearQuanLy(@PathVariable UUID id) {
        return chiNhanhRepository.findById(id)
                .map(cn -> {
                    cn.setIdQuanLy(null);
                    cn.setNgayCapNhat(LocalDateTime.now());
                    return ResponseEntity.ok(chiNhanhRepository.save(cn));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private String responsibleAssignmentError(ChiNhanh branch, NhanVien employee) {
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

//    record ErrorResponse(String message) {}
//    record SuccessResponse(String message) {}
}
