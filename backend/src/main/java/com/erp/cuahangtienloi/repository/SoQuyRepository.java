package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.entity.SoQuy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SoQuyRepository extends JpaRepository<SoQuy, UUID> {
    Optional<SoQuy> findByMaChungTu(String maChungTu);
    List<SoQuy> findByIdChiNhanh(UUID idChiNhanh);
    List<SoQuy> findByDirection(String direction);
    List<SoQuy> findByHangMuc(String hangMuc);
    List<SoQuy> findByEntryDateBetween(LocalDate from, LocalDate to);
}
