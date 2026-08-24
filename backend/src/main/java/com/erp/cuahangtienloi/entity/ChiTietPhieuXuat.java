package com.erp.cuahangtienloi.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;
import java.time.LocalDateTime;
import java.math.BigDecimal;

@Entity
@Table(name = "chi_tiet_phieu_xuat")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ChiTietPhieuXuat {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
}
