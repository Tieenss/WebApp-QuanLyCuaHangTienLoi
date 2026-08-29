package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.entity.ChiNhanh;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ChiNhanhRepository extends JpaRepository<ChiNhanh, UUID> {
}
