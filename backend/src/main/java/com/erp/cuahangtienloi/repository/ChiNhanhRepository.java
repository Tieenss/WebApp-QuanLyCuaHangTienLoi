package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.entity.ChiNhanh;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChiNhanhRepository extends JpaRepository<ChiNhanh, UUID> {
    Optional<ChiNhanh> findByMaChiNhanh(String maChiNhanh);

    Optional<ChiNhanh> findFirstByLoai(String loai);

    boolean existsByIdQuanLyAndIdNot(UUID idQuanLy, UUID id);
    Optional<ChiNhanh> findByIdQuanLy(UUID idQuanLy);
}
