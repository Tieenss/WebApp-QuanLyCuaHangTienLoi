package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.entity.ChiTietPhieuXuat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface ChiTietPhieuXuatRepository extends JpaRepository<ChiTietPhieuXuat, UUID> {
    List<ChiTietPhieuXuat> findByIdPhieuXuat(UUID idPhieuXuat);
    List<ChiTietPhieuXuat> findByIdSanPham(UUID idSanPham);
}
