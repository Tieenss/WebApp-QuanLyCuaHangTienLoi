package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.sanpham.SanPhamRequest;
import com.erp.cuahangtienloi.dto.sanpham.SanPhamResponse;
import com.erp.cuahangtienloi.entity.DanhMuc;
import com.erp.cuahangtienloi.entity.SanPham;
import com.erp.cuahangtienloi.exception.BusinessException;
import com.erp.cuahangtienloi.exception.ResourceNotFoundException;
import com.erp.cuahangtienloi.repository.DanhMucRepository;
import com.erp.cuahangtienloi.repository.SanPhamRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Nghiệp vụ quản lý sản phẩm (ERP-S1-05, mục 4).
 * Rule BR-03: sản phẩm có giao dịch KHÔNG được xóa, chỉ tắt dang_hoat_dong = false.
 * Vì vậy service này KHÔNG cung cấp thao tác xóa cứng.
 */
@Service
public class SanPhamService {

    private final SanPhamRepository sanPhamRepository;
    private final DanhMucRepository danhMucRepository;

    public SanPhamService(SanPhamRepository sanPhamRepository,
                          DanhMucRepository danhMucRepository) {
        this.sanPhamRepository = sanPhamRepository;
        this.danhMucRepository = danhMucRepository;
    }

    @Transactional(readOnly = true)
    public List<SanPhamResponse> findAll() {
        return sanPhamRepository.findAll().stream()
                .map(SanPhamResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public SanPhamResponse findById(UUID id) {
        return SanPhamResponse.from(getOrThrow(id));
    }

    @Transactional
    public SanPhamResponse create(SanPhamRequest req) {
        String maVach = req.getMaVach().trim();
        if (sanPhamRepository.existsByMaVach(maVach)) {
            throw new BusinessException("Mã vạch đã tồn tại: " + maVach);
        }
        DanhMuc danhMuc = layDanhMuc(req.getIdDanhMuc());

        SanPham e = new SanPham();
        e.setMaVach(maVach);
        e.setTenSanPham(req.getTenSanPham().trim());
        e.setDanhMuc(danhMuc);
        e.setGiaVon(req.getGiaVon());
        e.setGiaBan(req.getGiaBan());
        e.setDangHoatDong(true);
        return SanPhamResponse.from(sanPhamRepository.save(e));
    }

    @Transactional
    public SanPhamResponse update(UUID id, SanPhamRequest req) {
        SanPham e = getOrThrow(id);
        String maVach = req.getMaVach().trim();
        if (!maVach.equals(e.getMaVach()) && sanPhamRepository.existsByMaVach(maVach)) {
            throw new BusinessException("Mã vạch đã tồn tại: " + maVach);
        }
        DanhMuc danhMuc = layDanhMuc(req.getIdDanhMuc());

        e.setMaVach(maVach);
        e.setTenSanPham(req.getTenSanPham().trim());
        e.setDanhMuc(danhMuc);
        e.setGiaVon(req.getGiaVon());
        e.setGiaBan(req.getGiaBan());
        return SanPhamResponse.from(sanPhamRepository.save(e));
    }

    /**
     * Bật / tắt sản phẩm. Theo BR-03, đây là cách duy nhất để "ngừng dùng" một sản phẩm.
     */
    @Transactional
    public SanPhamResponse doiTrangThai(UUID id, boolean dangHoatDong) {
        SanPham e = getOrThrow(id);
        e.setDangHoatDong(dangHoatDong);
        return SanPhamResponse.from(sanPhamRepository.save(e));
    }

    private DanhMuc layDanhMuc(UUID idDanhMuc) {
        return danhMucRepository.findById(idDanhMuc)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy danh mục với id: " + idDanhMuc));
    }

    private SanPham getOrThrow(UUID id) {
        return sanPhamRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với id: " + id));
    }
}
