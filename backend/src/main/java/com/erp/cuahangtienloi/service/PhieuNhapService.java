package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.PhieuNhapDTO;
import com.erp.cuahangtienloi.entity.ChiTietPhieuNhap;
import com.erp.cuahangtienloi.entity.NhaCungCap;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.entity.PhieuNhap;
import com.erp.cuahangtienloi.entity.SanPham;
import com.erp.cuahangtienloi.entity.SoQuy;
import com.erp.cuahangtienloi.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PhieuNhapService {

    private final PhieuNhapRepository phieuNhapRepository;
    private final ChiNhanhRepository chiNhanhRepository;
    private final NhaCungCapRepository nhaCungCapRepository;
    private final NhanVienRepository nhanVienRepository;
    private final ChiTietPhieuNhapRepository chiTietPhieuNhapRepository;
    private final SanPhamRepository sanPhamRepository;
    private final LoHangService loHangService;
    private final SoQuyRepository soQuyRepository;
    private final JdbcTemplate jdbcTemplate;
    private final BranchAccessService branchAccessService;

    @PersistenceContext
    private EntityManager entityManager;

    @Getter
    @Setter
    public static class PayRequest {
        private BigDecimal daThanhToan;
    }

    @Getter
    @Setter
    public static class CreatePurchaseRequest {
        private UUID idChiNhanh;
        @NotNull(message = "Nhà cung cấp bắt buộc chọn")
        private UUID idNcc;
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
    }

    @Getter
    @Setter
    public static class PurchaseLine {
        @NotNull(message = "Sản phẩm bắt buộc chọn")
        private UUID idSanPham;
        @NotNull(message = "Số lượng bắt buộc nhập")
        @Min(value = 1, message = "Số lượng phải lớn hơn 0")
        private Integer soLuong;
        @Min(value = 1, message = "Số lượng nhận phải lớn hơn 0")
        private Integer soLuongNhan;
        @NotNull(message = "Đơn giá nhập bắt buộc nhập")
        @DecimalMin(value = "0.01", message = "Đơn giá nhập phải lớn hơn 0")
        private BigDecimal donGiaNhap;
        @Min(value = 0, message = "VAT phải từ 0 đến 100")
        @Max(value = 100, message = "VAT phải từ 0 đến 100")
        private Integer vatPhantram;
        private LocalDate hanSuDung;
    }

    @Transactional(readOnly = true)
    public List<PhieuNhapDTO> getAll(NhanVien actor) {
        return phieuNhapRepository.findAll().stream()
                .filter(pn -> branchAccessService.canReadBranch(actor, pn.getIdChiNhanh()))
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<PhieuNhapDTO> getById(UUID id, NhanVien actor) {
        return phieuNhapRepository.findById(id)
                .filter(pn -> branchAccessService.canReadBranch(actor, pn.getIdChiNhanh()))
                .map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public List<PhieuNhapDTO> getByChiNhanh(UUID idChiNhanh, NhanVien actor) {
        branchAccessService.requireReadableBranch(actor, idChiNhanh);
        return phieuNhapRepository.findByIdChiNhanh(idChiNhanh).stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PhieuNhapDTO> getByNcc(UUID idNcc, NhanVien actor) {
        return phieuNhapRepository.findByIdNcc(idNcc).stream()
                .filter(pn -> branchAccessService.canReadBranch(actor, pn.getIdChiNhanh()))
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PhieuNhapDTO> getByStatus(String trangThai, NhanVien actor) {
        return phieuNhapRepository.findByTrangThai(trangThai).stream()
                .filter(pn -> branchAccessService.canReadBranch(actor, pn.getIdChiNhanh()))
                .map(this::toDTO)
                .toList();
    }

    @Transactional
    public PhieuNhapDTO createWithLines(CreatePurchaseRequest request, NhanVien actor) {
        if (request.getIdNcc() == null) {
            throw new IllegalArgumentException("Thiếu nhà cung cấp");
        }
        if (request.getLines() == null || request.getLines().isEmpty()) {
            throw new IllegalArgumentException("Phiếu không có dòng hàng");
        }
        if (!nhaCungCapRepository.existsById(request.getIdNcc())) {
            throw new IllegalArgumentException("Nhà cung cấp không tồn tại");
        }

        UUID idChiNhanh = request.getIdChiNhanh();
        if (idChiNhanh == null) {
            throw new IllegalArgumentException("Thiếu kho nhận hàng");
        }
        if (!chiNhanhRepository.existsById(idChiNhanh)) {
            throw new IllegalArgumentException("Chi nhánh nhập hàng không tồn tại");
        }
        branchAccessService.requireReadableBranch(actor, idChiNhanh);
        for (PurchaseLine line : request.getLines()) {
            if (!sanPhamRepository.existsById(line.getIdSanPham())) {
                throw new IllegalArgumentException("Sản phẩm trong phiếu nhập không tồn tại");
            }
            if (line.getSoLuongNhan() != null && line.getSoLuongNhan() > line.getSoLuong()) {
                throw new IllegalArgumentException("Số lượng nhận không được vượt số lượng đặt");
            }
        }

        PhieuNhap pn = new PhieuNhap();
        pn.setId(UUID.randomUUID());
        pn.setIdChiNhanh(idChiNhanh);
        pn.setIdNcc(request.getIdNcc());
        pn.setIdNguoiNhap(actor.getId());
        LocalDate ngayNhap = request.getNgayDatHang() != null ? request.getNgayDatHang() : LocalDate.now();
        pn.setNgayDatHang(ngayNhap);
        pn.setNgayDuKienGiao(request.getNgayDuKienGiao() != null ? request.getNgayDuKienGiao() : ngayNhap);
        pn.setNgayNhanThucTe(request.getNgayNhanThucTe() != null ? request.getNgayNhanThucTe() : ngayNhap);
        pn.setGiamGia(request.getGiamGia() != null ? request.getGiamGia() : BigDecimal.ZERO);
        pn.setTrangThai(request.getTrangThai() != null ? request.getTrangThai() : "COMPLETED");
        pn.setGhiChu(request.getGhiChu());
        pn.setSubTotal(BigDecimal.ZERO);
        pn.setVatTotal(BigDecimal.ZERO);
        pn.setGrandTotal(BigDecimal.ZERO);
        pn.setDaThanhToan(BigDecimal.ZERO);
        pn.setCongNo(BigDecimal.ZERO);
        pn.setNgayTao(LocalDateTime.now());
        pn.setNgayCapNhat(LocalDateTime.now());
        PhieuNhap saved = phieuNhapRepository.saveAndFlush(pn);

        List<ChiTietPhieuNhap> lines = new ArrayList<>();
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
            ct.setThanhTien(BigDecimal.ZERO);
            ct.setHanSuDung(line.getHanSuDung());
            ct.setThuTu(thuTu++);
            ct.setNgayTao(LocalDateTime.now());
            lines.add(ct);
        }
        if (lines.isEmpty()) {
            throw new IllegalArgumentException("Không có dòng hàng hợp lệ");
        }
        chiTietPhieuNhapRepository.saveAll(lines);
        chiTietPhieuNhapRepository.flush();

        boolean awaitingPayment = "PENDING_PAYMENT".equalsIgnoreCase(saved.getTrangThai())
                || "PENDING".equalsIgnoreCase(saved.getTrangThai());
        if (awaitingPayment) {
            entityManager.clear();
            return toDTO(phieuNhapRepository.findById(saved.getId()).orElseThrow());
        }

        BigDecimal paid = request.getDaThanhToan() != null
                ? request.getDaThanhToan()
                : jdbcTemplate.queryForObject(
                        "SELECT grand_total FROM phieu_nhap WHERE id = ?",
                        BigDecimal.class, saved.getId());
        jdbcTemplate.update(
                "UPDATE phieu_nhap SET da_thanh_toan = ?, ngay_cap_nhat = NOW() WHERE id = ?",
                paid, saved.getId());

        PhieuNhap reloaded = phieuNhapRepository.findById(saved.getId()).orElseThrow();
        for (ChiTietPhieuNhap ct : lines) {
            if (ct.getSoLuongNhan() != null && ct.getSoLuongNhan() > 0) {
                LocalDate hsd = ct.getHanSuDung();
                if (hsd == null) {
                    SanPham sp = sanPhamRepository.findById(ct.getIdSanPham()).orElse(null);
                    if (sp != null && sp.getHanSuDungNgay() != null && sp.getHanSuDungNgay() >= 0) {
                        hsd = LocalDate.now().plusDays(sp.getHanSuDungNgay());
                    }
                }
                jdbcTemplate.query(
                        "SELECT fn_ghi_the_kho_va_dieu_chinh_ton(?::uuid, ?::uuid, ?::varchar, ?::integer, ?::numeric, ?::varchar, ?::varchar, ?::date, ?::text, NOW()::timestamp)",
                        rs -> { },
                        ct.getIdSanPham(), idChiNhanh, "PURCHASE_IN", ct.getSoLuongNhan(), ct.getDonGiaNhap(),
                        reloaded.getMaPhieu(), "Hệ thống POS", hsd,
                        "Nhập hàng từ NCC: phiếu " + reloaded.getMaPhieu());
                loHangService.taoHoacCapNhatLoHang(
                        ct.getIdSanPham(), idChiNhanh, ct.getSoLuongNhan(),
                        ct.getDonGiaNhap(), hsd, null, null);
            }
        }

        entityManager.clear();
        return toDTO(phieuNhapRepository.findById(saved.getId()).orElseThrow());
    }

    /**
     * Bước 2: Kế toán bấm "Thanh toán" trả NCC:
     *   1. Kiểm tra phiếu ở trạng thái PENDING_PAYMENT.
     *   2. Cập nhật da_thanh_toan = grand_total.
     *   3. Chuyển trạng thái: PENDING_PAYMENT -> PENDING ("Chờ nhận hàng").
     *   4. Ghi sổ quỹ phiếu CHI (hạng mục NHAP_HANG).
     *   Lưu ý: Chưa cộng tồn kho và chưa tạo lô hàng tại bước này (hàng thực tế chưa về kho).
     */
    @Transactional
    public Optional<PhieuNhapDTO> pay(UUID id, PayRequest request, NhanVien actor) {
        Optional<PhieuNhap> found = phieuNhapRepository.findByIdForUpdate(id);
        if (found.isEmpty()) {
            return Optional.empty();
        }
        PhieuNhap pn = found.get();
        branchAccessService.requireReadableBranch(actor, pn.getIdChiNhanh());
        if (!"PENDING_PAYMENT".equalsIgnoreCase(pn.getTrangThai())
                && !"PENDING".equalsIgnoreCase(pn.getTrangThai())) {
            throw new IllegalArgumentException("Chỉ thanh toán được phiếu ở trạng thái chờ thanh toán");
        }

        List<ChiTietPhieuNhap> lines = chiTietPhieuNhapRepository.findByIdPhieuNhap(id);
        if (lines.isEmpty()) {
            throw new IllegalArgumentException("Phiếu không có dòng chi tiết — không thể thanh toán");
        }

        BigDecimal grand = jdbcTemplate.queryForObject(
                "SELECT grand_total FROM phieu_nhap WHERE id = ?", BigDecimal.class, id);
        BigDecimal paid = request != null && request.getDaThanhToan() != null
                ? request.getDaThanhToan() : grand;
        if (paid.signum() < 0) {
            throw new IllegalArgumentException("Số tiền trả không được âm");
        }
        if (paid.compareTo(grand) != 0) {
            throw new IllegalArgumentException("Phải thanh toán đủ giá trị phiếu nhập");
        }

        jdbcTemplate.update(
                "UPDATE phieu_nhap SET trang_thai = 'PENDING', da_thanh_toan = ?, ngay_cap_nhat = NOW() WHERE id = ?",
                paid, id);

        if (!soQuyRepository.existsByMaChungTuLienQuanAndDirectionAndHangMuc(
                pn.getMaPhieu(), "PAYMENT", "NHAP_HANG")) {
            String tenNcc = nhaCungCapRepository.findById(pn.getIdNcc())
                    .map(NhaCungCap::getTenNcc)
                    .orElse("Nhà cung cấp");
            SoQuy cashEntry = new SoQuy();
            cashEntry.setId(UUID.randomUUID());
            cashEntry.setMaChungTu(null);
            cashEntry.setMaChungTuLienQuan(pn.getMaPhieu());
            cashEntry.setIdChiNhanh(pn.getIdChiNhanh());
            cashEntry.setIdNguoiTao(actor.getId());
            cashEntry.setDirection("PAYMENT");
            cashEntry.setHangMuc("NHAP_HANG");
            cashEntry.setHinhThucTt("BANK_TRANSFER");
            cashEntry.setEntryDate(LocalDate.now());
            cashEntry.setSoTien(paid);
            cashEntry.setDoiTuong(tenNcc);
            cashEntry.setDienGiai("Thanh toán nhập hàng " + pn.getMaPhieu() + " · NCC " + tenNcc);
            cashEntry.setRunningBalance(BigDecimal.ZERO);
            cashEntry.setTrangThai("COMPLETED");
            cashEntry.setNgayTao(LocalDateTime.now());
            cashEntry.setNgayCapNhat(LocalDateTime.now());
            soQuyRepository.save(cashEntry);
        }

        entityManager.clear();
        return Optional.of(toDTO(phieuNhapRepository.findById(id).orElseThrow()));
    }

    /**
     * Bước 3: Thủ kho bấm "Đã nhận hàng" khi xe giao đến kho:
     *   1. Ghi nhận ngay_nhan_thuc_te = LocalDate.now().
     *   2. Chuyển trạng thái: PENDING -> COMPLETED.
     *   3. Tính hạn sử dụng từng dòng: HSD = ngay_nhan_thuc_te + sp.hanSuDungNgay (nếu chưa có).
     *   4. Cộng tồn Kho Tổng + ghi thẻ kho PURCHASE_IN cho từng dòng.
     *   5. Tạo Lô hàng (lo_hang) theo FEFO chuẩn.
     */
    @Transactional
    public Optional<PhieuNhapDTO> receive(UUID id, NhanVien actor) {
        Optional<PhieuNhap> found = phieuNhapRepository.findByIdForUpdate(id);
        if (found.isEmpty()) {
            return Optional.empty();
        }
        PhieuNhap pn = found.get();
        branchAccessService.requireReadableBranch(actor, pn.getIdChiNhanh());

        if ("COMPLETED".equalsIgnoreCase(pn.getTrangThai())) {
            throw new IllegalArgumentException("Phiếu nhập này đã nhận hàng hoàn tất");
        }
        if ("CANCELLED".equalsIgnoreCase(pn.getTrangThai())) {
            throw new IllegalArgumentException("Không thể nhận hàng cho phiếu đã huỷ");
        }
        if (!"PENDING".equalsIgnoreCase(pn.getTrangThai())) {
            throw new IllegalArgumentException("Chỉ nhận hàng cho phiếu ở trạng thái chờ nhận hàng (đã thanh toán)");
        }

        List<ChiTietPhieuNhap> lines = chiTietPhieuNhapRepository.findByIdPhieuNhap(id);
        if (lines.isEmpty()) {
            throw new IllegalArgumentException("Phiếu không có dòng chi tiết — không thể nhận hàng");
        }

        LocalDate ngayNhan = LocalDate.now();

        for (ChiTietPhieuNhap ct : lines) {
            if (ct.getSoLuongNhan() != null && ct.getSoLuongNhan() > 0) {
                LocalDate hsd = ct.getHanSuDung();
                if (hsd == null) {
                    SanPham sp = sanPhamRepository.findById(ct.getIdSanPham()).orElse(null);
                    if (sp != null && sp.getHanSuDungNgay() != null && sp.getHanSuDungNgay() >= 0) {
                        hsd = ngayNhan.plusDays(sp.getHanSuDungNgay());
                    }
                }
                ct.setHanSuDung(hsd);
                chiTietPhieuNhapRepository.save(ct);

                jdbcTemplate.query(
                        "SELECT fn_ghi_the_kho_va_dieu_chinh_ton(?::uuid, ?::uuid, ?::varchar, ?::integer, ?::numeric, ?::varchar, ?::varchar, ?::date, ?::text, NOW()::timestamp)",
                        rs -> { },
                        ct.getIdSanPham(), pn.getIdChiNhanh(), "PURCHASE_IN", ct.getSoLuongNhan(),
                        ct.getDonGiaNhap(), pn.getMaPhieu(), "Thủ kho", hsd,
                        "Nhập hàng từ NCC: phiếu " + pn.getMaPhieu());

                loHangService.taoHoacCapNhatLoHang(
                        ct.getIdSanPham(), pn.getIdChiNhanh(), ct.getSoLuongNhan(),
                        ct.getDonGiaNhap(), hsd, null, null);
            }
        }

        jdbcTemplate.update(
                "UPDATE phieu_nhap SET trang_thai = 'COMPLETED', ngay_nhan_thuc_te = ?, ngay_cap_nhat = NOW() WHERE id = ?",
                ngayNhan, id);

        entityManager.clear();
        return Optional.of(toDTO(phieuNhapRepository.findById(id).orElseThrow()));
    }

    @Transactional
    public Optional<PhieuNhapDTO> update(UUID id, PhieuNhap request, NhanVien actor) {
        return phieuNhapRepository.findById(id)
                .map(pn -> {
                    branchAccessService.requireReadableBranch(actor, pn.getIdChiNhanh());
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
                    return toDTO(pn);
                });
    }

    @Transactional
    public boolean delete(UUID id, NhanVien actor) {
        return phieuNhapRepository.findById(id).map(pn -> {
            branchAccessService.requireReadableBranch(actor, pn.getIdChiNhanh());
            phieuNhapRepository.delete(pn);
            return true;
        }).orElse(false);
    }

    private void validatePurchaseTotals(PhieuNhap request) {
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getSubTotal(), "Tạm tính");
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getVatTotal(), "Tiền VAT");
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getGiamGia(), "Giảm giá");
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getGrandTotal(), "Tổng tiền");
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getDaThanhToan(), "Đã thanh toán");
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getCongNo(), "Công nợ");
    }

    // --- Logic ChiTietPhieuNhap ---
    @Transactional(readOnly = true)
    public List<ChiTietPhieuNhap> getLinesByPhieuNhap(UUID idPhieuNhap, NhanVien actor) {
        requireReadableHeader(idPhieuNhap, actor);
        return chiTietPhieuNhapRepository.findByIdPhieuNhap(idPhieuNhap);
    }

    @Transactional(readOnly = true)
    public List<ChiTietPhieuNhap> getLinesBySanPham(UUID idSanPham, NhanVien actor) {
        return chiTietPhieuNhapRepository.findByIdSanPham(idSanPham).stream()
                .filter(ct -> canReadHeader(actor, ct.getIdPhieuNhap()))
                .toList();
    }

    @Transactional
    public ChiTietPhieuNhap createLine(ChiTietPhieuNhap request, NhanVien actor) {
        validateLine(request, actor);
        ChiTietPhieuNhap ct = new ChiTietPhieuNhap();
        ct.setId(UUID.randomUUID());
        ct.setIdPhieuNhap(request.getIdPhieuNhap());
        ct.setIdSanPham(request.getIdSanPham());
        ct.setSoLuongDat(request.getSoLuongDat());
        ct.setSoLuongNhan(request.getSoLuongNhan() != null ? request.getSoLuongNhan() : 0);
        ct.setDonGiaNhap(request.getDonGiaNhap());
        ct.setVatPhantram(request.getVatPhantram() != null ? request.getVatPhantram() : 8);
        ct.setThanhTien(request.getThanhTien());
        ct.setHanSuDung(request.getHanSuDung());
        ct.setThuTu(request.getThuTu() != null ? request.getThuTu() : 0);
        ct.setNgayTao(LocalDateTime.now());
        return chiTietPhieuNhapRepository.save(ct);
    }

    @Transactional
    public void createBatchLines(List<ChiTietPhieuNhap> requests, NhanVien actor) {
        if (requests == null || requests.isEmpty()) {
            throw new IllegalArgumentException("Danh sách chi tiết phiếu nhập rỗng");
        }
        for (ChiTietPhieuNhap request : requests) {
            validateLine(request, actor);
            ChiTietPhieuNhap ct = new ChiTietPhieuNhap();
            ct.setId(UUID.randomUUID());
            ct.setIdPhieuNhap(request.getIdPhieuNhap());
            ct.setIdSanPham(request.getIdSanPham());
            ct.setSoLuongDat(request.getSoLuongDat());
            ct.setSoLuongNhan(request.getSoLuongNhan() != null ? request.getSoLuongNhan() : 0);
            ct.setDonGiaNhap(request.getDonGiaNhap());
            ct.setVatPhantram(request.getVatPhantram() != null ? request.getVatPhantram() : 8);
            ct.setThanhTien(request.getThanhTien());
            ct.setHanSuDung(request.getHanSuDung());
            ct.setThuTu(request.getThuTu() != null ? request.getThuTu() : 0);
            ct.setNgayTao(LocalDateTime.now());
            chiTietPhieuNhapRepository.save(ct);
        }
    }

    @Transactional
    public boolean deleteLine(UUID id, NhanVien actor) {
        return chiTietPhieuNhapRepository.findById(id).map(ct -> {
            requireReadableHeader(ct.getIdPhieuNhap(), actor);
            chiTietPhieuNhapRepository.delete(ct);
            return true;
        }).orElse(false);
    }

    @Transactional
    public void deleteLinesByPhieuNhap(UUID idPhieuNhap, NhanVien actor) {
        requireReadableHeader(idPhieuNhap, actor);
        List<ChiTietPhieuNhap> list = chiTietPhieuNhapRepository.findByIdPhieuNhap(idPhieuNhap);
        chiTietPhieuNhapRepository.deleteAll(list);
    }

    private void validateLine(ChiTietPhieuNhap request, NhanVien actor) {
        if (request.getIdPhieuNhap() == null || !phieuNhapRepository.existsById(request.getIdPhieuNhap())) {
            throw new IllegalArgumentException("Phiếu nhập không tồn tại");
        }
        if (request.getIdSanPham() == null || !sanPhamRepository.existsById(request.getIdSanPham())) {
            throw new IllegalArgumentException("Sản phẩm không tồn tại");
        }
        requireReadableHeader(request.getIdPhieuNhap(), actor);
        com.erp.cuahangtienloi.validation.InputValidator.positive(request.getSoLuongDat(), "Số lượng đặt");
        if (request.getSoLuongNhan() != null) {
            com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getSoLuongNhan(), "Số lượng nhận");
            if (request.getSoLuongNhan() > request.getSoLuongDat()) {
                throw new IllegalArgumentException("Số lượng nhận không được vượt số lượng đặt");
            }
        }
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getDonGiaNhap(), "Đơn giá nhập");
        if (request.getVatPhantram() != null && (request.getVatPhantram() < 0 || request.getVatPhantram() > 100)) {
            throw new IllegalArgumentException("VAT phải từ 0 đến 100");
        }
    }

    private boolean canReadHeader(NhanVien actor, UUID idPhieuNhap) {
        return phieuNhapRepository.findById(idPhieuNhap)
                .map(header -> branchAccessService.canReadBranch(actor, header.getIdChiNhanh()))
                .orElse(false);
    }

    private void requireReadableHeader(UUID idPhieuNhap, NhanVien actor) {
        if (!canReadHeader(actor, idPhieuNhap)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "Không được xem hoặc sửa chi tiết phiếu nhập của chi nhánh khác");
        }
    }

    public PhieuNhapDTO toDTO(PhieuNhap pn) {
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
}
