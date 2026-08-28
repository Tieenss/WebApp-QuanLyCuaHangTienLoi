package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.entity.SanPham;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface SanPhamRepository extends JpaRepository<SanPham, UUID> {
    boolean existsByMaVach(String maVach);

    /** Dùng để kiểm tra danh mục còn sản phẩm hay không (rule xóa danh mục). */
    boolean existsByDanhMucId(UUID idDanhMuc);
}
