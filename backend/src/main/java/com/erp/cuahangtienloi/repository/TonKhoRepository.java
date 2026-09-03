package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.entity.TonKho;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TonKhoRepository extends JpaRepository<TonKho, TonKho.TonKhoId> {
    List<TonKho> findByIdChiNhanh(UUID idChiNhanh);
    Optional<TonKho> findByIdSanPhamAndIdChiNhanh(UUID idSanPham, UUID idChiNhanh);
}
