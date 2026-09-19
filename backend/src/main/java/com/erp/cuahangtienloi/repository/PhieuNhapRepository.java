package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.entity.PhieuNhap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PhieuNhapRepository extends JpaRepository<PhieuNhap, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from PhieuNhap p where p.id = :id")
    Optional<PhieuNhap> findByIdForUpdate(@Param("id") UUID id);

    Optional<PhieuNhap> findByMaPhieu(String maPhieu);
    List<PhieuNhap> findByIdChiNhanh(UUID idChiNhanh);
    List<PhieuNhap> findByIdNcc(UUID idNcc);
    List<PhieuNhap> findByIdNguoiNhap(UUID idNguoiNhap);
    List<PhieuNhap> findByTrangThai(String trangThai);
}
