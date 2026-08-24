package com.erp.cuahangtienloi.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;
import java.time.LocalDateTime;
import java.math.BigDecimal;

@Entity
@Table(name = "bang_luong")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BangLuong {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
}
