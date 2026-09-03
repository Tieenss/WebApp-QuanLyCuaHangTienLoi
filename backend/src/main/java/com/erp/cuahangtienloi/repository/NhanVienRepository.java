package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.entity.NhanVien;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NhanVienRepository extends JpaRepository<NhanVien, UUID> {
    Optional<NhanVien> findByEmail(String email);
    Optional<NhanVien> findByMaNhanVien(String maNhanVien);
    boolean existsByEmail(String email);
    boolean existsByMaNhanVien(String maNhanVien);
}
