package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.entity.BangLuong;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BangLuongRepository extends JpaRepository<BangLuong, UUID> {
    List<BangLuong> findByIdNhanVien(UUID idNhanVien);
    List<BangLuong> findByThangNam(String thangNam);
    List<BangLuong> findByIdChiNhanhAndThangNam(UUID idChiNhanh, String thangNam);
    List<BangLuong> findByTrangThai(String trangThai);
    Optional<BangLuong> findByIdNhanVienAndThangNam(UUID idNhanVien, String thangNam);
}
