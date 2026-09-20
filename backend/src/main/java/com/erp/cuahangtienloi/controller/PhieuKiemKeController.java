package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.PhieuKiemKeDTO;
import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.entity.ChiTietKiemKe;
import com.erp.cuahangtienloi.entity.PhieuKiemKe;
import com.erp.cuahangtienloi.repository.*;
import com.erp.cuahangtienloi.service.BranchAccessService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/phieu-kiem-ke")
@RequiredArgsConstructor
//@CrossOrigin(origins = "*")
@PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY', 'KE_TOAN')")
public class PhieuKiemKeController {

    private final PhieuKiemKeRepository phieuKiemKeRepository;
    private final ChiNhanhRepository chiNhanhRepository;
    private final NhanVienRepository nhanVienRepository;
    private final ChiTietKiemKeRepository chiTietKiemKeRepository;
    private final SanPhamRepository sanPhamRepository;
    private final BranchAccessService branchAccessService;
    private final JdbcTemplate jdbcTemplate;

    @GetMapping
    public ResponseEntity<List<PhieuKiemKeDTO>> getAll(HttpServletRequest request) {
        var actor = branchAccessService.requireAuthenticatedEmployee(request);
        List<PhieuKiemKeDTO> list = phieuKiemKeRepository.findAll().stream()
                .filter(pkk -> branchAccessService.canReadBranch(actor, pkk.getIdChiNhanh()))
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable UUID id, HttpServletRequest request) {
        var actor = branchAccessService.requireAuthenticatedEmployee(request);
        return phieuKiemKeRepository.findById(id)
                .filter(pkk -> branchAccessService.canReadBranch(actor, pkk.getIdChiNhanh()))
                .map(hd -> ResponseEntity.ok(toDTO(hd)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-branch/{idChiNhanh}")
    public ResponseEntity<List<PhieuKiemKeDTO>> getByChiNhanh(@PathVariable UUID idChiNhanh, HttpServletRequest request) {
        branchAccessService.requireReadableBranch(branchAccessService.requireAuthenticatedEmployee(request), idChiNhanh);
        List<PhieuKiemKeDTO> list = phieuKiemKeRepository.findByIdChiNhanh(idChiNhanh).stream()
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-status/{trangThai}")
    public ResponseEntity<List<PhieuKiemKeDTO>> getByStatus(@PathVariable String trangThai, HttpServletRequest request) {
        var actor = branchAccessService.requireAuthenticatedEmployee(request);
        List<PhieuKiemKeDTO> list = phieuKiemKeRepository.findByTrangThai(trangThai).stream()
                .filter(pkk -> branchAccessService.canReadBranch(actor, pkk.getIdChiNhanh()))
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(list);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> create(@RequestBody PhieuKiemKe request, HttpServletRequest httpRequest) {
        if (request.getIdChiNhanh() == null || !chiNhanhRepository.existsById(request.getIdChiNhanh())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Chi nhánh không tồn tại"));
        }
        branchAccessService.requireReadableBranch(branchAccessService.requireAuthenticatedEmployee(httpRequest), request.getIdChiNhanh());
        PhieuKiemKe pkk = new PhieuKiemKe();
        pkk.setId(UUID.randomUUID());
        // Sinh mã ở Java để response trả về đúng mã ngay, tránh Hibernate
        // không đọc lại giá trị do DB trigger gán.
        pkk.setMaPhieu(sinhMaPhieuKiemKe(
                request.getNgayKiemKe() != null ? request.getNgayKiemKe() : LocalDate.now()));
        pkk.setIdChiNhanh(request.getIdChiNhanh());
        UUID idNguoiTao = resolveAuthenticatedIdNhanVien(httpRequest);
        pkk.setIdNguoiTao(idNguoiTao);
        pkk.setIdNguoiDuyet(null);
        pkk.setNgayKiemKe(request.getNgayKiemKe() != null ? request.getNgayKiemKe() : LocalDate.now());
        pkk.setNgayCanBang(null);
        pkk.setTrangThai("DANG_KIEM_KE");
        pkk.setGhiChu(request.getGhiChu());
        pkk.setNgayTao(LocalDateTime.now());
        pkk.setNgayCapNhat(LocalDateTime.now());

        PhieuKiemKe created = phieuKiemKeRepository.saveAndFlush(pkk);
        return ResponseEntity.ok(toDTO(created));
    }

    /**
     * Sinh mã phiếu kiểm kê dạng KK-YYYYMMDD-NNN. Sinh ở Java thay vì phụ
     * thuộc DB trigger để response API có mã ngay lập tức (Hibernate không
     * tự đọc lại field do trigger gán sau save).
     */
    private String sinhMaPhieuKiemKe(LocalDate ngay) {
        String dateStr = ngay.format(
                java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd")
        );

        String prefix = "KK-" + dateStr + "-";

        long count = phieuKiemKeRepository.countByMaPhieuPrefix(prefix);

        return prefix + String.format("%03d", count + 1);
    }

    /**
     * Tạo phiếu kiểm kê kèm toàn bộ dòng chi tiết trong MỘT transaction.
     * Tránh tình trạng phiếu header được tạo nhưng dòng chi tiết lỗi →
     * phiếu mồ côi trong DB.
     */
    @PostMapping("/with-lines")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    @Transactional
    public ResponseEntity<?> createWithLines(@Valid @RequestBody CreateStocktakeRequest request, HttpServletRequest httpRequest) {
        if (request.getIdChiNhanh() == null) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Thiếu chi nhánh"));
        }
        if (request.getLines() == null || request.getLines().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Thiếu danh sách sản phẩm kiểm kê"));
        }
        if (!chiNhanhRepository.existsById(request.getIdChiNhanh())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Chi nhánh không tồn tại"));
        }
        branchAccessService.requireReadableBranch(branchAccessService.requireAuthenticatedEmployee(httpRequest), request.getIdChiNhanh());
        for (ChiTietKiemKe line : request.getLines()) {
            if (line.getIdSanPham() == null || !sanPhamRepository.existsById(line.getIdSanPham())) {
                return ResponseEntity.badRequest().body(ApiResponse.err("Sản phẩm kiểm kê không tồn tại"));
            }
            if (line.getTonThucTe() == null || line.getTonThucTe() < 0) {
                return ResponseEntity.badRequest().body(ApiResponse.err("Tồn thực tế phải lớn hơn hoặc bằng 0"));
            }
        }

        // 1. Tạo header
        PhieuKiemKe pkk = new PhieuKiemKe();
        pkk.setId(UUID.randomUUID());
        pkk.setMaPhieu(null); // trigger DB tự sinh mã KK-YYYYMMDD-NNN
        pkk.setIdChiNhanh(request.getIdChiNhanh());
        UUID idNguoiTao = resolveAuthenticatedIdNhanVien(httpRequest);
        pkk.setIdNguoiTao(idNguoiTao);
        pkk.setNgayKiemKe(request.getNgayKiemKe() != null ? request.getNgayKiemKe() : LocalDate.now());
        pkk.setTrangThai("DANG_KIEM_KE");
        pkk.setGhiChu(request.getGhiChu());
        pkk.setNgayTao(LocalDateTime.now());
        pkk.setNgayCapNhat(LocalDateTime.now());
        pkk.setMaPhieu(sinhMaPhieuKiemKe(pkk.getNgayKiemKe()));
        PhieuKiemKe savedHeader = phieuKiemKeRepository.saveAndFlush(pkk);

        // 2. Tạo các dòng chi tiết
        List<ChiTietKiemKe> lines = new ArrayList<>();
        for (ChiTietKiemKe line : request.getLines()) {
            ChiTietKiemKe ct = new ChiTietKiemKe();
            ct.setId(UUID.randomUUID());
            ct.setIdPhieuKiemKe(savedHeader.getId());
            ct.setIdSanPham(line.getIdSanPham());
            ct.setTonHeThong(line.getTonHeThong());
            ct.setTonThucTe(line.getTonThucTe());
            ct.setSoLuongLech(line.getSoLuongLech());
            ct.setLyDoLech(line.getLyDoLech());
            ct.setDonGiaVon(line.getDonGiaVon());
            ct.setGiaTriLech(line.getGiaTriLech());
            ct.setNgayTao(LocalDateTime.now());
            lines.add(ct);
        }
        chiTietKiemKeRepository.saveAll(lines);
        chiTietKiemKeRepository.flush();

        return ResponseEntity.ok(toDTO(savedHeader));
    }

    /** Request body cho /with-lines: header + danh sách dòng chi tiết. */
    public static class CreateStocktakeRequest {
        @NotNull(message = "Chi nhánh bắt buộc chọn")
        private UUID idChiNhanh;
        private LocalDate ngayKiemKe;
        private String ghiChu;
        @NotEmpty(message = "Phiếu kiểm kê phải có ít nhất một sản phẩm")
        @Valid
        private List<ChiTietKiemKe> lines;

        public UUID getIdChiNhanh() { return idChiNhanh; }
        public void setIdChiNhanh(UUID idChiNhanh) { this.idChiNhanh = idChiNhanh; }
        public LocalDate getNgayKiemKe() { return ngayKiemKe; }
        public void setNgayKiemKe(LocalDate ngayKiemKe) { this.ngayKiemKe = ngayKiemKe; }
        public String getGhiChu() { return ghiChu; }
        public void setGhiChu(String ghiChu) { this.ghiChu = ghiChu; }
        public List<ChiTietKiemKe> getLines() { return lines; }
        public void setLines(List<ChiTietKiemKe> lines) { this.lines = lines; }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    @Transactional
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody PhieuKiemKe request, HttpServletRequest httpRequest) {
        return phieuKiemKeRepository.findById(id)
                .map(pkk -> {
                    var actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
                    branchAccessService.requireReadableBranch(actor, pkk.getIdChiNhanh());
                    requireEditable(pkk);
                    if (request.getMaPhieu() != null) pkk.setMaPhieu(request.getMaPhieu());
                    if (request.getIdChiNhanh() != null && !request.getIdChiNhanh().equals(pkk.getIdChiNhanh())) {
                        if (!"ADMIN".equals(actor.getVaiTro())) {
                            throw new org.springframework.web.server.ResponseStatusException(
                                    org.springframework.http.HttpStatus.FORBIDDEN,
                                    "Chỉ Admin được đổi chi nhánh của phiếu kiểm kê");
                        }
                        if (!chiNhanhRepository.existsById(request.getIdChiNhanh())) {
                            return ResponseEntity.badRequest().body(ApiResponse.err("Chi nhánh không tồn tại"));
                        }
                        pkk.setIdChiNhanh(request.getIdChiNhanh());
                    }
                    if (request.getTrangThai() != null || request.getNgayCanBang() != null) {
                        return ResponseEntity.badRequest().body(ApiResponse.err(
                                "Không đổi trạng thái hoặc cân bằng qua PUT; hãy dùng endpoint /balance"));
                    }
                    if (request.getGhiChu() != null) pkk.setGhiChu(request.getGhiChu());
                    pkk.setNgayCapNhat(LocalDateTime.now());
                    phieuKiemKeRepository.save(pkk);
                    return ResponseEntity.ok(toDTO(pkk));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Khóa nội dung phiếu và chuyển sang chờ người có thẩm quyền cân bằng.
     * Người tạo phiếu (hoặc Admin) là người được gửi duyệt.
     */
    @PostMapping("/{id}/submit")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    @Transactional
    public ResponseEntity<?> submit(@PathVariable UUID id, HttpServletRequest httpRequest) {
        var actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        PhieuKiemKe pkk = phieuKiemKeRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Không tìm thấy phiếu kiểm kê"));
        branchAccessService.requireReadableBranch(actor, pkk.getIdChiNhanh());
        requireEditable(pkk);
        if (!"ADMIN".equals(actor.getVaiTro()) && !actor.getId().equals(pkk.getIdNguoiTao())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "Chỉ người tạo phiếu mới được gửi duyệt");
        }
        if (chiTietKiemKeRepository.findByIdPhieuKiemKe(id).isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Phiếu kiểm kê phải có ít nhất một dòng"));
        }
        pkk.setTrangThai("CHO_DUYET");
        pkk.setNgayCapNhat(LocalDateTime.now());
        phieuKiemKeRepository.save(pkk);
        return ResponseEntity.ok(toDTO(pkk));
    }

    /**
     * Cân bằng tồn kho trong một transaction: DB khóa phiếu, đổi trạng thái,
     * ghi thẻ kho ADJUSTMENT và điều chỉnh tồn qua fn_can_bang_kiem_ke.
     */
    @PostMapping("/{id}/balance")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    @Transactional
    public ResponseEntity<?> balance(@PathVariable UUID id, HttpServletRequest httpRequest) {
        var actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        PhieuKiemKe pkk = phieuKiemKeRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Không tìm thấy phiếu kiểm kê"));
        branchAccessService.requireReadableBranch(actor, pkk.getIdChiNhanh());
        if (!"CHO_DUYET".equals(pkk.getTrangThai())) {
            return ResponseEntity.badRequest().body(ApiResponse.err(
                    "Chỉ cân bằng được phiếu đang chờ duyệt"));
        }
        boolean isAdmin = "ADMIN".equals(actor.getVaiTro());
        boolean isAccountantApprovingAnotherPerson = "KE_TOAN".equals(actor.getVaiTro())
                && !actor.getId().equals(pkk.getIdNguoiTao());
        if (!isAdmin && !isAccountantApprovingAnotherPerson) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN,
                    "Chỉ Admin hoặc Kế toán duyệt phiếu của người khác mới được cân bằng kho");
        }

        jdbcTemplate.query(
                "SELECT fn_can_bang_kiem_ke(?::uuid, ?::uuid, CURRENT_DATE, ?::varchar, NULL::text)",
                rs -> { }, id, actor.getId(), actor.getHoTen());
        return ResponseEntity.ok(toDTO(phieuKiemKeRepository.findById(id).orElseThrow()));
    }

    /** Hủy mềm phiếu chưa cân bằng để giữ lại dấu vết kiểm kê. */
    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    @Transactional
    public ResponseEntity<?> cancel(@PathVariable UUID id, HttpServletRequest httpRequest) {
        var actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
        PhieuKiemKe pkk = phieuKiemKeRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Không tìm thấy phiếu kiểm kê"));
        branchAccessService.requireReadableBranch(actor, pkk.getIdChiNhanh());
        if ("DA_CAN_BANG".equals(pkk.getTrangThai()) || "CANCELLED".equals(pkk.getTrangThai())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Không thể hủy phiếu đã cân bằng hoặc đã hủy"));
        }
        if (!"ADMIN".equals(actor.getVaiTro()) && !actor.getId().equals(pkk.getIdNguoiTao())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "Chỉ người tạo hoặc Admin được hủy phiếu kiểm kê");
        }
        pkk.setTrangThai("CANCELLED");
        pkk.setNgayCapNhat(LocalDateTime.now());
        phieuKiemKeRepository.save(pkk);
        return ResponseEntity.ok(toDTO(pkk));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> delete(@PathVariable UUID id, HttpServletRequest httpRequest) {
        return phieuKiemKeRepository.findById(id).map(pkk -> {
            branchAccessService.requireReadableBranch(branchAccessService.requireAuthenticatedEmployee(httpRequest), pkk.getIdChiNhanh());
            requireEditable(pkk);
            phieuKiemKeRepository.delete(pkk);
            return ResponseEntity.ok(ApiResponse.ok("Xóa phiếu kiểm kê thành công"));
        }).orElse(ResponseEntity.notFound().build());
    }

    private UUID resolveAuthenticatedIdNhanVien(HttpServletRequest request) {
        Object attr = request.getAttribute("authenticatedIdNhanVien");

        if (attr instanceof String s) {
            try {
                UUID id = UUID.fromString(s);

                if (nhanVienRepository.existsById(id)) {
                    return id;
                }
            } catch (IllegalArgumentException ignored) {
                // JWT chứa UUID không hợp lệ
            }
        }

        return null;
    }

    private void requireEditable(PhieuKiemKe pkk) {
        if (!"DANG_KIEM_KE".equals(pkk.getTrangThai())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.CONFLICT,
                    "Phiếu kiểm kê đã gửi duyệt, đã cân bằng hoặc đã hủy nên không thể sửa");
        }
    }

    private PhieuKiemKeDTO toDTO(PhieuKiemKe pkk) {
        PhieuKiemKeDTO dto = new PhieuKiemKeDTO();
        dto.setId(pkk.getId());
        dto.setMaPhieu(pkk.getMaPhieu());
        dto.setIdChiNhanh(pkk.getIdChiNhanh());
        dto.setIdNguoiTao(pkk.getIdNguoiTao());
        dto.setIdNguoiDuyet(pkk.getIdNguoiDuyet());
        dto.setNgayKiemKe(pkk.getNgayKiemKe());
        dto.setNgayCanBang(pkk.getNgayCanBang());
        dto.setTrangThai(pkk.getTrangThai());
        dto.setGhiChu(pkk.getGhiChu());

        if (pkk.getIdChiNhanh() != null) {
            chiNhanhRepository.findById(pkk.getIdChiNhanh())
                    .ifPresent(cn -> dto.setTenChiNhanh(cn.getTenChiNhanh()));
        }
        if (pkk.getIdNguoiTao() != null) {
            nhanVienRepository.findById(pkk.getIdNguoiTao())
                    .ifPresent(nv -> dto.setTenNguoiTao(nv.getHoTen()));
        }
        if (pkk.getIdNguoiDuyet() != null) {
            nhanVienRepository.findById(pkk.getIdNguoiDuyet())
                    .ifPresent(nv -> dto.setTenNguoiDuyet(nv.getHoTen()));
        }

        return dto;
    }

//    record SuccessResponse(String message) {}
}
