package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.entity.NhaCungCap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface NhaCungCapRepository extends JpaRepository<NhaCungCap, UUID> {
    boolean existsByTenNccIgnoreCase(String tenNcc);
}
