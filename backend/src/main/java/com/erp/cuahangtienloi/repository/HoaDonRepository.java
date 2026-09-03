package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.entity.HoaDon;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface HoaDonRepository extends JpaRepository<HoaDon, UUID> {
    Optional<HoaDon> findByMaHoaDon(String maHoaDon);
    List<HoaDon> findByIdChiNhanh(UUID idChiNhanh);
    List<HoaDon> findByIdThuNgan(UUID idThuNgan);
    List<HoaDon> findByTrangThai(String trangThai);
    List<HoaDon> findByNgayBanBetween(LocalDateTime from, LocalDateTime to);
}
