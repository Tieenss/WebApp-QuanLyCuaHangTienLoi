package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.entity.TaiKhoan;
import com.erp.cuahangtienloi.repository.ChiNhanhRepository;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import com.erp.cuahangtienloi.repository.TaiKhoanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/nhan-vien")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class NhanVienController {

    private final NhanVienRepository nhanVienRepository;
    private final ChiNhanhRepository chiNhanhRepository;
    private final TaiKhoanRepository taiKhoanRepository;

    @GetMapping
    public ResponseEntity<List<NhanVien>> getAll() {
        return ResponseEntity.ok(nhanVienRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable UUID id) {
        return nhanVienRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-chi-nhanh/{idChiNhanh}")
    public ResponseEntity<List<NhanVien>> getByChiNhanh(@PathVariable UUID idChiNhanh) {
        List<NhanVien> list = nhanVienRepository.findAll().stream()
                .filter(nv -> idChiNhanh.equals(nv.getIdChiNhanh()))
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/active")
    public ResponseEntity<List<NhanVien>> getActive() {
        List<NhanVien> list = nhanVienRepository.findAll().stream()
                .filter(nv -> nv.getTrangThai() != null && !"INACTIVE".equals(nv.getTrangThai()))
                .toList();
        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody NhanVien request) {
        if (request.getEmail() != null && nhanVienRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Email đã tồn tại"));
        }
        if (request.getMaNhanVien() != null && nhanVienRepository.existsByMaNhanVien(request.getMaNhanVien())) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Mã nhân viên đã tồn tại"));
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
        // Xử lý rule chk_vai_tro_chi_nhanh: ADMIN/KE_TOAN phải NULL, các vai trò khác phải có chi nhánh
        String vaiTro = request.getVaiTro();
        if ("ADMIN".equals(vaiTro) || "KE_TOAN".equals(vaiTro)) {
            nv.setIdChiNhanh(null);
        } else {
            if (request.getIdChiNhanh() == null) {
                return ResponseEntity.badRequest().body(new ErrorResponse("Vai trò " + vaiTro + " bắt buộc phải có chi nhánh"));
            }
            nv.setIdChiNhanh(request.getIdChiNhanh());
        }
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
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody NhanVien request) {
        return nhanVienRepository.findById(id)
                .map(nv -> {
                    if (request.getHoTen() != null) nv.setHoTen(request.getHoTen());
                    if (request.getEmail() != null) nv.setEmail(request.getEmail());
                    if (request.getSoDienThoai() != null) nv.setSoDienThoai(request.getSoDienThoai());
                    if (request.getVaiTro() != null) nv.setVaiTro(request.getVaiTro());
                    if (request.getViTri() != null) nv.setViTri(request.getViTri());
                    if (request.getLoaiHopDong() != null) nv.setLoaiHopDong(request.getLoaiHopDong());
                    if (request.getCaMacDinh() != null) nv.setCaMacDinh(request.getCaMacDinh());
                    if (request.getLuongTheoGio() != null) nv.setLuongTheoGio(request.getLuongTheoGio());
                    if (request.getLuongCung() != null) nv.setLuongCung(request.getLuongCung());
                    // Xử lý rule chk_vai_tro_chi_nhanh khi update
                    String vaiTroUpdate = request.getVaiTro() != null ? request.getVaiTro() : nv.getVaiTro();
                    if ("ADMIN".equals(vaiTroUpdate) || "KE_TOAN".equals(vaiTroUpdate)) {
                        nv.setIdChiNhanh(null);
                    } else if (request.getIdChiNhanh() != null) {
                        nv.setIdChiNhanh(request.getIdChiNhanh());
                    }
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
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (nhanVienRepository.existsById(id)) {
            nhanVienRepository.deleteById(id);
            return ResponseEntity.ok(new SuccessResponse("Xóa nhân viên thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    record ErrorResponse(String message) {}
    record SuccessResponse(String message) {}
}