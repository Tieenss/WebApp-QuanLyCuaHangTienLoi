package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.chinhanh.ChiNhanhRequest;
import com.erp.cuahangtienloi.dto.chinhanh.ChiNhanhResponse;
import com.erp.cuahangtienloi.entity.ChiNhanh;
import com.erp.cuahangtienloi.exception.BusinessException;
import com.erp.cuahangtienloi.exception.ResourceNotFoundException;
import com.erp.cuahangtienloi.repository.ChiNhanhRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Nghiệp vụ quản lý chi nhánh (ERP-S1-05, mục 1).
 * Rule: khóa chi nhánh (dang_hoat_dong = false) thay vì xóa.
 */
@Service
public class ChiNhanhService {

    private final ChiNhanhRepository chiNhanhRepository;

    public ChiNhanhService(ChiNhanhRepository chiNhanhRepository) {
        this.chiNhanhRepository = chiNhanhRepository;
    }

    @Transactional(readOnly = true)
    public List<ChiNhanhResponse> findAll() {
        return chiNhanhRepository.findAll().stream()
                .map(ChiNhanhResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public ChiNhanhResponse findById(UUID id) {
        return ChiNhanhResponse.from(getOrThrow(id));
    }

    @Transactional
    public ChiNhanhResponse create(ChiNhanhRequest req) {
        String ten = req.getTenChiNhanh().trim();
        if (chiNhanhRepository.existsByTenChiNhanhIgnoreCase(ten)) {
            throw new BusinessException("Tên chi nhánh đã tồn tại: " + ten);
        }
        ChiNhanh e = new ChiNhanh();
        e.setTenChiNhanh(ten);
        e.setDiaChi(req.getDiaChi());
        e.setLoai(req.getLoai());
        e.setDangHoatDong(true);
        return ChiNhanhResponse.from(chiNhanhRepository.save(e));
    }

    @Transactional
    public ChiNhanhResponse update(UUID id, ChiNhanhRequest req) {
        ChiNhanh e = getOrThrow(id);
        String ten = req.getTenChiNhanh().trim();
        if (!ten.equalsIgnoreCase(e.getTenChiNhanh())
                && chiNhanhRepository.existsByTenChiNhanhIgnoreCase(ten)) {
            throw new BusinessException("Tên chi nhánh đã tồn tại: " + ten);
        }
        e.setTenChiNhanh(ten);
        e.setDiaChi(req.getDiaChi());
        e.setLoai(req.getLoai());
        return ChiNhanhResponse.from(chiNhanhRepository.save(e));
    }

    /**
     * Khóa / mở khóa chi nhánh. KHÔNG xóa dữ liệu (co_so_du_lieu.md: "Khóa chi nhánh thay vì xóa").
     */
    @Transactional
    public ChiNhanhResponse doiTrangThai(UUID id, boolean dangHoatDong) {
        ChiNhanh e = getOrThrow(id);
        e.setDangHoatDong(dangHoatDong);
        return ChiNhanhResponse.from(chiNhanhRepository.save(e));
    }

    private ChiNhanh getOrThrow(UUID id) {
        return chiNhanhRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chi nhánh với id: " + id));
    }
}
