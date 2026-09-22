package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.entity.TonKho;
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
public interface TonKhoRepository extends JpaRepository<TonKho, TonKho.TonKhoId> {
    List<TonKho> findByIdChiNhanh(UUID idChiNhanh);
    List<TonKho> findByIdSanPham(UUID idSanPham);
    Optional<TonKho> findByIdSanPhamAndIdChiNhanh(UUID idSanPham, UUID idChiNhanh);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from TonKho t where t.idSanPham = :idSanPham and t.idChiNhanh = :idChiNhanh")
    Optional<TonKho> findByIdSanPhamAndIdChiNhanhForUpdate(
            @Param("idSanPham") UUID idSanPham,
            @Param("idChiNhanh") UUID idChiNhanh);
}
