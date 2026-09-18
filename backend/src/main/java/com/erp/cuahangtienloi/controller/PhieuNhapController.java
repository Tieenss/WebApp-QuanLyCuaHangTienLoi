package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.PhieuNhapDTO;
import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.entity.ChiTietPhieuNhap;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.entity.PhieuNhap;
import com.erp.cuahangtienloi.repository.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/phieu-nhap")
@RequiredArgsConstructor
//@CrossOrigin(origins = "*")
public class PhieuNhapController {

    private final PhieuNhapRepository phieuNhapRepository;
    private final ChiNhanhRepository chiNhanhRepository;
    private final NhaCungCapRepository nhaCungCapRepository;
    private final NhanVienRepository nhanVienRepository;
    private final com.erp.cuahangtienloi.repository.ChiTietPhieuNhapRepository chiTietPhieuNhapRepository;
    private final SanPhamRepository sanPhamRepository;
    private final JdbcTemplate jdbcTemplate;

    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;
    // ID kho tổng - nơi nhận hàng khi tạo phiếu nhập
    private static final java.util.UUID DEFAULT_DISTRIBUTION_CENTER_ID = java.util.UUID.fromString("a1b2c3d4-0001-0000-0000-000000000001");

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'THU_KHO')")
    public ResponseEntity<List<PhieuNhapDTO>> getAll() {
        List<PhieuNhapDTO> list = phieuNhapRepository.findAll().stream()
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'THU_KHO')")
    public ResponseEntity<?> getById(@PathVariable UUID id) {
        return phieuNhapRepository.findById(id)
                .map(hd -> ResponseEntity.ok(toDTO(hd)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-branch/{idChiNhanh}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'THU_KHO')")
    public ResponseEntity<List<PhieuNhapDTO>> getByChiNhanh(@PathVariable UUID idChiNhanh) {
        List<PhieuNhapDTO> list = phieuNhapRepository.findByIdChiNhanh(idChiNhanh).stream()
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-ncc/{idNcc}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'THU_KHO')")
    public ResponseEntity<List<PhieuNhapDTO>> getByNcc(@PathVariable UUID idNcc) {
        List<PhieuNhapDTO> list = phieuNhapRepository.findByIdNcc(idNcc).stream()
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-status/{trangThai}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'THU_KHO')")
    public ResponseEntity<List<PhieuNhapDTO>> getByStatus(@PathVariable String trangThai) {
        List<PhieuNhapDTO> list = phieuNhapRepository.findByTrangThai(trangThai).stream()
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(list);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO')")
    @Transactional
    public ResponseEntity<?> create(@RequestBody PhieuNhap request, HttpServletRequest httpRequest) {
        if (request.getIdNcc() == null || !nhaCungCapRepository.existsById(request.getIdNcc())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Nhà cung cấp không tồn tại"));
        }
        if (request.getIdChiNhanh() != null && !chiNhanhRepository.existsById(request.getIdChiNhanh())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Chi nhánh không tồn tại"));
        }
        validatePurchaseTotals(request);
        PhieuNhap pn = new PhieuNhap();
        pn.setId(UUID.randomUUID());
        pn.setMaPhieu(request.getMaPhieu());
        pn.setIdChiNhanh(request.getIdChiNhanh());
        pn.setIdNcc(request.getIdNcc());
        // Lấy idNguoiNhap từ request - nếu null hoặc không tồn tại thì lấy NV bất kỳ
        UUID idNguoiNhap = request.getIdNguoiNhap();

        if (idNguoiNhap == null || !nhanVienRepository.existsById(idNguoiNhap)) {
            Object attr = httpRequest.getAttribute("authenticatedIdNhanVien");

            if (attr instanceof String s) {
                try {
                    UUID id = UUID.fromString(s);

                    if (nhanVienRepository.existsById(id)) {
                        idNguoiNhap = id;
                    }
                } catch (IllegalArgumentException ignored) {
                    // UUID không hợp lệ
                }
            }
        }
        pn.setIdNguoiNhap(idNguoiNhap);
        pn.setNgayDatHang(request.getNgayDatHang() != null ? request.getNgayDatHang() : LocalDate.now());
        pn.setNgayDuKienGiao(request.getNgayDuKienGiao() != null ? request.getNgayDuKienGiao() : LocalDate.now().plusDays(3));
        // Nếu trạng thái là COMPLETED thì phải có ngay_nhan_thuc_te
        LocalDate ngayNhan = request.getNgayNhanThucTe();
        if (ngayNhan == null && "COMPLETED".equals(request.getTrangThai())) {
            ngayNhan = LocalDate.now();
        }
        pn.setNgayNhanThucTe(ngayNhan);
        pn.setSubTotal(request.getSubTotal() != null ? request.getSubTotal() : BigDecimal.ZERO);
        pn.setVatTotal(request.getVatTotal() != null ? request.getVatTotal() : BigDecimal.ZERO);
        pn.setGiamGia(request.getGiamGia() != null ? request.getGiamGia() : BigDecimal.ZERO);
        pn.setGrandTotal(request.getGrandTotal() != null ? request.getGrandTotal() : BigDecimal.ZERO);
        pn.setDaThanhToan(request.getDaThanhToan() != null ? request.getDaThanhToan() : BigDecimal.ZERO);
        pn.setCongNo(request.getCongNo() != null ? request.getCongNo() : BigDecimal.ZERO);
        pn.setTrangThai(request.getTrangThai() != null ? request.getTrangThai() : "DRAFT");
        pn.setGhiChu(request.getGhiChu());
        pn.setNgayTao(LocalDateTime.now());
        pn.setNgayCapNhat(LocalDateTime.now());

        phieuNhapRepository.save(pn);

        return ResponseEntity.ok(toDTO(pn));
    }

    /**
     * Tạo phiếu nhập + toàn bộ dòng chi tiết trong MỘT transaction (dùng cho
     * POS/module 8). Dòng được lưu ngay tại đây nên frontend không cần gọi
     * thêm /api/chi-tiet-phieu-nhap/batch — trước đây 2 bước rời nhau khiến
     * header COMPLETED nhưng chi_tiet_phieu_nhap trống, trang chi tiết không
     * hiển thị gì.
     */
    @PostMapping("/with-lines")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO')")
    @Transactional
    public ResponseEntity<?> createWithLines(@Valid @RequestBody CreatePurchaseRequest request, HttpServletRequest httpRequest) {
        if (request.getIdNcc() == null) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Thiếu nhà cung cấp"));
        }
        if (request.getLines() == null || request.getLines().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Phiếu không có dòng hàng"));
        }
        if (!nhaCungCapRepository.existsById(request.getIdNcc())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Nhà cung cấp không tồn tại"));
        }

        // Kho nhận: ưu tiên request, mặc định = Kho Tổng (BR-05).
        UUID idChiNhanh = request.getIdChiNhanh() != null
                ? request.getIdChiNhanh()
                : DEFAULT_DISTRIBUTION_CENTER_ID;
        if (!chiNhanhRepository.existsById(idChiNhanh)) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Chi nhánh nhập hàng không tồn tại"));
        }
        for (PurchaseLine line : request.getLines()) {
            if (!sanPhamRepository.existsById(line.getIdSanPham())) {
                return ResponseEntity.badRequest().body(ApiResponse.err("Sản phẩm trong phiếu nhập không tồn tại"));
            }
            if (line.getSoLuongNhan() != null && line.getSoLuongNhan() > line.getSoLuong()) {
                return ResponseEntity.badRequest().body(ApiResponse.err("Số lượng nhận không được vượt số lượng đặt"));
            }
        }

        PhieuNhap pn = new PhieuNhap();
        pn.setId(UUID.randomUUID());
        pn.setIdChiNhanh(idChiNhanh);
        pn.setIdNcc(request.getIdNcc());
        UUID idNguoiNhap = request.getIdNguoiNhap();

        if (idNguoiNhap == null || !nhanVienRepository.existsById(idNguoiNhap)) {
            Object attr = httpRequest.getAttribute("authenticatedIdNhanVien");

            if (attr instanceof String s) {
                try {
                    UUID id = UUID.fromString(s);

                    if (nhanVienRepository.existsById(id)) {
                        idNguoiNhap = id;
                    }
                } catch (IllegalArgumentException ignored) {
                    // UUID không hợp lệ
                }
            }
        }
        pn.setIdNguoiNhap(idNguoiNhap);
        LocalDate ngayNhap = request.getNgayDatHang() != null ? request.getNgayDatHang() : LocalDate.now();
        pn.setNgayDatHang(ngayNhap);
        pn.setNgayDuKienGiao(request.getNgayDuKienGiao() != null ? request.getNgayDuKienGiao() : ngayNhap);
        pn.setNgayNhanThucTe(request.getNgayNhanThucTe() != null ? request.getNgayNhanThucTe() : ngayNhap);
        pn.setGiamGia(request.getGiamGia() != null ? request.getGiamGia() : BigDecimal.ZERO);
        pn.setTrangThai(request.getTrangThai() != null ? request.getTrangThai() : "COMPLETED");
        pn.setGhiChu(request.getGhiChu());
        // Tổng tiền để 0 — trigger fn_cap_nhat_tong_phieu_nhap sẽ tự tính từ lines.
        pn.setSubTotal(BigDecimal.ZERO);
        pn.setVatTotal(BigDecimal.ZERO);
        pn.setGrandTotal(BigDecimal.ZERO);
        pn.setDaThanhToan(BigDecimal.ZERO);
        pn.setCongNo(BigDecimal.ZERO);
        pn.setNgayTao(LocalDateTime.now());
        pn.setNgayCapNhat(LocalDateTime.now());
        PhieuNhap saved = phieuNhapRepository.saveAndFlush(pn);

        List<ChiTietPhieuNhap> lines = new java.util.ArrayList<>();
        int thuTu = 1;
        for (PurchaseLine line : request.getLines()) {
            if (line.getIdSanPham() == null || line.getSoLuong() == null || line.getSoLuong() <= 0) {
                continue;
            }
            ChiTietPhieuNhap ct = new ChiTietPhieuNhap();
            ct.setId(UUID.randomUUID());
            ct.setIdPhieuNhap(saved.getId());
            ct.setIdSanPham(line.getIdSanPham());
            ct.setSoLuongDat(line.getSoLuong());
            ct.setSoLuongNhan(line.getSoLuongNhan() != null ? line.getSoLuongNhan() : line.getSoLuong());
            ct.setDonGiaNhap(line.getDonGiaNhap() != null ? line.getDonGiaNhap() : BigDecimal.ZERO);
            ct.setVatPhantram(line.getVatPhantram() != null ? line.getVatPhantram() : 8);
            ct.setThanhTien(BigDecimal.ZERO); // trigger tinh_tien tự tính
            ct.setHanSuDung(line.getHanSuDung());
            ct.setThuTu(thuTu++);
            ct.setNgayTao(LocalDateTime.now());
            lines.add(ct);
        }
        if (lines.isEmpty()) {
            throw new IllegalArgumentException("Không có dòng hàng hợp lệ");
        }
        // grand_total do trigger fn_cap_nhat_tong_phieu_nhap tính từ lines;
        // UPDATE lại qua JPA sẽ bị trigger ghi đè ngay sau đó, nên chỉ cần
        // đọc lại bản ghi sau flush.
        chiTietPhieuNhapRepository.saveAll(lines);
        chiTietPhieuNhapRepository.flush();

        // Trạng thái "chờ thanh toán": Thủ kho mới lập phiếu, hàng CHƯA được
        // cộng tồn và tiền CHƯA trả NCC — Kế toán bấm Thanh toán (/pay) sẽ chạy
        // các bước đó.
        boolean awaitingPayment = "PENDING_PAYMENT".equalsIgnoreCase(saved.getTrangThai())
                || "PENDING".equalsIgnoreCase(saved.getTrangThai());
        if (awaitingPayment) {
            entityManager.clear();
            return ResponseEntity.ok(toDTO(phieuNhapRepository.findById(saved.getId()).orElseThrow()));
        }

        // Thanh toán ngay = toàn bộ giá trị phiếu (đọc grand_total mới nhất).
        BigDecimal paid = request.getDaThanhToan() != null
                ? request.getDaThanhToan()
                : jdbcTemplate.queryForObject(
                        "SELECT grand_total FROM phieu_nhap WHERE id = ?",
                        BigDecimal.class, saved.getId());
        jdbcTemplate.update(
                "UPDATE phieu_nhap SET da_thanh_toan = ?, ngay_cap_nhat = NOW() WHERE id = ?",
                paid, saved.getId());

        // Xóa entity khỏi persistence context: trigger DB (sinh ma_phieu, tính
        // tổng tiền) thay đổi row ngay khi INSERT, nhưng entity trong cache vẫn
        // giữ giá trị cũ — nếu không evict thì findById trả về đối tượng stale
        // (maPhieu null, total 0).
        PhieuNhap reloaded = phieuNhapRepository.findById(saved.getId()).orElseThrow();
        for (ChiTietPhieuNhap ct : lines) {
            if (ct.getSoLuongNhan() != null && ct.getSoLuongNhan() > 0) {
                jdbcTemplate.query(
                        "SELECT fn_ghi_the_kho_va_dieu_chinh_ton(?::uuid, ?::uuid, ?::varchar, ?::integer, ?::numeric, ?::varchar, ?::varchar, ?::date, ?::text, NOW()::timestamp)",
                        rs -> { },
                        ct.getIdSanPham(), idChiNhanh, "PURCHASE_IN", ct.getSoLuongNhan(), ct.getDonGiaNhap(),
                        reloaded.getMaPhieu(), "Hệ thống POS", ct.getHanSuDung(),
                        "Nhập hàng từ NCC: phiếu " + reloaded.getMaPhieu());
            }
        }

        entityManager.clear();
        return ResponseEntity.ok(toDTO(phieuNhapRepository.findById(saved.getId()).orElseThrow()));
    }

    /**
     * Kế toán bấm "Thanh toán" trên phiếu đang chờ thanh toán:
     *   1. Trả NCC toàn bộ grand_total (da_thanh_toan, cong_no = 0).
     *   2. Cộng tồn Kho Tổng + ghi thẻ kho PURCHASE_IN cho từng dòng
     *      (qua hàm DB dùng chung) — "quản lý sản phẩm trong kho tăng tương ứng".
     *   3. PENDING_PAYMENT → COMPLETED.
     * Toàn bộ trong MỘT transaction.
     */
    @PutMapping("/{id}/pay")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN')")
    @Transactional
    public ResponseEntity<?> pay(@PathVariable UUID id,
                                 @RequestBody(required = false) PayRequest request) {
        java.util.Optional<PhieuNhap> found = phieuNhapRepository.findById(id);
        if (found.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        PhieuNhap pn = found.get();
        if (!"PENDING_PAYMENT".equalsIgnoreCase(pn.getTrangThai())
                && !"PENDING".equalsIgnoreCase(pn.getTrangThai())) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.err("Chỉ thanh toán được phiếu ở trạng thái chờ thanh toán"));
        }

        List<ChiTietPhieuNhap> lines = chiTietPhieuNhapRepository.findByIdPhieuNhap(id);
        if (lines.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.err("Phiếu không có dòng chi tiết — không thể thanh toán"));
        }

        BigDecimal grand = jdbcTemplate.queryForObject(
                "SELECT grand_total FROM phieu_nhap WHERE id = ?", BigDecimal.class, id);
        BigDecimal paid = request != null && request.getDaThanhToan() != null
                ? request.getDaThanhToan() : grand;
        if (paid.compareTo(grand) > 0) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.err("Số tiền trả vượt giá trị phiếu"));
        }

        for (ChiTietPhieuNhap ct : lines) {
            if (ct.getSoLuongNhan() != null && ct.getSoLuongNhan() > 0) {
                jdbcTemplate.query(
                        "SELECT fn_ghi_the_kho_va_dieu_chinh_ton(?::uuid, ?::uuid, ?::varchar, ?::integer, ?::numeric, ?::varchar, ?::varchar, ?::date, ?::text, NOW()::timestamp)",
                        rs -> { },
                        ct.getIdSanPham(), pn.getIdChiNhanh(), "PURCHASE_IN", ct.getSoLuongNhan(),
                        ct.getDonGiaNhap(), pn.getMaPhieu(), "Kế toán", ct.getHanSuDung(),
                        "Nhập hàng từ NCC (đã thanh toán): phiếu " + pn.getMaPhieu());
            }
        }

        jdbcTemplate.update(
                "UPDATE phieu_nhap SET trang_thai = 'COMPLETED', da_thanh_toan = ?, ngay_cap_nhat = NOW() WHERE id = ?",
                paid, id);

        entityManager.clear();
        return ResponseEntity.ok(toDTO(phieuNhapRepository.findById(id).orElseThrow()));
    }

    /** Body của /pay. */
    public static class PayRequest {
        private BigDecimal daThanhToan;
        public BigDecimal getDaThanhToan() { return daThanhToan; }
        public void setDaThanhToan(BigDecimal v) { this.daThanhToan = v; }
    }

    /** Request body cho /with-lines: header + danh sách dòng hàng. */
    public static class CreatePurchaseRequest {
        private UUID idChiNhanh;
        @NotNull(message = "Nhà cung cấp bắt buộc chọn")
        private UUID idNcc;
        private UUID idNguoiNhap;
        private LocalDate ngayDatHang;
        private LocalDate ngayDuKienGiao;
        private LocalDate ngayNhanThucTe;
        private BigDecimal giamGia;
        private BigDecimal daThanhToan;
        private String trangThai;
        private String ghiChu;
        @NotEmpty(message = "Phiếu nhập phải có ít nhất một dòng hàng")
        @Valid
        private List<PurchaseLine> lines;

        public UUID getIdChiNhanh() { return idChiNhanh; }
        public void setIdChiNhanh(UUID v) { this.idChiNhanh = v; }
        public UUID getIdNcc() { return idNcc; }
        public void setIdNcc(UUID v) { this.idNcc = v; }
        public UUID getIdNguoiNhap() { return idNguoiNhap; }
        public void setIdNguoiNhap(UUID v) { this.idNguoiNhap = v; }
        public LocalDate getNgayDatHang() { return ngayDatHang; }
        public void setNgayDatHang(LocalDate v) { this.ngayDatHang = v; }
        public LocalDate getNgayDuKienGiao() { return ngayDuKienGiao; }
        public void setNgayDuKienGiao(LocalDate v) { this.ngayDuKienGiao = v; }
        public LocalDate getNgayNhanThucTe() { return ngayNhanThucTe; }
        public void setNgayNhanThucTe(LocalDate v) { this.ngayNhanThucTe = v; }
        public BigDecimal getGiamGia() { return giamGia; }
        public void setGiamGia(BigDecimal v) { this.giamGia = v; }
        public BigDecimal getDaThanhToan() { return daThanhToan; }
        public void setDaThanhToan(BigDecimal v) { this.daThanhToan = v; }
        public String getTrangThai() { return trangThai; }
        public void setTrangThai(String v) { this.trangThai = v; }
        public String getGhiChu() { return ghiChu; }
        public void setGhiChu(String v) { this.ghiChu = v; }
        public List<PurchaseLine> getLines() { return lines; }
        public void setLines(List<PurchaseLine> lines) { this.lines = lines; }
    }

    /** Dòng hàng trong request. */
    public static class PurchaseLine {
        @NotNull(message = "Sản phẩm bắt buộc chọn")
        private UUID idSanPham;
        @NotNull(message = "Số lượng bắt buộc nhập")
        @Min(value = 1, message = "Số lượng phải lớn hơn 0")
        private Integer soLuong;
        @Min(value = 1, message = "Số lượng nhận phải lớn hơn 0")
        private Integer soLuongNhan;
        @NotNull(message = "Đơn giá nhập bắt buộc nhập")
        @DecimalMin(value = "0", message = "Đơn giá nhập phải lớn hơn hoặc bằng 0")
        private BigDecimal donGiaNhap;
        @Min(value = 0, message = "VAT phải từ 0 đến 100")
        @Max(value = 100, message = "VAT phải từ 0 đến 100")
        private Integer vatPhantram;
        private LocalDate hanSuDung;

        public UUID getIdSanPham() { return idSanPham; }
        public void setIdSanPham(UUID v) { this.idSanPham = v; }
        public Integer getSoLuong() { return soLuong; }
        public void setSoLuong(Integer v) { this.soLuong = v; }
        public Integer getSoLuongNhan() { return soLuongNhan; }
        public void setSoLuongNhan(Integer v) { this.soLuongNhan = v; }
        public BigDecimal getDonGiaNhap() { return donGiaNhap; }
        public void setDonGiaNhap(BigDecimal v) { this.donGiaNhap = v; }
        public Integer getVatPhantram() { return vatPhantram; }
        public void setVatPhantram(Integer v) { this.vatPhantram = v; }
        public LocalDate getHanSuDung() { return hanSuDung; }
        public void setHanSuDung(LocalDate v) { this.hanSuDung = v; }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO')")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody PhieuNhap request) {
        return phieuNhapRepository.findById(id)
                .map(pn -> {
                    validatePurchaseTotals(request);
                    if (request.getMaPhieu() != null) pn.setMaPhieu(request.getMaPhieu());
                    if (request.getNgayDatHang() != null) pn.setNgayDatHang(request.getNgayDatHang());
                    if (request.getNgayDuKienGiao() != null) pn.setNgayDuKienGiao(request.getNgayDuKienGiao());
                    if (request.getNgayNhanThucTe() != null) pn.setNgayNhanThucTe(request.getNgayNhanThucTe());
                    if (request.getSubTotal() != null) pn.setSubTotal(request.getSubTotal());
                    if (request.getVatTotal() != null) pn.setVatTotal(request.getVatTotal());
                    if (request.getGiamGia() != null) pn.setGiamGia(request.getGiamGia());
                    if (request.getGrandTotal() != null) pn.setGrandTotal(request.getGrandTotal());
                    if (request.getDaThanhToan() != null) pn.setDaThanhToan(request.getDaThanhToan());
                    if (request.getCongNo() != null) pn.setCongNo(request.getCongNo());
                    if (request.getTrangThai() != null) pn.setTrangThai(request.getTrangThai());
                    if (request.getGhiChu() != null) pn.setGhiChu(request.getGhiChu());
                    pn.setNgayCapNhat(LocalDateTime.now());
                    phieuNhapRepository.save(pn);
                    return ResponseEntity.ok(toDTO(pn));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private void validatePurchaseTotals(PhieuNhap request) {
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getSubTotal(), "Tạm tính");
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getVatTotal(), "Tiền VAT");
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getGiamGia(), "Giảm giá");
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getGrandTotal(), "Tổng tiền");
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getDaThanhToan(), "Đã thanh toán");
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getCongNo(), "Công nợ");
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO')")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (phieuNhapRepository.existsById(id)) {
            phieuNhapRepository.deleteById(id);
            return ResponseEntity.ok( ApiResponse.ok("Xóa phiếu nhập thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    private PhieuNhapDTO toDTO(PhieuNhap pn) {
        PhieuNhapDTO dto = new PhieuNhapDTO();
        dto.setId(pn.getId());
        dto.setMaPhieu(pn.getMaPhieu());
        dto.setIdChiNhanh(pn.getIdChiNhanh());
        dto.setIdNcc(pn.getIdNcc());
        dto.setIdNguoiNhap(pn.getIdNguoiNhap());
        dto.setNgayDatHang(pn.getNgayDatHang());
        dto.setNgayDuKienGiao(pn.getNgayDuKienGiao());
        dto.setNgayNhanThucTe(pn.getNgayNhanThucTe());
        dto.setSubTotal(pn.getSubTotal());
        dto.setVatTotal(pn.getVatTotal());
        dto.setGiamGia(pn.getGiamGia());
        dto.setGrandTotal(pn.getGrandTotal());
        dto.setDaThanhToan(pn.getDaThanhToan());
        dto.setCongNo(pn.getCongNo());
        dto.setTrangThai(pn.getTrangThai());
        dto.setGhiChu(pn.getGhiChu());

        if (pn.getIdChiNhanh() != null) {
            chiNhanhRepository.findById(pn.getIdChiNhanh())
                    .ifPresent(cn -> dto.setTenChiNhanh(cn.getTenChiNhanh()));
        }
        if (pn.getIdNcc() != null) {
            nhaCungCapRepository.findById(pn.getIdNcc())
                    .ifPresent(ncc -> dto.setTenNcc(ncc.getTenNcc()));
        }
        if (pn.getIdNguoiNhap() != null) {
            nhanVienRepository.findById(pn.getIdNguoiNhap())
                    .ifPresent(nv -> dto.setTenNguoiNhap(nv.getHoTen()));
        }

        return dto;
    }

//    record SuccessResponse(String message) {}
}
