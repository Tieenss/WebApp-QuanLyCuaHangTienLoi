package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.danhmuc.DanhMucRequest;
import com.erp.cuahangtienloi.dto.danhmuc.DanhMucResponse;
import com.erp.cuahangtienloi.entity.DanhMuc;
import com.erp.cuahangtienloi.exception.BusinessException;
import com.erp.cuahangtienloi.exception.ResourceNotFoundException;
import com.erp.cuahangtienloi.repository.DanhMucRepository;
import com.erp.cuahangtienloi.repository.SanPhamRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Nghiệp vụ quản lý danh mục (ERP-S1-05, mục 3).
 * Rule: chỉ được xóa danh mục khi chưa có sản phẩm nào thuộc danh mục đó.
 */
@Service
public class DanhMucService {

    private final DanhMucRepository danhMucRepository;
    private final SanPhamRepository sanPhamRepository;

    public DanhMucService(DanhMucRepository danhMucRepository,
                          SanPhamRepository sanPhamRepository) {
        this.danhMucRepository = danhMucRepository;
        this.sanPhamRepository = sanPhamRepository;
    }

    @Transactional(readOnly = true)
    public List<DanhMucResponse> findAll() {
        return danhMucRepository.findAll().stream()
                .map(DanhMucResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public DanhMucResponse findById(UUID id) {
        return DanhMucResponse.from(getOrThrow(id));
    }

    @Transactional
    public DanhMucResponse create(DanhMucRequest req) {
        String ten = req.getTenDanhMuc().trim();
        if (danhMucRepository.existsByTenDanhMucIgnoreCase(ten)) {
            throw new BusinessException("Tên danh mục đã tồn tại: " + ten);
        }
        DanhMuc e = new DanhMuc();
        e.setTenDanhMuc(ten);
        return DanhMucResponse.from(danhMucRepository.save(e));
    }

    @Transactional
    public DanhMucResponse update(UUID id, DanhMucRequest req) {
        DanhMuc e = getOrThrow(id);
        String ten = req.getTenDanhMuc().trim();
        if (!ten.equalsIgnoreCase(e.getTenDanhMuc())
                && danhMucRepository.existsByTenDanhMucIgnoreCase(ten)) {
            throw new BusinessException("Tên danh mục đã tồn tại: " + ten);
        }
        e.setTenDanhMuc(ten);
        return DanhMucResponse.from(danhMucRepository.save(e));
    }

    /**
     * Xóa danh mục. Chặn nếu còn sản phẩm tham chiếu để bảo vệ quan hệ dữ liệu.
     */
    @Transactional
    public void delete(UUID id) {
        DanhMuc e = getOrThrow(id);
        if (sanPhamRepository.existsByDanhMucId(id)) {
            throw new BusinessException(
                    "Không thể xóa danh mục '" + e.getTenDanhMuc() + "' vì đang có sản phẩm thuộc danh mục này");
        }
        danhMucRepository.delete(e);
    }

    private DanhMuc getOrThrow(UUID id) {
        return danhMucRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với id: " + id));
    }
}
