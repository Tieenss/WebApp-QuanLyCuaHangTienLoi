package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.dto.nhacungcap.NhaCungCapRequest;
import com.erp.cuahangtienloi.dto.nhacungcap.NhaCungCapResponse;
import com.erp.cuahangtienloi.entity.NhaCungCap;
import com.erp.cuahangtienloi.exception.BusinessException;
import com.erp.cuahangtienloi.exception.ResourceNotFoundException;
import com.erp.cuahangtienloi.repository.NhaCungCapRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Nghiệp vụ quản lý nhà cung cấp (ERP-S1-05, mục 5).
 * Theo đặc tả MVP: chỉ tạo/sửa, không quản lý công nợ.
 */
@Service
public class NhaCungCapService {

    private final NhaCungCapRepository nhaCungCapRepository;

    public NhaCungCapService(NhaCungCapRepository nhaCungCapRepository) {
        this.nhaCungCapRepository = nhaCungCapRepository;
    }

    @Transactional(readOnly = true)
    public List<NhaCungCapResponse> findAll() {
        return nhaCungCapRepository.findAll().stream()
                .map(NhaCungCapResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public NhaCungCapResponse findById(UUID id) {
        return NhaCungCapResponse.from(getOrThrow(id));
    }

    @Transactional
    public NhaCungCapResponse create(NhaCungCapRequest req) {
        String ten = req.getTenNcc().trim();
        if (nhaCungCapRepository.existsByTenNccIgnoreCase(ten)) {
            throw new BusinessException("Tên nhà cung cấp đã tồn tại: " + ten);
        }
        NhaCungCap e = new NhaCungCap();
        e.setTenNcc(ten);
        e.setSoDienThoai(req.getSoDienThoai());
        e.setDiaChi(req.getDiaChi());
        return NhaCungCapResponse.from(nhaCungCapRepository.save(e));
    }

    @Transactional
    public NhaCungCapResponse update(UUID id, NhaCungCapRequest req) {
        NhaCungCap e = getOrThrow(id);
        String ten = req.getTenNcc().trim();
        if (!ten.equalsIgnoreCase(e.getTenNcc())
                && nhaCungCapRepository.existsByTenNccIgnoreCase(ten)) {
            throw new BusinessException("Tên nhà cung cấp đã tồn tại: " + ten);
        }
        e.setTenNcc(ten);
        e.setSoDienThoai(req.getSoDienThoai());
        e.setDiaChi(req.getDiaChi());
        return NhaCungCapResponse.from(nhaCungCapRepository.save(e));
    }

    private NhaCungCap getOrThrow(UUID id) {
        return nhaCungCapRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhà cung cấp với id: " + id));
    }
}
