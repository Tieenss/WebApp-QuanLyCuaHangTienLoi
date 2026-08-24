const fs = require('fs');
const entities = ['ChiNhanh', 'NhanVien', 'ChamCong', 'BangLuong', 'DanhMuc', 'SanPham', 'TonKho', 'TheKho', 'PhieuKiemKe', 'ChiTietKiemKe', 'HoaDon', 'ChiTietHoaDon', 'NhaCungCap', 'PhieuNhap', 'ChiTietPhieuNhap', 'PhieuXuatKho', 'ChiTietPhieuXuat', 'SoQuy'];
entities.forEach(e => {
  const code = `package com.erp.cuahangtienloi.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;
import java.time.LocalDateTime;
import java.math.BigDecimal;

@Entity
@Table(name = "${e.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()}")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ${e} {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
}
`;
  fs.writeFileSync(`backend/src/main/java/com/erp/cuahangtienloi/entity/${e}.java`, code);
});
