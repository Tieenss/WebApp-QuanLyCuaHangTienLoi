package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.CreateTaiKhoanRequest;
import com.erp.cuahangtienloi.dto.TaiKhoanDTO;
import com.erp.cuahangtienloi.dto.UpdateTaiKhoanRequest;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.entity.TaiKhoan;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import com.erp.cuahangtienloi.repository.TaiKhoanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tai-khoan")
@RequiredArgsConstructor
//@CrossOrigin(origins = "*")
public class TaiKhoanController {

    private final TaiKhoanRepository taiKhoanRepository;
    private final NhanVienRepository nhanVienRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<TaiKhoanDTO>> getAllTaiKhoan() {
        List<TaiKhoanDTO> list = taiKhoanRepository.findAll().stream()
                .map(tk -> {
                    TaiKhoanDTO dto = new TaiKhoanDTO();
                    dto.setId(tk.getId());
                    dto.setTenDangNhap(tk.getTenDangNhap());
                    dto.setTrangThai(tk.getTrangThai());
                    dto.setIdNhanVien(tk.getIdNhanVien());
                    if (tk.getIdNhanVien() != null) {
                        nhanVienRepository.findById(tk.getIdNhanVien()).ifPresent(nv -> {
                            dto.setEmail(nv.getEmail());
                            dto.setHoTen(nv.getHoTen());
                            dto.setVaiTro(nv.getVaiTro());
                            dto.setIdChiNhanh(nv.getIdChiNhanh());
                        });
                    }
                    return dto;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getTaiKhoanById(@PathVariable UUID id) {
        return taiKhoanRepository.findById(id)
                .map(tk -> {
                    TaiKhoanDTO dto = new TaiKhoanDTO();
                    dto.setId(tk.getId());
                    dto.setTenDangNhap(tk.getTenDangNhap());
                    dto.setTrangThai(tk.getTrangThai());
                    dto.setIdNhanVien(tk.getIdNhanVien());
                    if (tk.getIdNhanVien() != null) {
                        nhanVienRepository.findById(tk.getIdNhanVien()).ifPresent(nv -> {
                            dto.setEmail(nv.getEmail());
                            dto.setHoTen(nv.getHoTen());
                            dto.setVaiTro(nv.getVaiTro());
                            dto.setIdChiNhanh(nv.getIdChiNhanh());
                        });
                    }
                    return ResponseEntity.ok(dto);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createTaiKhoan(@RequestBody CreateTaiKhoanRequest request) {
        if (taiKhoanRepository.findByTenDangNhap(request.getTenDangNhap()).isPresent()) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Tên đăng nhập đã tồn tại"));
        }

        // Nếu không chọn nhân viên có sẵn → tự tạo nhan_vien mới
        UUID nhanVienId = request.getIdNhanVien();
        if (nhanVienId == null) {
            NhanVien newNv = new NhanVien();
            newNv.setId(UUID.randomUUID());
            newNv.setMaNhanVien("NV-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
            newNv.setTenDangNhap(request.getTenDangNhap());
            newNv.setMatKhau(passwordEncoder.encode(request.getMatKhau()));
            newNv.setHoTen(request.getTenDangNhap());
            String vaiTro = request.getVaiTro() != null ? request.getVaiTro() : "THU_NGAN";
            newNv.setVaiTro(vaiTro);
            newNv.setLoaiHopDong("FULL_TIME");
            newNv.setCaMacDinh("MORNING");
            newNv.setNgayVaoLam(java.time.LocalDate.now());
            newNv.setTrangThai("ACTIVE");
            // Rule chk_vai_tro_chi_nhanh: ADMIN/KE_TOAN phải NULL id_chi_nhanh
            if (!"ADMIN".equals(vaiTro) && !"KE_TOAN".equals(vaiTro)) {
                // THU_KHO/QUAN_LY/THU_NGAN cần chi nhánh - mặc định NULL, user tự cập nhật sau
                newNv.setIdChiNhanh(null);
            } else {
                newNv.setIdChiNhanh(null);
            }
            newNv.setNgayTao(LocalDateTime.now());
            newNv.setNgayCapNhat(LocalDateTime.now());
            nhanVienRepository.save(newNv);
            nhanVienId = newNv.getId();
        }

        TaiKhoan taiKhoan = new TaiKhoan();
        taiKhoan.setId(UUID.randomUUID());
        taiKhoan.setTenDangNhap(request.getTenDangNhap());
        taiKhoan.setMatKhauHash(passwordEncoder.encode(request.getMatKhau()));
        taiKhoan.setIdNhanVien(nhanVienId);
        taiKhoan.setTrangThai("ACTIVE");
        taiKhoan.setNgayTao(LocalDateTime.now());

        taiKhoanRepository.save(taiKhoan);

        if (request.getVaiTro() != null) {
            final UUID finalNhanVienId = nhanVienId;
            final String finalVaiTro = request.getVaiTro();
            final String idChiNhanhReq = request.getIdChiNhanh();
            nhanVienRepository.findById(finalNhanVienId).ifPresent(nv -> {
                nv.setVaiTro(finalVaiTro);
                // Nếu vai trò là ADMIN/KE_TOAN → bỏ chi nhánh
                if ("ADMIN".equals(finalVaiTro) || "KE_TOAN".equals(finalVaiTro)) {
                    nv.setIdChiNhanh(null);
                } else if (idChiNhanhReq != null) {
                    // Gán chi nhánh từ request
                    try {
                        nv.setIdChiNhanh(UUID.fromString(idChiNhanhReq));
                    } catch (IllegalArgumentException e) {
                        // ignore invalid UUID
                    }
                }
                nhanVienRepository.save(nv);
            });
        }

        return ResponseEntity.ok(new SuccessResponse("Tạo tài khoản thành công"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateTaiKhoan(@PathVariable UUID id, @RequestBody UpdateTaiKhoanRequest request) {
        return taiKhoanRepository.findById(id)
                .map(tk -> {
                    if (request.getMatKhau() != null && !request.getMatKhau().isEmpty()) {
                        tk.setMatKhauHash(passwordEncoder.encode(request.getMatKhau()));
                    }
                    if (request.getTrangThai() != null) {
                        tk.setTrangThai(request.getTrangThai());
                    }
                    taiKhoanRepository.save(tk);

                    if (request.getVaiTro() != null && tk.getIdNhanVien() != null) {
                        nhanVienRepository.findById(tk.getIdNhanVien()).ifPresent(nv -> {
                            nv.setVaiTro(request.getVaiTro());
                            // Nếu đổi sang ADMIN/KE_TOAN → bỏ chi nhánh
                            if ("ADMIN".equals(request.getVaiTro()) || "KE_TOAN".equals(request.getVaiTro())) {
                                nv.setIdChiNhanh(null);
                            }
                            nhanVienRepository.save(nv);
                        });
                    }

                    return ResponseEntity.ok(new SuccessResponse("Cập nhật thành công"));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteTaiKhoan(@PathVariable UUID id) {
        if (taiKhoanRepository.existsById(id)) {
            taiKhoanRepository.deleteById(id);
            return ResponseEntity.ok(new SuccessResponse("Xóa tài khoản thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/nhan-vien")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<NhanVienOption>> getNhanVienChuaCoTaiKhoan() {
        List<TaiKhoan> allTaiKhoan = taiKhoanRepository.findAll();
        List<UUID> usedNhanVienIds = allTaiKhoan.stream()
                .map(TaiKhoan::getIdNhanVien)
                .filter(id -> id != null)
                .collect(Collectors.toList());

        List<NhanVienOption> options = nhanVienRepository.findAll().stream()
                .filter(nv -> !usedNhanVienIds.contains(nv.getId()))
                .map(nv -> new NhanVienOption(nv.getId(), nv.getHoTen(), nv.getEmail(), nv.getVaiTro()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(options);
    }

    public record ChangePasswordRequest(
            String currentPassword,
            String newPassword
    ) {}

    @PutMapping("/{id}/change-password")
    @PreAuthorize("hasRole('ADMIN') or authentication.name == #id.toString()")
    public ResponseEntity<?> changePassword(
            @PathVariable UUID id,
            @RequestBody ChangePasswordRequest request) {

        if (request.newPassword() == null || request.newPassword().length() < 8) {
            return ResponseEntity.badRequest()
                    .body(new ErrorResponse("Mật khẩu mới tối thiểu 8 ký tự"));
        }

        if (request.currentPassword() == null || request.currentPassword().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(new ErrorResponse("Vui lòng nhập mật khẩu hiện tại"));
        }

        return taiKhoanRepository.findById(id)
                .map(tk -> {

                    if (!passwordEncoder.matches(
                            request.currentPassword(),
                            tk.getMatKhauHash())) {

                        return ResponseEntity.badRequest()
                                .body(new ErrorResponse("Mật khẩu hiện tại không đúng"));
                    }

                    tk.setMatKhauHash(
                            passwordEncoder.encode(request.newPassword())
                    );

                    taiKhoanRepository.save(tk);

                    return ResponseEntity.ok(
                            new SuccessResponse("Đổi mật khẩu thành công")
                    );
                })
                .orElse(ResponseEntity.notFound().build());
    }

    record ErrorResponse(String message) {}
    record SuccessResponse(String message) {}
    record NhanVienOption(UUID id, String hoTen, String email, String vaiTro) {}
}
