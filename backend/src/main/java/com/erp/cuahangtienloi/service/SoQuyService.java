package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.SoQuyDTO;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.entity.SoQuy;
import com.erp.cuahangtienloi.repository.ChiNhanhRepository;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import com.erp.cuahangtienloi.repository.SoQuyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.erp.cuahangtienloi.validation.InputValidator.*;

@Service
@RequiredArgsConstructor
public class SoQuyService {

    private final SoQuyRepository soQuyRepository;
    private final ChiNhanhRepository chiNhanhRepository;
    private final NhanVienRepository nhanVienRepository;
    private final BranchAccessService branchAccessService;

    @Transactional(readOnly = true)
    public List<SoQuyDTO> getAll(NhanVien employee) {
        return findEntriesVisibleTo(employee).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Optional<SoQuyDTO> getById(UUID id, NhanVien employee) {
        return soQuyRepository.findById(id)
                .filter(sq -> canReadEntry(employee, sq))
                .map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public List<SoQuyDTO> getByChiNhanh(UUID idChiNhanh, NhanVien employee) {
        branchAccessService.requireReadableBranch(employee, idChiNhanh);
        return soQuyRepository.findByIdChiNhanh(idChiNhanh).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SoQuyDTO> getByDirection(String direction, NhanVien employee) {
        return findEntriesVisibleTo(employee).stream()
                .filter(sq -> direction.equals(sq.getDirection()))
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SoQuyDTO> getByHangMuc(String hangMuc, NhanVien employee) {
        return findEntriesVisibleTo(employee).stream()
                .filter(sq -> hangMuc.equals(sq.getHangMuc()))
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SoQuyDTO> getByDateRange(LocalDate from, LocalDate to, NhanVien employee) {
        return findEntriesVisibleTo(employee).stream()
                .filter(sq -> !sq.getEntryDate().isBefore(from) && !sq.getEntryDate().isAfter(to))
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public SoQuyDTO create(SoQuy request, UUID fallbackIdNguoiTao) {
        if (request.getIdChiNhanh() != null && !chiNhanhRepository.existsById(request.getIdChiNhanh())) {
            throw new IllegalArgumentException("Chi nhánh không tồn tại");
        }
        if (request.getDirection() == null || !CASH_DIRECTIONS.contains(request.getDirection())) {
            throw new IllegalArgumentException("Loại thu/chi không hợp lệ");
        }
        requireText(request.getHangMuc(), "Hạng mục", 1, 50);
        if (request.getHinhThucTt() != null && !PAYMENT_METHODS.contains(request.getHinhThucTt())) {
            throw new IllegalArgumentException("Hình thức thanh toán không hợp lệ");
        }
        positive(request.getSoTien(), "Số tiền");

        SoQuy sq = new SoQuy();
        sq.setId(UUID.randomUUID());
        sq.setMaChungTu(request.getMaChungTu());
        sq.setMaChungTuLienQuan(request.getMaChungTuLienQuan());
        sq.setIdChiNhanh(request.getIdChiNhanh());

        UUID idNguoiTao = request.getIdNguoiTao();
        if (idNguoiTao == null || !nhanVienRepository.existsById(idNguoiTao)) {
            idNguoiTao = fallbackIdNguoiTao;
        }
        sq.setIdNguoiTao(idNguoiTao);
        sq.setDirection(request.getDirection());
        sq.setHangMuc(request.getHangMuc());
        sq.setHinhThucTt(request.getHinhThucTt() != null ? request.getHinhThucTt() : "CASH");
        sq.setEntryDate(request.getEntryDate() != null ? request.getEntryDate() : LocalDate.now());
        sq.setSoTien(request.getSoTien());
        sq.setDoiTuong(request.getDoiTuong());
        sq.setDienGiai(request.getDienGiai());
        sq.setRunningBalance(request.getRunningBalance());
        sq.setTrangThai(request.getTrangThai() != null ? request.getTrangThai() : "COMPLETED");
        sq.setNgayTao(LocalDateTime.now());
        sq.setNgayCapNhat(LocalDateTime.now());

        SoQuy latest = soQuyRepository.findByIdChiNhanh(sq.getIdChiNhanh()).stream()
                .sorted(Comparator.comparing(SoQuy::getEntryDate).reversed()
                        .thenComparing(SoQuy::getNgayTao, Comparator.reverseOrder()))
                .findFirst()
                .orElse(null);

        BigDecimal prevBalance = latest != null ? latest.getRunningBalance() : BigDecimal.ZERO;
        if ("RECEIPT".equals(sq.getDirection())) {
            sq.setRunningBalance(prevBalance.add(sq.getSoTien()));
        } else {
            sq.setRunningBalance(prevBalance.subtract(sq.getSoTien()));
        }

        soQuyRepository.save(sq);
        return toDTO(sq);
    }

    @Transactional
    public Optional<SoQuyDTO> update(UUID id, SoQuy request) {
        return soQuyRepository.findById(id)
                .map(sq -> {
                    if (request.getSoTien() != null) positive(request.getSoTien(), "Số tiền");
                    if (request.getDirection() != null && !CASH_DIRECTIONS.contains(request.getDirection())) {
                        throw new IllegalArgumentException("Loại thu/chi không hợp lệ");
                    }
                    if (request.getHangMuc() != null) requireText(request.getHangMuc(), "Hạng mục", 1, 50);
                    if (request.getHinhThucTt() != null && !PAYMENT_METHODS.contains(request.getHinhThucTt())) {
                        throw new IllegalArgumentException("Hình thức thanh toán không hợp lệ");
                    }
                    if (request.getDirection() != null) sq.setDirection(request.getDirection());
                    if (request.getHangMuc() != null) sq.setHangMuc(request.getHangMuc());
                    if (request.getHinhThucTt() != null) sq.setHinhThucTt(request.getHinhThucTt());
                    if (request.getEntryDate() != null) sq.setEntryDate(request.getEntryDate());
                    if (request.getSoTien() != null) sq.setSoTien(request.getSoTien());
                    if (request.getDoiTuong() != null) sq.setDoiTuong(request.getDoiTuong());
                    if (request.getDienGiai() != null) sq.setDienGiai(request.getDienGiai());
                    if (request.getTrangThai() != null) sq.setTrangThai(request.getTrangThai());
                    sq.setNgayCapNhat(LocalDateTime.now());
                    soQuyRepository.save(sq);
                    return toDTO(sq);
                });
    }

    @Transactional
    public boolean delete(UUID id) {
        if (soQuyRepository.existsById(id)) {
            soQuyRepository.deleteById(id);
            return true;
        }
        return false;
    }

    public List<SoQuy> findEntriesVisibleTo(NhanVien employee) {
        return branchAccessService.isSystemWide(employee)
                ? soQuyRepository.findAll()
                : soQuyRepository.findByIdChiNhanh(branchAccessService.requiredOwnBranch(employee));
    }

    public boolean canReadEntry(NhanVien employee, SoQuy entry) {
        return branchAccessService.isSystemWide(employee)
                || (entry.getIdChiNhanh() != null
                && entry.getIdChiNhanh().equals(branchAccessService.requiredOwnBranch(employee)));
    }

    public SoQuyDTO toDTO(SoQuy sq) {
        SoQuyDTO dto = new SoQuyDTO();
        dto.setId(sq.getId());
        dto.setMaChungTu(sq.getMaChungTu());
        dto.setMaChungTuLienQuan(sq.getMaChungTuLienQuan());
        dto.setIdChiNhanh(sq.getIdChiNhanh());
        dto.setIdNguoiTao(sq.getIdNguoiTao());
        dto.setDirection(sq.getDirection());
        dto.setHangMuc(sq.getHangMuc());
        dto.setHinhThucTt(sq.getHinhThucTt());
        dto.setEntryDate(sq.getEntryDate());
        dto.setSoTien(sq.getSoTien());
        dto.setDoiTuong(sq.getDoiTuong());
        dto.setDienGiai(sq.getDienGiai());
        dto.setRunningBalance(sq.getRunningBalance());
        dto.setTrangThai(sq.getTrangThai());

        if (sq.getIdChiNhanh() != null) {
            chiNhanhRepository.findById(sq.getIdChiNhanh())
                    .ifPresent(cn -> dto.setTenChiNhanh(cn.getTenChiNhanh()));
        }
        if (sq.getIdNguoiTao() != null) {
            nhanVienRepository.findById(sq.getIdNguoiTao())
                    .ifPresent(nv -> dto.setTenNguoiTao(nv.getHoTen()));
        }

        return dto;
    }
}
