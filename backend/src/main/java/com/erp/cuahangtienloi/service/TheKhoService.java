package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.TheKhoDTO;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.entity.TheKho;
import com.erp.cuahangtienloi.repository.ChiNhanhRepository;
import com.erp.cuahangtienloi.repository.SanPhamRepository;
import com.erp.cuahangtienloi.repository.TheKhoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TheKhoService {

    private final TheKhoRepository theKhoRepository;
    private final SanPhamRepository sanPhamRepository;
    private final ChiNhanhRepository chiNhanhRepository;
    private final BranchAccessService branchAccessService;

    @Transactional(readOnly = true)
    public List<TheKhoDTO> getAll(NhanVien employee) {
        List<TheKho> source = branchAccessService.isSystemWide(employee)
                ? theKhoRepository.findAll()
                : theKhoRepository.findByIdChiNhanhOrderByNgayPhatSinhDesc(
                        branchAccessService.requiredOwnBranch(employee));
        return source.stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Optional<TheKhoDTO> getById(UUID id, NhanVien employee) {
        return theKhoRepository.findById(id)
                .map(tk -> {
                    branchAccessService.requireReadableBranch(employee, tk.getIdChiNhanh());
                    return toDTO(tk);
                });
    }

    @Transactional(readOnly = true)
    public List<TheKhoDTO> getByProductAndBranch(UUID idSanPham, UUID idChiNhanh, NhanVien employee) {
        branchAccessService.requireReadableBranch(employee, idChiNhanh);
        return theKhoRepository.findByIdSanPhamAndIdChiNhanhOrderByNgayPhatSinhDesc(idSanPham, idChiNhanh).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TheKhoDTO> getByBranch(UUID idChiNhanh, NhanVien employee) {
        branchAccessService.requireReadableBranch(employee, idChiNhanh);
        return theKhoRepository.findByIdChiNhanhOrderByNgayPhatSinhDesc(idChiNhanh).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TheKhoDTO> getByTypeAndBranch(String loaiGiaoDich, UUID idChiNhanh, NhanVien employee) {
        branchAccessService.requireReadableBranch(employee, idChiNhanh);
        return theKhoRepository.findByLoaiGiaoDichAndIdChiNhanhOrderByNgayPhatSinhDesc(loaiGiaoDich, idChiNhanh).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TheKhoDTO> getByBranchAndDateRange(UUID idChiNhanh, LocalDateTime from, LocalDateTime to, NhanVien employee) {
        branchAccessService.requireReadableBranch(employee, idChiNhanh);
        return theKhoRepository.findByIdChiNhanhAndNgayPhatSinhBetweenOrderByNgayPhatSinhDesc(idChiNhanh, from, to).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public TheKhoDTO toDTO(TheKho tk) {
        TheKhoDTO dto = new TheKhoDTO();
        dto.setId(tk.getId());
        dto.setNgayPhatSinh(tk.getNgayPhatSinh());
        dto.setIdSanPham(tk.getIdSanPham());
        dto.setIdChiNhanh(tk.getIdChiNhanh());
        dto.setLoaiGiaoDich(tk.getLoaiGiaoDich());
        dto.setSoLuong(tk.getSoLuong());
        dto.setDonGia(tk.getDonGia());
        dto.setThanhTien(tk.getThanhTien());
        dto.setTonTruoc(tk.getTonTruoc());
        dto.setTonSau(tk.getTonSau());
        dto.setMaChungTu(tk.getMaChungTu());
        dto.setNguoiThucHien(tk.getNguoiThucHien());
        dto.setHanSuDung(tk.getHanSuDung());
        dto.setGhiChu(tk.getGhiChu());

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
