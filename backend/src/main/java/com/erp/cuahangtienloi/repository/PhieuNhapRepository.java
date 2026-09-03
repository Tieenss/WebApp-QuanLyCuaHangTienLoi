package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.entity.PhieuNhap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PhieuNhapRepository extends JpaRepository<PhieuNhap, UUID> {
    Optional<PhieuNhap> findByMaPhieu(String maPhieu);
    List<PhieuNhap> findByIdChiNhanh(UUID idChiNhanh);
    List<PhieuNhap> findByIdNcc(UUID idNcc);
    List<PhieuNhap> findByIdNguoiNhap(UUID idNguoiNhap);
    List<PhieuNhap> findByTrangThai(String trangThai);
}
