package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.entity.ChamCong;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChamCongRepository extends JpaRepository<ChamCong, UUID> {
    List<ChamCong> findByIdNhanVien(UUID idNhanVien);
    List<ChamCong> findByWorkDate(LocalDate workDate);
    List<ChamCong> findByWorkDateBetween(LocalDate from, LocalDate to);
    List<ChamCong> findByIdNhanVienAndWorkDateBetween(UUID idNhanVien, LocalDate from, LocalDate to);
    Optional<ChamCong> findByIdNhanVienAndWorkDateAndCaLamViec(UUID idNhanVien, LocalDate workDate, String caLamViec);
}