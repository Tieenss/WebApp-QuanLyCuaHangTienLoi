package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.TonKhoDTO;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.entity.TonKho;
import com.erp.cuahangtienloi.repository.ChiNhanhRepository;
import com.erp.cuahangtienloi.repository.SanPhamRepository;
import com.erp.cuahangtienloi.repository.TonKhoRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.erp.cuahangtienloi.validation.InputValidator.nonNegative;

@Service
@RequiredArgsConstructor
public class TonKhoService {

    private final TonKhoRepository tonKhoRepository;
    private final SanPhamRepository sanPhamRepository;
    private final ChiNhanhRepository chiNhanhRepository;
    private final BranchAccessService branchAccessService;

    @PersistenceContext
    private EntityManager entityManager;

    public record TonKhoAdjustmentRequest(
            UUID idSanPham, UUID idChiNhanh, Integer soLuong, BigDecimal donGia,
            String maChungTu, String nguoiThucHien, LocalDate hanSuDung,
            String ghiChu, LocalDateTime ngayPhatSinh) {}

    @Transactional(readOnly = true)
    public List<TonKhoDTO> getAll(NhanVien employee) {
        List<TonKho> source = branchAccessService.isSystemWide(employee)
                ? tonKhoRepository.findAll()
                : tonKhoRepository.findByIdChiNhanh(branchAccessService.requiredOwnBranch(employee));
        return source.stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TonKhoDTO> getByChiNhanh(UUID idChiNhanh, NhanVien employee) {
        branchAccessService.requireReadableBranch(employee, idChiNhanh);
        return tonKhoRepository.findByIdChiNhanh(idChiNhanh).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TonKhoDTO> getBySanPham(UUID idSanPham, NhanVien employee) {
        List<TonKho> source = branchAccessService.isSystemWide(employee)
                ? tonKhoRepository.findByIdSanPham(idSanPham)
                : tonKhoRepository.findByIdSanPhamAndIdChiNhanh(idSanPham,
                        branchAccessService.requiredOwnBranch(employee)).stream().toList();
        return source.stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TonKhoDTO> getAvailableForTransfer() {
        UUID khoTongId = chiNhanhRepository.findFirstByLoai("KHO_TONG")
                .map(cn -> cn.getId())
                .orElseThrow(() -> new IllegalStateException("Chưa cấu hình Kho Tổng"));
        return tonKhoRepository.findByIdChiNhanh(khoTongId).stream()
                .filter(tk -> tk.getSoLuongTon() != null && tk.getSoLuongTon() > 0)
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Optional<TonKhoDTO> getDetail(UUID idSanPham, UUID idChiNhanh, NhanVien employee) {
        branchAccessService.requireReadableBranch(employee, idChiNhanh);
        return tonKhoRepository.findByIdSanPhamAndIdChiNhanh(idSanPham, idChiNhanh).map(this::toDTO);
    }

    @Transactional
    public TonKhoDTO create(TonKho request) {
        if (request.getIdSanPham() == null || !sanPhamRepository.existsById(request.getIdSanPham())) {
            throw new IllegalArgumentException("Sản phẩm không tồn tại");
        }
        if (request.getIdChiNhanh() == null || !chiNhanhRepository.existsById(request.getIdChiNhanh())) {
            throw new IllegalArgumentException("Chi nhánh không tồn tại");
        }
        validateConfiguration(request);
        if (tonKhoRepository.findByIdSanPhamAndIdChiNhanh(request.getIdSanPham(), request.getIdChiNhanh()).isPresent()) {
            throw new IllegalArgumentException("Tồn kho đã tồn tại");
        }

        TonKho tk = new TonKho();
        tk.setIdSanPham(request.getIdSanPham());
        tk.setIdChiNhanh(request.getIdChiNhanh());
        tk.setSoLuongTon(0);
        tk.setGiaVonTrungBinh(BigDecimal.ZERO);
        tk.setGiaTriTon(BigDecimal.ZERO);
        tk.setTonToiThieu(request.getTonToiThieu() != null ? request.getTonToiThieu() : 0);
        tk.setTonToiDa(request.getTonToiDa() != null ? request.getTonToiDa() : 0);
        tk.setHanSuDungGanNhat(request.getHanSuDungGanNhat());
        tk.setLanBienDongCuoi(LocalDateTime.now());
        tk.setNgayTao(LocalDateTime.now());
        tk.setNgayCapNhat(LocalDateTime.now());

        tonKhoRepository.save(tk);
        return toDTO(tk);
    }

    @Transactional
    public Optional<TonKhoDTO> update(UUID idSanPham, UUID idChiNhanh, TonKho request) {
        return tonKhoRepository.findByIdSanPhamAndIdChiNhanh(idSanPham, idChiNhanh)
                .map(tk -> {
                    validateConfiguration(request);
                    if (request.getTonToiThieu() != null) tk.setTonToiThieu(request.getTonToiThieu());
                    if (request.getTonToiDa() != null) tk.setTonToiDa(request.getTonToiDa());
                    if (request.getHanSuDungGanNhat() != null) tk.setHanSuDungGanNhat(request.getHanSuDungGanNhat());
                    tk.setLanBienDongCuoi(LocalDateTime.now());
                    tk.setNgayCapNhat(LocalDateTime.now());
                    tonKhoRepository.save(tk);
                    return toDTO(tk);
                });
    }

    @Transactional
    public Optional<TonKhoDTO> adjust(TonKhoAdjustmentRequest request, NhanVien employee) {
        if (request.idSanPham() == null || !sanPhamRepository.existsById(request.idSanPham())) {
            throw new IllegalArgumentException("Sản phẩm không tồn tại");
        }
        if (request.idChiNhanh() == null || !chiNhanhRepository.existsById(request.idChiNhanh())) {
            throw new IllegalArgumentException("Chi nhánh không tồn tại");
        }
        branchAccessService.requireReadableBranch(employee, request.idChiNhanh());
        if (request.soLuong() == null || request.soLuong() == 0) {
            throw new IllegalArgumentException("Số lượng điều chỉnh phải khác 0");
        }
        nonNegative(request.donGia(), "Đơn giá");

        entityManager.createNativeQuery(
                "SELECT fn_ghi_the_kho_va_dieu_chinh_ton(?::uuid, ?::uuid, 'ADJUSTMENT', ?::integer, ?::numeric, ?::varchar, ?::varchar, ?::date, ?::text, ?::timestamp)")
                .setParameter(1, request.idSanPham())
                .setParameter(2, request.idChiNhanh())
                .setParameter(3, request.soLuong())
                .setParameter(4, request.donGia() != null ? request.donGia() : BigDecimal.ZERO)
                .setParameter(5, request.maChungTu())
                .setParameter(6, request.nguoiThucHien())
                .setParameter(7, request.hanSuDung())
                .setParameter(8, request.ghiChu())
                .setParameter(9, request.ngayPhatSinh() != null ? request.ngayPhatSinh() : LocalDateTime.now())
                .getSingleResult();

        entityManager.flush();
        return tonKhoRepository.findByIdSanPhamAndIdChiNhanh(request.idSanPham(), request.idChiNhanh()).map(this::toDTO);
    }

    @Transactional
    public void delete(UUID idSanPham, UUID idChiNhanh) {
        tonKhoRepository.findByIdSanPhamAndIdChiNhanh(idSanPham, idChiNhanh)
                .ifPresent(tonKhoRepository::delete);
    }

    private void validateConfiguration(TonKho request) {
        nonNegative(request.getTonToiThieu(), "Tồn tối thiểu");
        nonNegative(request.getTonToiDa(), "Tồn tối đa");
        if (request.getTonToiThieu() != null && request.getTonToiDa() != null
                && request.getTonToiDa() > 0 && request.getTonToiDa() < request.getTonToiThieu()) {
            throw new IllegalArgumentException("Tồn tối đa phải lớn hơn hoặc bằng tồn tối thiểu");
        }
    }

    public TonKhoDTO toDTO(TonKho tk) {
        TonKhoDTO dto = new TonKhoDTO();
        dto.setIdSanPham(tk.getIdSanPham());
        dto.setIdChiNhanh(tk.getIdChiNhanh());
        dto.setSoLuongTon(tk.getSoLuongTon());
        dto.setGiaVonTrungBinh(tk.getGiaVonTrungBinh());
        dto.setGiaTriTon(tk.getGiaTriTon());
        dto.setTonToiThieu(tk.getTonToiThieu());
        dto.setTonToiDa(tk.getTonToiDa());
        dto.setHanSuDungGanNhat(tk.getHanSuDungGanNhat());
        dto.setLanBienDongCuoi(tk.getLanBienDongCuoi());

        if (tk.getIdSanPham() != null) {
            sanPhamRepository.findById(tk.getIdSanPham())
                    .ifPresent(sp -> {
                        dto.setTenSanPham(sp.getTenSanPham());
                        dto.setMaVach(sp.getMaVach());
                    });
        }
        if (tk.getIdChiNhanh() != null) {
            chiNhanhRepository.findById(tk.getIdChiNhanh())
                    .ifPresent(cn -> dto.setTenChiNhanh(cn.getTenChiNhanh()));
        }

        return dto;
    }
}
