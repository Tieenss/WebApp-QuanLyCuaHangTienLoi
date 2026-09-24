package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.PhieuXuatKhoDTO;
import com.erp.cuahangtienloi.entity.ChiTietPhieuXuat;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.entity.PhieuXuatKho;
import com.erp.cuahangtienloi.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PhieuXuatKhoService {

    private final PhieuXuatKhoRepository phieuXuatKhoRepository;
    private final ChiNhanhRepository chiNhanhRepository;
    private final NhanVienRepository nhanVienRepository;
    private final ChiTietPhieuXuatRepository chiTietPhieuXuatRepository;
    private final TonKhoRepository tonKhoRepository;
    private final SanPhamRepository sanPhamRepository;
    private final JdbcTemplate jdbcTemplate;
    private final BranchAccessService branchAccessService;

    @PersistenceContext
    private EntityManager entityManager;

    public record ApproveRequest() {}
    public record RejectRequest(String lyDo) {}

    @Getter
    @Setter
    public static class MoveLine {
        private UUID idSanPham;
        private Integer soLuong;
    }

    @Getter
    @Setter
    public static class MoveRequest {
        private List<MoveLine> lines;
    }

    @Transactional(readOnly = true)
    public List<PhieuXuatKhoDTO> getAll(NhanVien actor) {
        return phieuXuatKhoRepository.findAll().stream()
                .filter(pxk -> canReadTransfer(actor, pxk))
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<PhieuXuatKhoDTO> getById(UUID id, NhanVien actor) {
        return phieuXuatKhoRepository.findById(id)
                .filter(pxk -> canReadTransfer(actor, pxk))
                .map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public List<PhieuXuatKhoDTO> getByBranchXuat(UUID idChiNhanhXuat, NhanVien actor) {
        return phieuXuatKhoRepository.findByIdChiNhanhXuat(idChiNhanhXuat).stream()
                .filter(pxk -> canReadTransfer(actor, pxk))
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PhieuXuatKhoDTO> getByBranchNhan(UUID idChiNhanhNhan, NhanVien actor) {
        return phieuXuatKhoRepository.findByIdChiNhanhNhan(idChiNhanhNhan).stream()
                .filter(pxk -> canReadTransfer(actor, pxk))
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PhieuXuatKhoDTO> getByStatus(String trangThai, NhanVien actor) {
        return phieuXuatKhoRepository.findByTrangThai(trangThai).stream()
                .filter(pxk -> canReadTransfer(actor, pxk))
                .map(this::toDTO)
                .toList();
    }

    @Transactional
    public PhieuXuatKhoDTO create(PhieuXuatKho request, UUID idNguoiTao, NhanVien actor) {
        if (request.getIdChiNhanhXuat() == null || !chiNhanhRepository.existsById(request.getIdChiNhanhXuat())) {
            throw new IllegalArgumentException("Chi nhánh xuất không tồn tại");
        }
        if (request.getIdChiNhanhNhan() == null || !chiNhanhRepository.existsById(request.getIdChiNhanhNhan())) {
            throw new IllegalArgumentException("Chi nhánh nhận không tồn tại");
        }
        if (request.getIdChiNhanhXuat().equals(request.getIdChiNhanhNhan())) {
            throw new IllegalArgumentException("Kho xuất và kho nhận phải khác nhau");
        }
        requireTransferAccess(actor, request.getIdChiNhanhXuat(), request.getIdChiNhanhNhan());

        PhieuXuatKho pxk = new PhieuXuatKho();
        pxk.setMaPhieu(request.getMaPhieu());
        pxk.setIdChiNhanhXuat(request.getIdChiNhanhXuat());
        pxk.setIdChiNhanhNhan(request.getIdChiNhanhNhan());
        String trangThai = request.getTrangThai() != null ? request.getTrangThai() : "PENDING";
        pxk.setTrangThai(trangThai);
        if (idNguoiTao == null) {
            throw new RuntimeException("Không tìm thấy nhân viên tạo phiếu xuất");
        }
        pxk.setIdNguoiTao(idNguoiTao);
        pxk.setIdNguoiDuyet(null);
        pxk.setIdNguoiNhan(null);
        pxk.setNgayXuatThucTe(null);
        pxk.setNgayNhanThucTe(null);
        pxk.setNgayYeuCau(request.getNgayYeuCau() != null ? request.getNgayYeuCau() : LocalDate.now());
        pxk.setGhiChu(request.getGhiChu());
        pxk.setNgayTao(LocalDateTime.now());
        pxk.setNgayCapNhat(LocalDateTime.now());

        PhieuXuatKho saved = phieuXuatKhoRepository.saveAndFlush(pxk);
        entityManager.clear();
        return toDTO(phieuXuatKhoRepository.findById(saved.getId()).orElseThrow());
    }

    @Transactional
    public Optional<PhieuXuatKhoDTO> update(UUID id, PhieuXuatKho request, NhanVien actor) {
        return phieuXuatKhoRepository.findById(id)
                .map(pxk -> {
                    requireTransferAccess(actor, pxk.getIdChiNhanhXuat(), pxk.getIdChiNhanhNhan());
                    UUID sourceId = request.getIdChiNhanhXuat() != null
                            ? request.getIdChiNhanhXuat() : pxk.getIdChiNhanhXuat();
                    UUID destinationId = request.getIdChiNhanhNhan() != null
                            ? request.getIdChiNhanhNhan() : pxk.getIdChiNhanhNhan();
                    if (sourceId == null || !chiNhanhRepository.existsById(sourceId)) {
                        throw new IllegalArgumentException("Chi nhánh xuất không tồn tại");
                    }
                    if (destinationId == null || !chiNhanhRepository.existsById(destinationId)) {
                        throw new IllegalArgumentException("Chi nhánh nhận không tồn tại");
                    }
                    if (sourceId.equals(destinationId)) {
                        throw new IllegalArgumentException("Kho xuất và kho nhận phải khác nhau");
                    }
                    requireTransferAccess(actor, sourceId, destinationId);
                    if (request.getMaPhieu() != null) pxk.setMaPhieu(request.getMaPhieu());
                    if (request.getIdChiNhanhXuat() != null) pxk.setIdChiNhanhXuat(request.getIdChiNhanhXuat());
                    if (request.getIdChiNhanhNhan() != null) pxk.setIdChiNhanhNhan(request.getIdChiNhanhNhan());
                    if (request.getTrangThai() != null) pxk.setTrangThai(request.getTrangThai());
                    if (request.getGhiChu() != null) pxk.setGhiChu(request.getGhiChu());
                    pxk.setNgayCapNhat(LocalDateTime.now());
                    phieuXuatKhoRepository.save(pxk);
                    return toDTO(pxk);
                });
    }

    @Transactional
    public boolean delete(UUID id, NhanVien actor) {
        return phieuXuatKhoRepository.findById(id).map(pxk -> {
            requireTransferAccess(actor, pxk.getIdChiNhanhXuat(), pxk.getIdChiNhanhNhan());
            phieuXuatKhoRepository.delete(pxk);
            return true;
        }).orElse(false);
    }

    @Transactional
    public Optional<PhieuXuatKhoDTO> approve(UUID id, ApproveRequest body, NhanVien actor) {
        return phieuXuatKhoRepository.findById(id)
                .map(pxk -> {
                    requireTransferAccess(actor, pxk.getIdChiNhanhXuat(), pxk.getIdChiNhanhNhan());
                    if (!"PENDING".equals(pxk.getTrangThai())) {
                        throw new IllegalArgumentException("Chỉ duyệt phiếu ở trạng thái PENDING");
                    }
                    pxk.setTrangThai("APPROVED");
                    pxk.setIdNguoiDuyet(actor.getId());
                    pxk.setNgayCapNhat(LocalDateTime.now());
                    phieuXuatKhoRepository.save(pxk);
                    return toDTO(pxk);
                });
    }

    @Transactional
    public Optional<PhieuXuatKhoDTO> reject(UUID id, RejectRequest body, NhanVien actor) {
        return phieuXuatKhoRepository.findById(id)
                .map(pxk -> {
                    requireTransferAccess(actor, pxk.getIdChiNhanhXuat(), pxk.getIdChiNhanhNhan());
                    if (!"PENDING".equals(pxk.getTrangThai())) {
                        throw new IllegalArgumentException("Chỉ từ chối phiếu ở trạng thái PENDING");
                    }
                    pxk.setTrangThai("CANCELLED");
                    pxk.setIdNguoiDuyet(actor.getId());
                    pxk.setGhiChu(body != null && body.lyDo() != null ? body.lyDo() : pxk.getGhiChu());
                    pxk.setNgayCapNhat(LocalDateTime.now());
                    phieuXuatKhoRepository.save(pxk);
                    return toDTO(pxk);
                });
    }

    @Transactional
    public Optional<PhieuXuatKhoDTO> ship(UUID id, MoveRequest body, UUID idNguoiDuyet, NhanVien actor) {
        return phieuXuatKhoRepository.findById(id).map(pxk -> {
            requireTransferAccess(actor, pxk.getIdChiNhanhXuat(), pxk.getIdChiNhanhNhan());
            if (!"PENDING".equals(pxk.getTrangThai()) && !"APPROVED".equals(pxk.getTrangThai())) {
                throw new IllegalArgumentException("Chỉ xác nhận xuất được phiếu ở trạng thái PENDING hoặc APPROVED");
            }
            List<ChiTietPhieuXuat> lines = chiTietPhieuXuatRepository.findByIdPhieuXuat(id);
            if (lines.isEmpty()) {
                throw new IllegalArgumentException("Phiếu không có dòng chi tiết — không thể xuất");
            }
            if (idNguoiDuyet == null) {
                throw new IllegalArgumentException("Không tìm thấy nhân viên duyệt");
            }

            Map<UUID, Integer> overrides = new HashMap<>();
            if (body != null && body.getLines() != null) {
                for (MoveLine ml : body.getLines()) {
                    if (ml.getIdSanPham() != null && ml.getSoLuong() != null) {
                        overrides.put(ml.getIdSanPham(), ml.getSoLuong());
                    }
                }
            }

            LocalDate ngayXuat = LocalDate.now();
            for (ChiTietPhieuXuat ct : lines) {
                int xuat = overrides.containsKey(ct.getIdSanPham())
                        ? overrides.get(ct.getIdSanPham())
                        : (ct.getSoLuongXuat() != null && ct.getSoLuongXuat() > 0
                                ? ct.getSoLuongXuat() : ct.getSoLuongYeuCau());
                if (xuat < 0 || xuat > ct.getSoLuongYeuCau()) {
                    throw new IllegalArgumentException("Số lượng xuất phải từ 0 đến số lượng yêu cầu");
                }
                int ton = tonKhoRepository
                        .findByIdSanPhamAndIdChiNhanh(ct.getIdSanPham(), pxk.getIdChiNhanhXuat())
                        .map(t -> t.getSoLuongTon() == null ? 0 : t.getSoLuongTon())
                        .orElse(0);
                if (xuat > ton) {
                    throw new IllegalArgumentException("Không đủ tồn kho tại kho xuất (tồn " + ton + ", cần " + xuat + ")");
                }
                BigDecimal giaVon = tonKhoRepository
                        .findByIdSanPhamAndIdChiNhanh(ct.getIdSanPham(), pxk.getIdChiNhanhXuat())
                        .map(t -> t.getGiaVonTrungBinh() == null ? BigDecimal.ZERO : t.getGiaVonTrungBinh())
                        .orElse(BigDecimal.ZERO);

                ct.setSoLuongXuat(xuat);
                ct.setSoLuongNhan(0);
                ct.setDonGiaVon(giaVon);
                ct.setThanhTien(giaVon.multiply(BigDecimal.valueOf(xuat)));
                chiTietPhieuXuatRepository.save(ct);

                if (xuat > 0) {
                    jdbcTemplate.query(
                            "SELECT fn_ghi_the_kho_va_dieu_chinh_ton(?::uuid, ?::uuid, ?::varchar, ?::integer, ?::numeric, ?::varchar, ?::varchar, ?::date, ?::text, NOW()::timestamp)",
                            rs -> { },
                            ct.getIdSanPham(), pxk.getIdChiNhanhXuat(), "TRANSFER_OUT", -xuat, giaVon,
                            pxk.getMaPhieu(), "Hệ thống", ct.getHanSuDung(),
                            "Xuất luân chuyển sang cửa hàng: phiếu " + pxk.getMaPhieu());
                }
            }

            pxk.setTrangThai("SHIPPED");
            pxk.setIdNguoiDuyet(idNguoiDuyet);
            pxk.setNgayXuatThucTe(ngayXuat);
            pxk.setNgayCapNhat(LocalDateTime.now());
            phieuXuatKhoRepository.save(pxk);
            phieuXuatKhoRepository.flush();
            chiTietPhieuXuatRepository.flush();
            entityManager.clear();
            return toDTO(phieuXuatKhoRepository.findById(id).orElseThrow());
        });
    }

    @Transactional
    public Optional<PhieuXuatKhoDTO> receive(UUID id, MoveRequest body, UUID idNguoiNhan, NhanVien actor) {
        return phieuXuatKhoRepository.findById(id).map(pxk -> {
            requireTransferAccess(actor, pxk.getIdChiNhanhXuat(), pxk.getIdChiNhanhNhan());
            if (!"SHIPPED".equals(pxk.getTrangThai())) {
                throw new IllegalArgumentException("Chỉ xác nhận nhận được phiếu ở trạng thái SHIPPED (chờ nhận hàng)");
            }
            List<ChiTietPhieuXuat> lines = chiTietPhieuXuatRepository.findByIdPhieuXuat(id);
            if (idNguoiNhan == null) {
                throw new IllegalArgumentException("Không tìm thấy nhân viên nhận");
            }

            Map<UUID, Integer> overrides = new HashMap<>();
            if (body != null && body.getLines() != null) {
                for (MoveLine ml : body.getLines()) {
                    if (ml.getIdSanPham() != null && ml.getSoLuong() != null) {
                        overrides.put(ml.getIdSanPham(), ml.getSoLuong());
                    }
                }
            }

            for (ChiTietPhieuXuat ct : lines) {
                int xuat = ct.getSoLuongXuat() == null ? 0 : ct.getSoLuongXuat();
                int nhan = overrides.containsKey(ct.getIdSanPham())
                        ? overrides.get(ct.getIdSanPham()) : xuat;
                if (nhan < 0 || nhan > xuat) {
                    throw new IllegalArgumentException("Số lượng nhận phải từ 0 đến số lượng xuất");
                }
                ct.setSoLuongNhan(nhan);
                chiTietPhieuXuatRepository.save(ct);

                if (nhan > 0) {
                    jdbcTemplate.query(
                            "SELECT fn_ghi_the_kho_va_dieu_chinh_ton(?::uuid, ?::uuid, ?::varchar, ?::integer, ?::numeric, ?::varchar, ?::varchar, ?::date, ?::text, NOW()::timestamp)",
                            rs -> { },
                            ct.getIdSanPham(), pxk.getIdChiNhanhNhan(), "TRANSFER_IN", nhan,
                            ct.getDonGiaVon() == null ? BigDecimal.ZERO : ct.getDonGiaVon(),
                            pxk.getMaPhieu(), "Hệ thống", ct.getHanSuDung(),
                            "Nhận hàng luân chuyển từ kho tổng: phiếu " + pxk.getMaPhieu());
                }
            }

            pxk.setTrangThai("COMPLETED");
            pxk.setIdNguoiNhan(idNguoiNhan);
            pxk.setNgayNhanThucTe(LocalDate.now());
            pxk.setNgayCapNhat(LocalDateTime.now());
            phieuXuatKhoRepository.save(pxk);
            phieuXuatKhoRepository.flush();
            entityManager.clear();
            return toDTO(phieuXuatKhoRepository.findById(id).orElseThrow());
        });
    }

    // --- Logic ChiTietPhieuXuat ---
    @Transactional(readOnly = true)
    public List<ChiTietPhieuXuat> getLinesByPhieuXuat(UUID idPhieuXuat, NhanVien actor) {
        requireReadableHeader(idPhieuXuat, actor);
        return chiTietPhieuXuatRepository.findByIdPhieuXuat(idPhieuXuat);
    }

    @Transactional(readOnly = true)
    public List<ChiTietPhieuXuat> getLinesBySanPham(UUID idSanPham, NhanVien actor) {
        return chiTietPhieuXuatRepository.findByIdSanPham(idSanPham).stream()
                .filter(ct -> canReadHeader(actor, ct.getIdPhieuXuat()))
                .toList();
    }

    @Transactional
    public ChiTietPhieuXuat createLine(ChiTietPhieuXuat request, NhanVien actor) {
        validateLine(request, actor);
        ChiTietPhieuXuat ct = new ChiTietPhieuXuat();
        ct.setId(UUID.randomUUID());
        ct.setIdPhieuXuat(request.getIdPhieuXuat());
        ct.setIdSanPham(request.getIdSanPham());
        ct.setSoLuongYeuCau(request.getSoLuongYeuCau());
        ct.setSoLuongXuat(request.getSoLuongXuat() != null ? request.getSoLuongXuat() : 0);
        ct.setSoLuongNhan(request.getSoLuongNhan() != null ? request.getSoLuongNhan() : 0);
        ct.setDonGiaVon(request.getDonGiaVon());
        ct.setThanhTien(request.getThanhTien());
        ct.setHanSuDung(request.getHanSuDung());
        ct.setThuTu(request.getThuTu() != null ? request.getThuTu() : 0);
        ct.setNgayTao(LocalDateTime.now());
        return chiTietPhieuXuatRepository.save(ct);
    }

    @Transactional
    public void createBatchLines(List<ChiTietPhieuXuat> requests, NhanVien actor) {
        if (requests == null || requests.isEmpty()) {
            throw new IllegalArgumentException("Danh sách chi tiết phiếu xuất rỗng");
        }
        for (ChiTietPhieuXuat request : requests) {
            validateLine(request, actor);
            ChiTietPhieuXuat ct = new ChiTietPhieuXuat();
            ct.setId(UUID.randomUUID());
            ct.setIdPhieuXuat(request.getIdPhieuXuat());
            ct.setIdSanPham(request.getIdSanPham());
            ct.setSoLuongYeuCau(request.getSoLuongYeuCau());
            ct.setSoLuongXuat(request.getSoLuongXuat() != null ? request.getSoLuongXuat() : 0);
            ct.setSoLuongNhan(request.getSoLuongNhan() != null ? request.getSoLuongNhan() : 0);
            ct.setDonGiaVon(request.getDonGiaVon());
            ct.setThanhTien(request.getThanhTien());
            ct.setHanSuDung(request.getHanSuDung());
            ct.setThuTu(request.getThuTu() != null ? request.getThuTu() : 0);
            ct.setNgayTao(LocalDateTime.now());
            chiTietPhieuXuatRepository.save(ct);
        }
    }

    @Transactional
    public boolean deleteLine(UUID id, NhanVien actor) {
        return chiTietPhieuXuatRepository.findById(id).map(ct -> {
            requireReadableHeader(ct.getIdPhieuXuat(), actor);
            chiTietPhieuXuatRepository.delete(ct);
            return true;
        }).orElse(false);
    }

    @Transactional
    public void deleteLinesByPhieuXuat(UUID idPhieuXuat, NhanVien actor) {
        requireReadableHeader(idPhieuXuat, actor);
        List<ChiTietPhieuXuat> list = chiTietPhieuXuatRepository.findByIdPhieuXuat(idPhieuXuat);
        chiTietPhieuXuatRepository.deleteAll(list);
    }

    private void validateLine(ChiTietPhieuXuat request, NhanVien actor) {
        if (request.getIdPhieuXuat() == null || !phieuXuatKhoRepository.existsById(request.getIdPhieuXuat())) {
            throw new IllegalArgumentException("Phiếu xuất không tồn tại");
        }
        if (request.getIdSanPham() == null || !sanPhamRepository.existsById(request.getIdSanPham())) {
            throw new IllegalArgumentException("Sản phẩm không tồn tại");
        }
        requireReadableHeader(request.getIdPhieuXuat(), actor);
        com.erp.cuahangtienloi.validation.InputValidator.positive(request.getSoLuongYeuCau(), "Số lượng yêu cầu");
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getSoLuongXuat(), "Số lượng xuất");
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getSoLuongNhan(), "Số lượng nhận");
        com.erp.cuahangtienloi.validation.InputValidator.nonNegative(request.getDonGiaVon(), "Đơn giá vốn");
        if (request.getSoLuongXuat() != null && request.getSoLuongXuat() > request.getSoLuongYeuCau()) {
            throw new IllegalArgumentException("Số lượng xuất không được vượt số lượng yêu cầu");
        }
    }

    private boolean canReadHeader(NhanVien actor, UUID idPhieuXuat) {
        return phieuXuatKhoRepository.findById(idPhieuXuat)
                .map(header -> branchAccessService.canReadTransfer(actor,
                        header.getIdChiNhanhXuat(), header.getIdChiNhanhNhan()))
                .orElse(false);
    }

    private void requireReadableHeader(UUID idPhieuXuat, NhanVien actor) {
        if (!canReadHeader(actor, idPhieuXuat)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "Không được xem hoặc sửa chi tiết điều chuyển ngoài phạm vi");
        }
    }

    private boolean canReadTransfer(NhanVien actor, PhieuXuatKho transfer) {
        return branchAccessService.canReadTransfer(actor,
                transfer.getIdChiNhanhXuat(), transfer.getIdChiNhanhNhan());
    }

    private void requireTransferAccess(NhanVien actor, UUID sourceBranchId, UUID destinationBranchId) {
        if (!branchAccessService.canReadTransfer(actor, sourceBranchId, destinationBranchId)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN,
                    "Không được thao tác điều chuyển ngoài phạm vi chi nhánh");
        }
    }

    public PhieuXuatKhoDTO toDTO(PhieuXuatKho pxk) {
        PhieuXuatKhoDTO dto = new PhieuXuatKhoDTO();
        dto.setId(pxk.getId());
        dto.setMaPhieu(pxk.getMaPhieu());
        dto.setIdChiNhanhXuat(pxk.getIdChiNhanhXuat());
        dto.setIdChiNhanhNhan(pxk.getIdChiNhanhNhan());
        dto.setIdNguoiTao(pxk.getIdNguoiTao());
        dto.setIdNguoiDuyet(pxk.getIdNguoiDuyet());
        dto.setIdNguoiNhan(pxk.getIdNguoiNhan());
        dto.setNgayYeuCau(pxk.getNgayYeuCau());
        dto.setNgayXuatThucTe(pxk.getNgayXuatThucTe());
        dto.setNgayNhanThucTe(pxk.getNgayNhanThucTe());
        dto.setTrangThai(pxk.getTrangThai());
        dto.setGhiChu(pxk.getGhiChu());

        if (pxk.getIdChiNhanhXuat() != null) {
            chiNhanhRepository.findById(pxk.getIdChiNhanhXuat())
                    .ifPresent(cn -> dto.setTenChiNhanhXuat(cn.getTenChiNhanh()));
        }
        if (pxk.getIdChiNhanhNhan() != null) {
            chiNhanhRepository.findById(pxk.getIdChiNhanhNhan())
                    .ifPresent(cn -> dto.setTenChiNhanhNhan(cn.getTenChiNhanh()));
        }
        if (pxk.getIdNguoiTao() != null) {
            nhanVienRepository.findById(pxk.getIdNguoiTao())
                    .ifPresent(nv -> dto.setTenNguoiTao(nv.getHoTen()));
        }
        if (pxk.getIdNguoiDuyet() != null) {
            nhanVienRepository.findById(pxk.getIdNguoiDuyet())
                    .ifPresent(nv -> dto.setTenNguoiDuyet(nv.getHoTen()));
        }
        if (pxk.getIdNguoiNhan() != null) {
            nhanVienRepository.findById(pxk.getIdNguoiNhan())
                    .ifPresent(nv -> dto.setTenNguoiNhan(nv.getHoTen()));
        }

        return dto;
    }
}
