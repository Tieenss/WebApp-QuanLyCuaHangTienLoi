package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.entity.PhieuKiemKe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PhieuKiemKeRepository extends JpaRepository<PhieuKiemKe, UUID> {
    Optional<PhieuKiemKe> findByMaPhieu(String maPhieu);
    List<PhieuKiemKe> findByIdChiNhanh(UUID idChiNhanh);
    List<PhieuKiemKe> findByTrangThai(String trangThai);
    List<PhieuKiemKe> findByIdNguoiTao(UUID idNguoiTao);
}
