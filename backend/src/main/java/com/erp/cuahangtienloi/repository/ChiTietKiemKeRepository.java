package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.entity.ChiTietKiemKe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface ChiTietKiemKeRepository extends JpaRepository<ChiTietKiemKe, UUID> {
    List<ChiTietKiemKe> findByIdPhieuKiemKe(UUID idPhieuKiemKe);
    List<ChiTietKiemKe> findByIdSanPham(UUID idSanPham);
}
