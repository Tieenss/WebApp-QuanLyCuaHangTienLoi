package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.entity.NhaCungCap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NhaCungCapRepository extends JpaRepository<NhaCungCap, UUID> {
    Optional<NhaCungCap> findByMaNhaCungCap(String maNhaCungCap);
    boolean existsByMaNhaCungCap(String maNhaCungCap);
}
