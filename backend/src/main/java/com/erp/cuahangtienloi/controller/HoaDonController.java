package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.HoaDonDTO;
import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.entity.ChiNhanh;
import com.erp.cuahangtienloi.entity.ChiTietHoaDon;
import com.erp.cuahangtienloi.entity.HoaDon;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.entity.SoQuy;
import com.erp.cuahangtienloi.entity.TonKho;
import com.erp.cuahangtienloi.repository.ChiNhanhRepository;
import com.erp.cuahangtienloi.repository.ChiTietHoaDonRepository;
import com.erp.cuahangtienloi.repository.HoaDonRepository;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import com.erp.cuahangtienloi.repository.SanPhamRepository;
import com.erp.cuahangtienloi.repository.TonKhoRepository;
import com.erp.cuahangtienloi.repository.SoQuyRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.erp.cuahangtienloi.validation.InputValidator.PAYMENT_METHODS;

@RestController
@RequestMapping("/api/hoa-don")
@RequiredArgsConstructor
//@CrossOrigin(origins = "*")
public class HoaDonController {

    private final HoaDonRepository hoaDonRepository;
    private final ChiNhanhRepository chiNhanhRepository;
    private final NhanVienRepository nhanVienRepository;
    private final ChiTietHoaDonRepository chiTietHoaDonRepository;
    private final SanPhamRepository sanPhamRepository;
    private final TonKhoRepository tonKhoRepository;
    private final SoQuyRepository soQuyRepository;
    private final JdbcTemplate jdbcTemplate;
    private final com.erp.cuahangtienloi.service.LoHangService loHangService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY', 'THU_NGAN')")
    public ResponseEntity<List<HoaDonDTO>> getAll(HttpServletRequest request) {
        List<HoaDonDTO> list = findInvoicesVisibleTo(request).stream()
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY', 'THU_NGAN')")
    public ResponseEntity<?> getById(@PathVariable UUID id, HttpServletRequest request) {
        return hoaDonRepository.findById(id)
                .filter(hd -> canReadInvoice(requireAuthenticatedEmployee(request), hd))
                .map(hd -> ResponseEntity.ok(toDTO(hd)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-branch/{idChiNhanh}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY', 'THU_NGAN')")
    public ResponseEntity<List<HoaDonDTO>> getByChiNhanh(@PathVariable UUID idChiNhanh,
                                                           HttpServletRequest request) {
        List<HoaDonDTO> list = findInvoicesVisibleTo(request).stream()
                .filter(hd -> idChiNhanh.equals(hd.getIdChiNhanh()))
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-cashier/{idThuNgan}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY', 'THU_NGAN')")
    public ResponseEntity<List<HoaDonDTO>> getByThuNgan(@PathVariable UUID idThuNgan,
                                                          HttpServletRequest request) {
        List<HoaDonDTO> list = findInvoicesVisibleTo(request).stream()
                .filter(hd -> idThuNgan.equals(hd.getIdThuNgan()))
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-status/{trangThai}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY', 'THU_NGAN')")
    public ResponseEntity<List<HoaDonDTO>> getByStatus(@PathVariable String trangThai,
                                                        HttpServletRequest request) {
        List<HoaDonDTO> list = findInvoicesVisibleTo(request).stream()
                .filter(hd -> trangThai.equals(hd.getTrangThai()))
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(list);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY', 'THU_NGAN')")
    public ResponseEntity<?> create(@RequestBody HoaDon request) {
        if (request.getIdChiNhanh() == null || !chiNhanhRepository.existsById(request.getIdChiNhanh())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Chi nhánh bán hàng không tồn tại"));
        }
        validatePayment(request.getHinhThucTt(), request.getGrandTotal(), request.getTienKhachDua());
        HoaDon hd = new HoaDon();
        hd.setId(UUID.randomUUID());
        hd.setMaHoaDon(request.getMaHoaDon());
        hd.setIdChiNhanh(request.getIdChiNhanh());
        hd.setIdThuNgan(request.getIdThuNgan());
        hd.setCaLamViec(request.getCaLamViec());
        hd.setNgayBan(request.getNgayBan() != null ? request.getNgayBan() : LocalDateTime.now());
        hd.setHinhThucTt(request.getHinhThucTt());
        hd.setSdtThanhVien(request.getSdtThanhVien());
        hd.setSubTotal(request.getSubTotal());
        hd.setGiamGia(request.getGiamGia());
        hd.setVatTotal(request.getVatTotal());
        hd.setGrandTotal(request.getGrandTotal());
        hd.setTienKhachDua(request.getTienKhachDua());
        hd.setTienThoi(request.getTienThoi());
        hd.setTrangThai(request.getTrangThai() != null ? request.getTrangThai() : "COMPLETED");
        hd.setNgayTao(LocalDateTime.now());
        hd.setNgayCapNhat(LocalDateTime.now());

        hoaDonRepository.save(hd);
        return ResponseEntity.ok(toDTO(hd));
    }

    /**
     * Tạo hoá đơn + toàn bộ dòng chi tiết trong MỘT transaction (dùng cho POS
     * checkout). Sinh mã HD-YYYYMMDD-NNNN ở Java để response có mã ngay, không
     * phụ thuộc trigger DB.
     */
    @PostMapping("/with-lines")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY', 'THU_NGAN')")
    @Transactional
    public ResponseEntity<?> createWithLines(@Valid @RequestBody CreateSaleRequest request, HttpServletRequest httpRequest) {
        if (request.getIdChiNhanh() == null) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Thiếu chi nhánh"));
        }
        if (request.getLines() == null || request.getLines().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Giỏ hàng trống"));
        }
        if (!chiNhanhRepository.existsById(request.getIdChiNhanh())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Chi nhánh bán hàng không tồn tại"));
        }
        validatePayment(request.getHinhThucTt(), request.getGrandTotal(), request.getTienKhachDua());
        for (SaleLine line : request.getLines()) {
            var product = sanPhamRepository.findById(line.getIdSanPham()).orElse(null);
            if (product == null || !Boolean.TRUE.equals(product.getDangHoatDong())) {
                return ResponseEntity.badRequest().body(ApiResponse.err("Sản phẩm không tồn tại hoặc đã ngừng bán"));
            }
            int stock = tonKhoRepository.findByIdSanPhamAndIdChiNhanh(line.getIdSanPham(), request.getIdChiNhanh())
                    .map(tk -> tk.getSoLuongTon() == null ? 0 : tk.getSoLuongTon())
                    .orElse(0);
            if (line.getSoLuong() > stock) {
                return ResponseEntity.badRequest().body(ApiResponse.err("Số lượng bán vượt tồn kho hiện tại"));
            }
        }
        if (request.getIdThuNgan() == null) {
            UUID authenticatedId = null;

            Object attr = httpRequest.getAttribute("authenticatedIdNhanVien");

            if (attr instanceof String s) {
                try {
                    UUID id = UUID.fromString(s);

                    if (nhanVienRepository.existsById(id)) {
                        authenticatedId = id;
                    }
                } catch (IllegalArgumentException ignored) {
                    // UUID không hợp lệ
                }
            }

            request.setIdThuNgan(authenticatedId);
        }

        HoaDon hd = new HoaDon();
        hd.setId(UUID.randomUUID());
        hd.setMaHoaDon(sinhMaHoaDon());
        hd.setIdChiNhanh(request.getIdChiNhanh());
        hd.setIdThuNgan(request.getIdThuNgan());
        hd.setCaLamViec(request.getCaLamViec() != null ? request.getCaLamViec() : "MORNING");
        hd.setNgayBan(request.getNgayBan() != null ? request.getNgayBan() : LocalDateTime.now());
        hd.setHinhThucTt(request.getHinhThucTt() != null ? request.getHinhThucTt() : "CASH");
        hd.setSdtThanhVien(request.getSdtThanhVien());
        hd.setSubTotal(request.getSubTotal() != null ? request.getSubTotal() : BigDecimal.ZERO);
        hd.setGiamGia(request.getGiamGia() != null ? request.getGiamGia() : BigDecimal.ZERO);
        hd.setVatTotal(request.getVatTotal() != null ? request.getVatTotal() : BigDecimal.ZERO);
        hd.setGrandTotal(request.getGrandTotal() != null ? request.getGrandTotal() : BigDecimal.ZERO);
        hd.setTienKhachDua(request.getTienKhachDua());
        hd.setTienThoi(request.getTienThoi());
        hd.setTrangThai("COMPLETED");
        hd.setNgayTao(LocalDateTime.now());
        hd.setNgayCapNhat(LocalDateTime.now());
        HoaDon saved = hoaDonRepository.saveAndFlush(hd);

        List<ChiTietHoaDon> lines = new ArrayList<>();
        int thuTu = 1;
        for (SaleLine line : request.getLines()) {
            ChiTietHoaDon ct = new ChiTietHoaDon();
            ct.setId(UUID.randomUUID());
            ct.setIdHoaDon(saved.getId());
            ct.setIdSanPham(line.getIdSanPham());
            ct.setSoLuong(line.getSoLuong());
            ct.setDonGia(line.getDonGia() != null ? line.getDonGia() : BigDecimal.ZERO);
            ct.setGiamGiaDong(line.getGiamGiaDong() != null ? line.getGiamGiaDong() : BigDecimal.ZERO);
            ct.setVatPhantram(line.getVatPhantram() != null ? line.getVatPhantram() : 8);
            ct.setThanhTien(line.getThanhTien() != null ? line.getThanhTien()
                    : line.getDonGia().multiply(BigDecimal.valueOf(line.getSoLuong())));
            ct.setDonGiaVon(line.getDonGiaVon() != null ? line.getDonGiaVon() : BigDecimal.ZERO);
            ct.setThuTu(thuTu++);
            ct.setNgayTao(LocalDateTime.now());
            lines.add(ct);
        }
        chiTietHoaDonRepository.saveAll(lines);
        chiTietHoaDonRepository.flush();

        return ResponseEntity.ok(toDTO(saved));
    }

    /**
     * Checkout POS nguyên tử. Backend là nguồn sự thật cho giá bán, VAT, giá
     * vốn, tổng tiền, tồn kho và phiếu thu; client chỉ gửi sản phẩm, số lượng
     * và các khoản giảm giá thủ công đã được giới hạn.
     */
    @PostMapping("/checkout")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY', 'THU_NGAN')")
    @Transactional
    public ResponseEntity<?> checkout(@Valid @RequestBody CheckoutRequest request,
                                      HttpServletRequest httpRequest) {
        UUID cashierId = resolveAuthenticatedIdNhanVien(httpRequest);
        if (cashierId == null) {
            return ResponseEntity.status(401).body(ApiResponse.err("Không xác định được nhân viên đăng nhập"));
        }
        NhanVien cashier = nhanVienRepository.findById(cashierId).orElseThrow();
        if (!"ADMIN".equals(cashier.getVaiTro())
                && cashier.getIdChiNhanh() != null
                && !cashier.getIdChiNhanh().equals(request.getIdChiNhanh())) {
            return ResponseEntity.status(403).body(ApiResponse.err("Không được bán hàng tại chi nhánh khác"));
        }
        if (!chiNhanhRepository.existsById(request.getIdChiNhanh())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Chi nhánh bán hàng không tồn tại"));
        }

        Map<UUID, CheckoutLine> requested = new LinkedHashMap<>();
        for (CheckoutLine line : request.getLines()) {
            if (requested.putIfAbsent(line.getIdSanPham(), line) != null) {
                return ResponseEntity.badRequest().body(ApiResponse.err("Một sản phẩm chỉ được xuất hiện một lần trong hóa đơn"));
            }
        }

        List<CheckoutLineCalculated> calculated = new ArrayList<>();
        BigDecimal subTotal = BigDecimal.ZERO;
        BigDecimal lineDiscountTotal = BigDecimal.ZERO;
        BigDecimal vatTotal = BigDecimal.ZERO;

        // Khóa theo UUID tăng dần để tránh deadlock khi nhiều thu ngân checkout.
        List<UUID> productIds = requested.keySet().stream().sorted(Comparator.naturalOrder()).toList();
        for (UUID productId : productIds) {
            CheckoutLine line = requested.get(productId);
            TonKho stock = tonKhoRepository.findByIdSanPhamAndIdChiNhanhForUpdate(productId, request.getIdChiNhanh())
                    .orElseThrow(() -> new IllegalArgumentException("Sản phẩm chưa có tồn kho tại chi nhánh"));
            if (stock.getSoLuongTon() == null || stock.getSoLuongTon() < line.getSoLuong()) {
                throw new IllegalArgumentException("Số lượng bán vượt tồn kho hiện tại");
            }
            var product = sanPhamRepository.findById(productId)
                    .filter(p -> Boolean.TRUE.equals(p.getDangHoatDong()))
                    .orElseThrow(() -> new IllegalArgumentException("Sản phẩm không tồn tại hoặc đã ngừng bán"));
            BigDecimal unitPrice = product.getGiaBan();
            if (unitPrice == null || unitPrice.signum() < 0) {
                throw new IllegalArgumentException("Sản phẩm chưa có giá bán hợp lệ");
            }
            BigDecimal gross = unitPrice.multiply(BigDecimal.valueOf(line.getSoLuong()));
            BigDecimal lineDiscount = line.getGiamGiaDong() == null ? BigDecimal.ZERO : line.getGiamGiaDong();
            if (lineDiscount.signum() < 0 || lineDiscount.compareTo(gross) > 0) {
                throw new IllegalArgumentException("Giảm giá dòng không hợp lệ");
            }
            int vat = product.getVatPhantram() == null ? 0 : product.getVatPhantram();
            BigDecimal net = gross.subtract(lineDiscount);
            BigDecimal lineVat = net.multiply(BigDecimal.valueOf(vat))
                    .divide(BigDecimal.valueOf(100))
                    .setScale(0, RoundingMode.HALF_UP);
            calculated.add(new CheckoutLineCalculated(productId, line.getSoLuong(), unitPrice,
                    lineDiscount, vat, net, stock.getGiaVonTrungBinh() == null ? BigDecimal.ZERO : stock.getGiaVonTrungBinh()));
            subTotal = subTotal.add(gross);
            lineDiscountTotal = lineDiscountTotal.add(lineDiscount);
            vatTotal = vatTotal.add(lineVat);
        }

        BigDecimal orderDiscount = request.getGiamGia() == null ? BigDecimal.ZERO : request.getGiamGia();
        if (orderDiscount.signum() < 0 || orderDiscount.compareTo(subTotal.subtract(lineDiscountTotal)) > 0) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Giảm giá hóa đơn không hợp lệ"));
        }
        BigDecimal totalDiscount = lineDiscountTotal.add(orderDiscount);
        BigDecimal grandTotal = subTotal.subtract(totalDiscount).add(vatTotal);
        String paymentMethod = request.getHinhThucTt() == null ? "CASH" : request.getHinhThucTt();
        validatePayment(paymentMethod, grandTotal, request.getTienKhachDua());
        BigDecimal tendered = "CASH".equals(paymentMethod) ? request.getTienKhachDua() : grandTotal;
        BigDecimal change = tendered.subtract(grandTotal);

        HoaDon invoice = new HoaDon();
        invoice.setId(UUID.randomUUID());
        invoice.setMaHoaDon(sinhMaHoaDon());
        invoice.setIdChiNhanh(request.getIdChiNhanh());
        invoice.setIdThuNgan(cashierId);
        invoice.setCaLamViec(request.getCaLamViec() == null ? "MORNING" : request.getCaLamViec());
        invoice.setNgayBan(LocalDateTime.now());
        invoice.setHinhThucTt(paymentMethod);
        invoice.setSdtThanhVien(request.getSdtThanhVien());
        invoice.setSubTotal(subTotal);
        invoice.setGiamGia(totalDiscount);
        invoice.setVatTotal(vatTotal);
        invoice.setGrandTotal(grandTotal);
        invoice.setTienKhachDua(tendered);
        invoice.setTienThoi(change);
        invoice.setTrangThai("COMPLETED");
        invoice.setNgayTao(LocalDateTime.now());
        invoice.setNgayCapNhat(LocalDateTime.now());
        HoaDon saved = hoaDonRepository.saveAndFlush(invoice);

        List<ChiTietHoaDon> invoiceLines = new ArrayList<>();
        int order = 1;
        for (CheckoutLineCalculated line : calculated) {
            ChiTietHoaDon detail = new ChiTietHoaDon();
            detail.setId(UUID.randomUUID());
            detail.setIdHoaDon(saved.getId());
            detail.setIdSanPham(line.productId());
            detail.setSoLuong(line.quantity());
            detail.setDonGia(line.unitPrice());
            detail.setGiamGiaDong(line.lineDiscount());
            detail.setVatPhantram(line.vatPercent());
            detail.setThanhTien(line.netAmount());
            detail.setDonGiaVon(line.unitCost());
            detail.setThuTu(order++);
            detail.setNgayTao(LocalDateTime.now());
            invoiceLines.add(detail);
        }
        chiTietHoaDonRepository.saveAll(invoiceLines);
        chiTietHoaDonRepository.flush();

        for (CheckoutLineCalculated line : calculated) {
            jdbcTemplate.query(
                    "SELECT fn_ghi_the_kho_va_dieu_chinh_ton(?::uuid, ?::uuid, 'SALE_OUT'::varchar, ?::integer, ?::numeric, ?::varchar, ?::varchar, NULL::date, ?::text, NOW()::timestamp)",
                    rs -> { }, line.productId(), request.getIdChiNhanh(), -line.quantity(), line.unitCost(),
                    saved.getMaHoaDon(), cashier.getHoTen(), "Bán hàng POS: " + saved.getMaHoaDon());
            loHangService.xuatKhoFEFO(line.productId(), request.getIdChiNhanh(), line.quantity());
        }

        if (soQuyRepository.existsByMaChungTuLienQuanAndDirectionAndHangMuc(
                saved.getMaHoaDon(), "RECEIPT", "BAN_HANG")) {
            throw new IllegalStateException("Phiếu thu cho hóa đơn đã tồn tại");
        }
        SoQuy cashEntry = new SoQuy();
        cashEntry.setId(UUID.randomUUID());
        cashEntry.setMaChungTu(null); // trigger DB sinh PT-YYYYMMDD-NNN
        cashEntry.setMaChungTuLienQuan(saved.getMaHoaDon());
        cashEntry.setIdChiNhanh(request.getIdChiNhanh());
        cashEntry.setIdNguoiTao(cashierId);
        cashEntry.setDirection("RECEIPT");
        cashEntry.setHangMuc("BAN_HANG");
        cashEntry.setHinhThucTt(paymentMethod);
        cashEntry.setEntryDate(LocalDate.now());
        cashEntry.setSoTien(grandTotal);
        cashEntry.setDoiTuong("Khách lẻ");
        cashEntry.setDienGiai("Doanh thu hóa đơn " + saved.getMaHoaDon());
        cashEntry.setRunningBalance(BigDecimal.ZERO); // trigger DB tính lại số dư.
        cashEntry.setTrangThai("COMPLETED");
        cashEntry.setNgayTao(LocalDateTime.now());
        cashEntry.setNgayCapNhat(LocalDateTime.now());
        soQuyRepository.saveAndFlush(cashEntry);

        return ResponseEntity.status(201).body(toDTO(saved));
    }

    /** Sinh mã hoá đơn từ sequence DB để checkout đồng thời không bị trùng mã. */
    private String sinhMaHoaDon() {
        String dateStr = LocalDate.now()
                .format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        Long sequence = jdbcTemplate.queryForObject(
                "SELECT nextval('seq_hoa_don_ma')", Long.class);
        return "HD-" + dateStr + "-" + String.format("%04d", sequence);
    }

    /** Request body cho /with-lines: header + danh sách dòng chi tiết. */
    public static class CreateSaleRequest {
        @NotNull(message = "Chi nhánh bắt buộc chọn")
        private UUID idChiNhanh;
        private UUID idThuNgan;
        private String caLamViec;
        private LocalDateTime ngayBan;
        private String hinhThucTt;
        private String sdtThanhVien;
        private BigDecimal subTotal;
        private BigDecimal giamGia;
        private BigDecimal vatTotal;
        private BigDecimal grandTotal;
        private BigDecimal tienKhachDua;
        private BigDecimal tienThoi;
        @NotEmpty(message = "Giỏ hàng không được để trống")
        @Valid
        private List<SaleLine> lines;

        public UUID getIdChiNhanh() { return idChiNhanh; }
        public void setIdChiNhanh(UUID v) { this.idChiNhanh = v; }
        public UUID getIdThuNgan() { return idThuNgan; }
        public void setIdThuNgan(UUID v) { this.idThuNgan = v; }
        public String getCaLamViec() { return caLamViec; }
        public void setCaLamViec(String v) { this.caLamViec = v; }
        public LocalDateTime getNgayBan() { return ngayBan; }
        public void setNgayBan(LocalDateTime v) { this.ngayBan = v; }
        public String getHinhThucTt() { return hinhThucTt; }
        public void setHinhThucTt(String v) { this.hinhThucTt = v; }
        public String getSdtThanhVien() { return sdtThanhVien; }
        public void setSdtThanhVien(String v) { this.sdtThanhVien = v; }
        public BigDecimal getSubTotal() { return subTotal; }
        public void setSubTotal(BigDecimal v) { this.subTotal = v; }
        public BigDecimal getGiamGia() { return giamGia; }
        public void setGiamGia(BigDecimal v) { this.giamGia = v; }
        public BigDecimal getVatTotal() { return vatTotal; }
        public void setVatTotal(BigDecimal v) { this.vatTotal = v; }
        public BigDecimal getGrandTotal() { return grandTotal; }
        public void setGrandTotal(BigDecimal v) { this.grandTotal = v; }
        public BigDecimal getTienKhachDua() { return tienKhachDua; }
        public void setTienKhachDua(BigDecimal v) { this.tienKhachDua = v; }
        public BigDecimal getTienThoi() { return tienThoi; }
        public void setTienThoi(BigDecimal v) { this.tienThoi = v; }
        public List<SaleLine> getLines() { return lines; }
        public void setLines(List<SaleLine> lines) { this.lines = lines; }
    }

    public static class CheckoutRequest {
        @NotNull(message = "Chi nhánh bắt buộc chọn")
        private UUID idChiNhanh;
        private String caLamViec;
        private String hinhThucTt;
        private String sdtThanhVien;
        @DecimalMin(value = "0", message = "Giảm giá không được âm")
        private BigDecimal giamGia;
        private BigDecimal tienKhachDua;
        @NotEmpty(message = "Giỏ hàng không được để trống")
        @Valid
        private List<CheckoutLine> lines;
        public UUID getIdChiNhanh() { return idChiNhanh; }
        public void setIdChiNhanh(UUID v) { idChiNhanh = v; }
        public String getCaLamViec() { return caLamViec; }
        public void setCaLamViec(String v) { caLamViec = v; }
        public String getHinhThucTt() { return hinhThucTt; }
        public void setHinhThucTt(String v) { hinhThucTt = v; }
        public String getSdtThanhVien() { return sdtThanhVien; }
        public void setSdtThanhVien(String v) { sdtThanhVien = v; }
        public BigDecimal getGiamGia() { return giamGia; }
        public void setGiamGia(BigDecimal v) { giamGia = v; }
        public BigDecimal getTienKhachDua() { return tienKhachDua; }
        public void setTienKhachDua(BigDecimal v) { tienKhachDua = v; }
        public List<CheckoutLine> getLines() { return lines; }
        public void setLines(List<CheckoutLine> v) { lines = v; }
    }

    public static class CheckoutLine {
        @NotNull(message = "Sản phẩm bắt buộc chọn") private UUID idSanPham;
        @NotNull(message = "Số lượng bắt buộc nhập") @Min(1) private Integer soLuong;
        @DecimalMin(value = "0", message = "Giảm giá không được âm") private BigDecimal giamGiaDong;
        public UUID getIdSanPham() { return idSanPham; }
        public void setIdSanPham(UUID v) { idSanPham = v; }
        public Integer getSoLuong() { return soLuong; }
        public void setSoLuong(Integer v) { soLuong = v; }
        public BigDecimal getGiamGiaDong() { return giamGiaDong; }
        public void setGiamGiaDong(BigDecimal v) { giamGiaDong = v; }
    }

    private record CheckoutLineCalculated(UUID productId, Integer quantity, BigDecimal unitPrice,
                                           BigDecimal lineDiscount, Integer vatPercent,
                                           BigDecimal netAmount, BigDecimal unitCost) {}

    private UUID resolveAuthenticatedIdNhanVien(HttpServletRequest request) {
        Object attr = request.getAttribute("authenticatedIdNhanVien");
        if (attr instanceof String value) {
            try { return UUID.fromString(value); } catch (IllegalArgumentException ignored) { }
        }
        return null;
    }

    /** Áp phạm vi dữ liệu tại backend; frontend chỉ là lớp hiển thị bổ sung. */
    private List<HoaDon> findInvoicesVisibleTo(HttpServletRequest request) {
        NhanVien actor = requireAuthenticatedEmployee(request);
        return switch (actor.getVaiTro()) {
            case "ADMIN", "KE_TOAN" -> hoaDonRepository.findAll();
            case "QUAN_LY" -> actor.getIdChiNhanh() == null
                    ? List.of()
                    : hoaDonRepository.findByIdChiNhanh(actor.getIdChiNhanh());
            case "THU_NGAN" -> hoaDonRepository.findByIdThuNgan(actor.getId());
            default -> List.of();
        };
    }

    private boolean canReadInvoice(NhanVien actor, HoaDon invoice) {
        return switch (actor.getVaiTro()) {
            case "ADMIN", "KE_TOAN" -> true;
            case "QUAN_LY" -> actor.getIdChiNhanh() != null
                    && actor.getIdChiNhanh().equals(invoice.getIdChiNhanh());
            case "THU_NGAN" -> actor.getId().equals(invoice.getIdThuNgan());
            default -> false;
        };
    }

    private NhanVien requireAuthenticatedEmployee(HttpServletRequest request) {
        UUID employeeId = resolveAuthenticatedIdNhanVien(request);
        if (employeeId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Tài khoản chưa liên kết nhân viên");
        }
        return nhanVienRepository.findById(employeeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Nhân viên đăng nhập không tồn tại"));
    }

    /** Dòng chi tiết hoá đơn trong request. */
    public static class SaleLine {
        @NotNull(message = "Sản phẩm bắt buộc chọn")
        private UUID idSanPham;
        @NotNull(message = "Số lượng bắt buộc nhập")
        @Min(value = 1, message = "Số lượng bán phải lớn hơn 0")
        private Integer soLuong;
        @NotNull(message = "Đơn giá bắt buộc nhập")
        @DecimalMin(value = "0", message = "Đơn giá phải lớn hơn hoặc bằng 0")
        private BigDecimal donGia;
        private BigDecimal giamGiaDong;
        private Integer vatPhantram;
        private BigDecimal thanhTien;
        private BigDecimal donGiaVon;

        public UUID getIdSanPham() { return idSanPham; }
        public void setIdSanPham(UUID v) { this.idSanPham = v; }
        public Integer getSoLuong() { return soLuong; }
        public void setSoLuong(Integer v) { this.soLuong = v; }
        public BigDecimal getDonGia() { return donGia; }
        public void setDonGia(BigDecimal v) { this.donGia = v; }
        public BigDecimal getGiamGiaDong() { return giamGiaDong; }
        public void setGiamGiaDong(BigDecimal v) { this.giamGiaDong = v; }
        public Integer getVatPhantram() { return vatPhantram; }
        public void setVatPhantram(Integer v) { this.vatPhantram = v; }
        public BigDecimal getThanhTien() { return thanhTien; }
        public void setThanhTien(BigDecimal v) { this.thanhTien = v; }
        public BigDecimal getDonGiaVon() { return donGiaVon; }
        public void setDonGiaVon(BigDecimal v) { this.donGiaVon = v; }
    }

    private void validatePayment(String method, BigDecimal total, BigDecimal customerPaid) {
        String paymentMethod = method != null ? method : "CASH";
        if (!PAYMENT_METHODS.contains(paymentMethod)) {
            throw new IllegalArgumentException("Phương thức thanh toán không hợp lệ");
        }
        if (total != null && total.signum() < 0) {
            throw new IllegalArgumentException("Tổng tiền phải lớn hơn hoặc bằng 0");
        }
        if ("CASH".equals(paymentMethod)
                && total != null && (customerPaid == null || customerPaid.compareTo(total) < 0)) {
            throw new IllegalArgumentException("Tiền khách đưa phải lớn hơn hoặc bằng tổng tiền");
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody HoaDon request) {
        return hoaDonRepository.findById(id)
                .map(hd -> {
                    if (request.getMaHoaDon() != null) hd.setMaHoaDon(request.getMaHoaDon());
                    if (request.getCaLamViec() != null) hd.setCaLamViec(request.getCaLamViec());
                    if (request.getHinhThucTt() != null) hd.setHinhThucTt(request.getHinhThucTt());
                    if (request.getSdtThanhVien() != null) hd.setSdtThanhVien(request.getSdtThanhVien());
                    if (request.getSubTotal() != null) hd.setSubTotal(request.getSubTotal());
                    if (request.getGiamGia() != null) hd.setGiamGia(request.getGiamGia());
                    if (request.getVatTotal() != null) hd.setVatTotal(request.getVatTotal());
                    if (request.getGrandTotal() != null) hd.setGrandTotal(request.getGrandTotal());
                    if (request.getTienKhachDua() != null) hd.setTienKhachDua(request.getTienKhachDua());
                    if (request.getTienThoi() != null) hd.setTienThoi(request.getTienThoi());
                    if (request.getTrangThai() != null) hd.setTrangThai(request.getTrangThai());
                    if ("REFUNDED".equals(request.getTrangThai())) {
                        hd.setIdNguoiHoan(request.getIdNguoiHoan());
                        hd.setNgayHoan(LocalDateTime.now());
                        hd.setLyDoHoan(request.getLyDoHoan());
                    }
                    if (request.getGhiChu() != null) hd.setGhiChu(request.getGhiChu());
                    hd.setNgayCapNhat(LocalDateTime.now());
                    hoaDonRepository.save(hd);
                    return ResponseEntity.ok(toDTO(hd));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (hoaDonRepository.existsById(id)) {
            hoaDonRepository.deleteById(id);
            return ResponseEntity.ok( ApiResponse.ok("Xóa hóa đơn thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    private HoaDonDTO toDTO(HoaDon hd) {
        HoaDonDTO dto = new HoaDonDTO();
        dto.setId(hd.getId());
        dto.setMaHoaDon(hd.getMaHoaDon());
        dto.setIdChiNhanh(hd.getIdChiNhanh());
        dto.setIdThuNgan(hd.getIdThuNgan());
        dto.setCaLamViec(hd.getCaLamViec());
        dto.setNgayBan(hd.getNgayBan());
        dto.setHinhThucTt(hd.getHinhThucTt());
        dto.setSdtThanhVien(hd.getSdtThanhVien());
        dto.setSubTotal(hd.getSubTotal());
        dto.setGiamGia(hd.getGiamGia());
        dto.setVatTotal(hd.getVatTotal());
        dto.setGrandTotal(hd.getGrandTotal());
        dto.setTienKhachDua(hd.getTienKhachDua());
        dto.setTienThoi(hd.getTienThoi());
        dto.setTrangThai(hd.getTrangThai());
        dto.setIdNguoiHoan(hd.getIdNguoiHoan());
        dto.setNgayHoan(hd.getNgayHoan());
        dto.setLyDoHoan(hd.getLyDoHoan());
        dto.setGhiChu(hd.getGhiChu());

        if (hd.getIdChiNhanh() != null) {
            chiNhanhRepository.findById(hd.getIdChiNhanh())
                    .ifPresent(cn -> dto.setTenChiNhanh(cn.getTenChiNhanh()));
        }
        if (hd.getIdThuNgan() != null) {
            nhanVienRepository.findById(hd.getIdThuNgan())
                    .ifPresent(nv -> dto.setTenThuNgan(nv.getHoTen()));
        }

        return dto;
    }

//    record SuccessResponse(String message) {}
}
