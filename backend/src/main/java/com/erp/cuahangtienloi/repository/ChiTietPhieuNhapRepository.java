package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.entity.ChiTietPhieuNhap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface ChiTietPhieuNhapRepository extends JpaRepository<ChiTietPhieuNhap, UUID> {
    List<ChiTietPhieuNhap> findByIdPhieuNhap(UUID idPhieuNhap);
    List<ChiTietPhieuNhap> findByIdSanPham(UUID idSanPham);
}
