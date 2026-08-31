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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tai-khoan")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TaiKhoanController {

    private final TaiKhoanRepository taiKhoanRepository;
    private final NhanVienRepository nhanVienRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping
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
    public ResponseEntity<?> createTaiKhoan(@RequestBody CreateTaiKhoanRequest request) {
        if (taiKhoanRepository.findByTenDangNhap(request.getTenDangNhap()).isPresent()) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Tên đăng nhập đã tồn tại"));
        }

        TaiKhoan taiKhoan = new TaiKhoan();
        taiKhoan.setId(UUID.randomUUID());
        taiKhoan.setTenDangNhap(request.getTenDangNhap());
        taiKhoan.setMatKhauHash(passwordEncoder.encode(request.getMatKhau()));
        taiKhoan.setIdNhanVien(request.getIdNhanVien());
        taiKhoan.setTrangThai("ACTIVE");
        taiKhoan.setNgayTao(LocalDateTime.now());

        taiKhoanRepository.save(taiKhoan);

        if (request.getIdNhanVien() != null && request.getVaiTro() != null) {
            nhanVienRepository.findById(request.getIdNhanVien()).ifPresent(nv -> {
                nv.setVaiTro(request.getVaiTro());
                nhanVienRepository.save(nv);
            });
        }

        return ResponseEntity.ok(new SuccessResponse("Tạo tài khoản thành công"));
    }

    @PutMapping("/{id}")
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
                            nhanVienRepository.save(nv);
                        });
                    }

                    return ResponseEntity.ok(new SuccessResponse("Cập nhật thành công"));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTaiKhoan(@PathVariable UUID id) {
        if (taiKhoanRepository.existsById(id)) {
            taiKhoanRepository.deleteById(id);
            return ResponseEntity.ok(new SuccessResponse("Xóa tài khoản thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/nhan-vien")
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

    record ErrorResponse(String message) {}
    record SuccessResponse(String message) {}
    record NhanVienOption(UUID id, String hoTen, String email, String vaiTro) {}
}
