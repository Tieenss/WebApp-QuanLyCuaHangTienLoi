package com.erp.cuahangtienloi.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "nha_cung_cap_danh_muc")
@IdClass(NhaCungCapDanhMuc.NccDanhMucId.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class NhaCungCapDanhMuc {

    @Id
    @Column(name = "id_nha_cung_cap")
    private UUID idNhaCungCap;

    @Id
    @Column(name = "id_danh_muc")
    private UUID idDanhMuc;

    @Column(name = "ngay_tao")
    private LocalDateTime ngayTao;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NccDanhMucId implements Serializable {

        private UUID idNhaCungCap;

        private UUID idDanhMuc;
    }
}