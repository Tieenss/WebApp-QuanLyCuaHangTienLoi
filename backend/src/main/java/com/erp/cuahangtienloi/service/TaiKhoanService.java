package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.ChangePasswordRequest;
import com.erp.cuahangtienloi.dto.CreateTaiKhoanRequest;
import com.erp.cuahangtienloi.dto.NhanVienOption;
import com.erp.cuahangtienloi.dto.TaiKhoanDTO;
import com.erp.cuahangtienloi.dto.UpdateTaiKhoanRequest;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.entity.TaiKhoan;
import com.erp.cuahangtienloi.repository.ChiNhanhRepository;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import com.erp.cuahangtienloi.repository.TaiKhoanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaiKhoanService {

    private final TaiKhoanRepository taiKhoanRepository;
    private final NhanVienRepository nhanVienRepository;
    private final ChiNhanhRepository chiNhanhRepository;
    private final PasswordEncoder passwordEncoder;

    public List<TaiKhoanDTO> getAll() {
        return taiKhoanRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public Optional<TaiKhoanDTO> getById(UUID id) {
        return taiKhoanRepository.findById(id).map(this::toDTO);
    }

    private TaiKhoanDTO toDTO(TaiKhoan tk) {
        TaiKhoanDTO dto = new TaiKhoanDTO();
        dto.setId(tk.getId());
        dto.setTenDangNhap(tk.getTenDangNhap());
        dto.setTrangThai(tk.getTrangThai());
        dto.setNgayTao(tk.getNgayTao());
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
    }

    @Transactional
    public void create(CreateTaiKhoanRequest request) {
        if (taiKhoanRepository.findByTenDangNhap(request.getTenDangNhap()).isPresent()) {
            throw new IllegalArgumentException("Tên đăng nhập đã tồn tại");
        }

        UUID nhanVienId = request.getIdNhanVien();
        if (nhanVienId != null && !nhanVienRepository.existsById(nhanVienId)) {
            throw new IllegalArgumentException("Nhân viên không tồn tại");
        }
        if (nhanVienId != null && taiKhoanRepository.findByIdNhanVien(nhanVienId).isPresent()) {
            throw new IllegalArgumentException("Nhân viên đã có tài khoản");
        }
        NhanVien linkedEmployee = nhanVienId != null
                ? nhanVienRepository.findById(nhanVienId).orElse(null)
                : null;
        String vaiTroYeuCau = request.getVaiTro() != null
                ? request.getVaiTro()
                : linkedEmployee != null ? linkedEmployee.getVaiTro() : "THU_NGAN";
        if (!List.of("ADMIN", "KE_TOAN", "THU_KHO", "QUAN_LY", "THU_NGAN").contains(vaiTroYeuCau)) {
            throw new IllegalArgumentException("Vai trò không hợp lệ");
        }
        UUID chiNhanhId = null;
        if (request.getIdChiNhanh() != null && !request.getIdChiNhanh().isBlank()) {
            try {
                chiNhanhId = UUID.fromString(request.getIdChiNhanh());
            } catch (IllegalArgumentException ex) {
                throw new IllegalArgumentException("ID chi nhánh không hợp lệ");
            }
            if (!chiNhanhRepository.existsById(chiNhanhId)) {
                throw new IllegalArgumentException("Chi nhánh không tồn tại");
            }
        }
        if (chiNhanhId == null && linkedEmployee != null) {
            chiNhanhId = linkedEmployee.getIdChiNhanh();
        }
        if (!List.of("ADMIN", "KE_TOAN").contains(vaiTroYeuCau) && chiNhanhId == null) {
            throw new IllegalArgumentException("Vai trò này bắt buộc phải chọn chi nhánh");
        }
        if (List.of("ADMIN", "KE_TOAN").contains(vaiTroYeuCau) && chiNhanhId != null) {
            throw new IllegalArgumentException("ADMIN và KẾ TOÁN không thuộc chi nhánh");
        }
        if (nhanVienId == null) {
            NhanVien newNv = new NhanVien();
            newNv.setId(UUID.randomUUID());
            newNv.setMaNhanVien("NV-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
            newNv.setTenDangNhap(request.getTenDangNhap());
            newNv.setMatKhau(passwordEncoder.encode(request.getMatKhau()));
            newNv.setHoTen(request.getTenDangNhap());
            String vaiTro = vaiTroYeuCau;
            newNv.setVaiTro(vaiTro);
            newNv.setLoaiHopDong("FULL_TIME");
            newNv.setCaMacDinh("MORNING");
            newNv.setNgayVaoLam(java.time.LocalDate.now());
            newNv.setTrangThai("ACTIVE");
            if (!"ADMIN".equals(vaiTro) && !"KE_TOAN".equals(vaiTro)) {
                newNv.setIdChiNhanh(chiNhanhId);
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
                if ("ADMIN".equals(finalVaiTro) || "KE_TOAN".equals(finalVaiTro)) {
                    nv.setIdChiNhanh(null);
                } else if (idChiNhanhReq != null) {
                    try {
                        nv.setIdChiNhanh(UUID.fromString(idChiNhanhReq));
                    } catch (IllegalArgumentException ignored) {}
                }
                nhanVienRepository.save(nv);
            });
        }
    }

    @Transactional
    public Optional<TaiKhoan> update(UUID id, UpdateTaiKhoanRequest request) {
        return taiKhoanRepository.findById(id).map(tk -> {
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
                    if ("ADMIN".equals(request.getVaiTro()) || "KE_TOAN".equals(request.getVaiTro())) {
                        nv.setIdChiNhanh(null);
                    }
                    nhanVienRepository.save(nv);
                });
            }

            return tk;
        });
    }

    @Transactional
    public boolean delete(UUID id) {
        if (taiKhoanRepository.existsById(id)) {
            taiKhoanRepository.deleteById(id);
            return true;
        }
        return false;
    }

    public List<NhanVienOption> getNhanVienChuaCoTaiKhoan() {
        List<TaiKhoan> allTaiKhoan = taiKhoanRepository.findAll();
        List<UUID> usedNhanVienIds = allTaiKhoan.stream()
                .map(TaiKhoan::getIdNhanVien)
                .filter(id -> id != null)
                .collect(Collectors.toList());

        return nhanVienRepository.findAll().stream()
                .filter(nv -> !usedNhanVienIds.contains(nv.getId()))
                .map(nv -> new NhanVienOption(nv.getId(), nv.getHoTen(), nv.getEmail(), nv.getVaiTro()))
                .collect(Collectors.toList());
    }

    @Transactional
    public boolean changePassword(UUID id, ChangePasswordRequest request) {
        if (request.newPassword().equals(request.currentPassword())) {
            throw new IllegalArgumentException("Mật khẩu mới phải khác mật khẩu hiện tại");
        }

        if (request.newPassword() == null || request.newPassword().length() < 8) {
            throw new IllegalArgumentException("Mật khẩu mới tối thiểu 8 ký tự");
        }

        if (request.currentPassword() == null || request.currentPassword().isBlank()) {
            throw new IllegalArgumentException("Vui lòng nhập mật khẩu hiện tại");
        }

        TaiKhoan tk = taiKhoanRepository.findById(id).orElse(null);
        if (tk == null) {
            return false;
        }

        if (!passwordEncoder.matches(request.currentPassword(), tk.getMatKhauHash())) {
            throw new IllegalArgumentException("Mật khẩu hiện tại không đúng");
        }

        tk.setMatKhauHash(passwordEncoder.encode(request.newPassword()));
        taiKhoanRepository.save(tk);
        return true;
    }
}
