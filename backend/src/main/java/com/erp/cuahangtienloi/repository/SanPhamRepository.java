package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.entity.SanPham;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SanPhamRepository extends JpaRepository<SanPham, UUID> {
    Optional<SanPham> findBySku(String sku);
    Optional<SanPham> findByMaVach(String maVach);
    List<SanPham> findByIdDanhMuc(UUID idDanhMuc);
    List<SanPham> findByDangHoatDong(Boolean dangHoatDong);
    boolean existsBySku(String sku);
    boolean existsByMaVach(String maVach);
}
