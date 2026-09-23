package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.entity.LoHang;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LoHangRepository extends JpaRepository<LoHang, UUID> {
    List<LoHang> findByIdChiNhanhAndIdSanPhamOrderByHanSuDungAscNgayTaoAsc(UUID idChiNhanh, UUID idSanPham);

    List<LoHang> findByIdChiNhanhAndIdSanPhamAndSoLuongTonGreaterThanAndTrangThaiOrderByHanSuDungAscNgayTaoAsc(
            UUID idChiNhanh, UUID idSanPham, Integer soLuongTon, String trangThai);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT l FROM LoHang l WHERE l.idChiNhanh = :idChiNhanh AND l.idSanPham = :idSanPham AND l.soLuongTon > 0 AND l.trangThai = 'ACTIVE' ORDER BY l.hanSuDung ASC NULLS LAST, l.ngayTao ASC")
    List<LoHang> findActiveLotsForUpdate(
            @Param("idChiNhanh") UUID idChiNhanh,
            @Param("idSanPham") UUID idSanPham);

    List<LoHang> findByIdChiNhanhAndTrangThaiOrderByHanSuDungAsc(UUID idChiNhanh, String trangThai);

    Optional<LoHang> findByMaLoAndIdChiNhanh(String maLo, UUID idChiNhanh);
}
