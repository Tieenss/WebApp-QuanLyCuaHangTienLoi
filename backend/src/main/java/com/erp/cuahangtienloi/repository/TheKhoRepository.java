package com.erp.cuahangtienloi.repository;

import com.erp.cuahangtienloi.entity.TheKho;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface TheKhoRepository extends JpaRepository<TheKho, UUID> {
    List<TheKho> findByIdSanPhamAndIdChiNhanhOrderByNgayPhatSinhDesc(UUID idSanPham, UUID idChiNhanh);
    List<TheKho> findByMaChungTu(String maChungTu);
    List<TheKho> findByLoaiGiaoDichAndIdChiNhanhOrderByNgayPhatSinhDesc(String loaiGiaoDich, UUID idChiNhanh);
    List<TheKho> findByIdChiNhanhAndNgayPhatSinhBetweenOrderByNgayPhatSinhDesc(UUID idChiNhanh, LocalDateTime from, LocalDateTime to);
}
