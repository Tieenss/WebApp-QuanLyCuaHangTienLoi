package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.entity.PhieuXuatKho;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PhieuXuatKhoRepository extends JpaRepository<PhieuXuatKho, UUID> {
    Optional<PhieuXuatKho> findByMaPhieu(String maPhieu);
    List<PhieuXuatKho> findByIdChiNhanhXuat(UUID idChiNhanhXuat);
    List<PhieuXuatKho> findByIdChiNhanhNhan(UUID idChiNhanhNhan);
    List<PhieuXuatKho> findByTrangThai(String trangThai);
    List<PhieuXuatKho> findByIdNguoiTao(UUID idNguoiTao);
}
