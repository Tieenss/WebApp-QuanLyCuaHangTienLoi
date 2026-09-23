package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.entity.ChiTietHoaDon;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface ChiTietHoaDonRepository extends JpaRepository<ChiTietHoaDon, UUID> {
    List<ChiTietHoaDon> findByIdHoaDon(UUID idHoaDon);
    List<ChiTietHoaDon> findByIdSanPham(UUID idSanPham);
}
