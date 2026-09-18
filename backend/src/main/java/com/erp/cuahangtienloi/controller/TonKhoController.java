package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.dto.TonKhoDTO;
import com.erp.cuahangtienloi.entity.SanPham;
import com.erp.cuahangtienloi.entity.TonKho;
import com.erp.cuahangtienloi.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.transaction.annotation.Transactional;

import static com.erp.cuahangtienloi.validation.InputValidator.*;

@RestController
@RequestMapping("/api/ton-kho")
@RequiredArgsConstructor
//@CrossOrigin(origins = "*")
public class TonKhoController {

    private final TonKhoRepository tonKhoRepository;
    private final SanPhamRepository sanPhamRepository;
    private final ChiNhanhRepository chiNhanhRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<List<TonKhoDTO>> getAll() {
        List<TonKhoDTO> list = tonKhoRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-branch/{idChiNhanh}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<List<TonKhoDTO>> getByChiNhanh(@PathVariable UUID idChiNhanh) {
        List<TonKhoDTO> list = tonKhoRepository.findByIdChiNhanh(idChiNhanh).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-product/{idSanPham}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<List<TonKhoDTO>> getBySanPham(@PathVariable UUID idSanPham) {
        List<TonKhoDTO> list = tonKhoRepository.findAll().stream()
                .filter(tk -> idSanPham.equals(tk.getIdSanPham()))
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/detail/{idSanPham}/{idChiNhanh}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> getDetail(@PathVariable UUID idSanPham, @PathVariable UUID idChiNhanh) {
        return tonKhoRepository.findByIdSanPhamAndIdChiNhanh(idSanPham, idChiNhanh)
                .map(tk -> ResponseEntity.ok(toDTO(tk)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> create(@RequestBody TonKho request) {
        if (request.getIdSanPham() == null || !sanPhamRepository.existsById(request.getIdSanPham())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Sản phẩm không tồn tại"));
        }
        if (request.getIdChiNhanh() == null || !chiNhanhRepository.existsById(request.getIdChiNhanh())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Chi nhánh không tồn tại"));
        }
        validateConfiguration(request);
        if (tonKhoRepository.findByIdSanPhamAndIdChiNhanh(request.getIdSanPham(), request.getIdChiNhanh()).isPresent()) {
            return ResponseEntity.badRequest().body( ApiResponse.err("Tồn kho đã tồn tại"));
        }

        TonKho tk = new TonKho();
        tk.setIdSanPham(request.getIdSanPham());
        tk.setIdChiNhanh(request.getIdChiNhanh());
        tk.setSoLuongTon(0);
        tk.setGiaVonTrungBinh(BigDecimal.ZERO);
        tk.setGiaTriTon(BigDecimal.ZERO);
        tk.setTonToiThieu(request.getTonToiThieu() != null ? request.getTonToiThieu() : 0);
        tk.setTonToiDa(request.getTonToiDa() != null ? request.getTonToiDa() : 0);
        tk.setHanSuDungGanNhat(request.getHanSuDungGanNhat());
        tk.setLanBienDongCuoi(LocalDateTime.now());
        tk.setNgayTao(LocalDateTime.now());
        tk.setNgayCapNhat(LocalDateTime.now());

        tonKhoRepository.save(tk);
        return ResponseEntity.ok(toDTO(tk));
    }

    @PutMapping("/{idSanPham}/{idChiNhanh}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> update(@PathVariable UUID idSanPham, @PathVariable UUID idChiNhanh, @RequestBody TonKho request) {
        return tonKhoRepository.findByIdSanPhamAndIdChiNhanh(idSanPham, idChiNhanh)
                .map(tk -> {
                    validateConfiguration(request);
                    if (request.getTonToiThieu() != null) tk.setTonToiThieu(request.getTonToiThieu());
                    if (request.getTonToiDa() != null) tk.setTonToiDa(request.getTonToiDa());
                    if (request.getHanSuDungGanNhat() != null) tk.setHanSuDungGanNhat(request.getHanSuDungGanNhat());
                    tk.setLanBienDongCuoi(LocalDateTime.now());
                    tk.setNgayCapNhat(LocalDateTime.now());
                    tonKhoRepository.save(tk);
                    return ResponseEntity.ok(toDTO(tk));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private void validateConfiguration(TonKho request) {
        nonNegative(request.getTonToiThieu(), "Tồn tối thiểu");
        nonNegative(request.getTonToiDa(), "Tồn tối đa");
        if (request.getTonToiThieu() != null && request.getTonToiDa() != null
                && request.getTonToiDa() > 0 && request.getTonToiDa() < request.getTonToiThieu()) {
            throw new IllegalArgumentException("Tồn tối đa phải lớn hơn hoặc bằng tồn tối thiểu");
        }
    }

    @PostMapping("/adjust")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    @Transactional
    public ResponseEntity<?> adjust(@RequestBody TonKhoAdjustmentRequest request) {
        if (request.idSanPham() == null || !sanPhamRepository.existsById(request.idSanPham())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Sản phẩm không tồn tại"));
        }
        if (request.idChiNhanh() == null || !chiNhanhRepository.existsById(request.idChiNhanh())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Chi nhánh không tồn tại"));
        }
        if (request.soLuong() == null || request.soLuong() == 0) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Số lượng điều chỉnh phải khác 0"));
        }
        nonNegative(request.donGia(), "Đơn giá");

        UUID id = (UUID) entityManager.createNativeQuery(
                "SELECT fn_ghi_the_kho_va_dieu_chinh_ton(?::uuid, ?::uuid, 'ADJUSTMENT', ?::integer, ?::numeric, ?::varchar, ?::varchar, ?::date, ?::text, ?::timestamp)")
                .setParameter(1, request.idSanPham())
                .setParameter(2, request.idChiNhanh())
                .setParameter(3, request.soLuong())
                .setParameter(4, request.donGia() != null ? request.donGia() : BigDecimal.ZERO)
                .setParameter(5, request.maChungTu())
                .setParameter(6, request.nguoiThucHien())
                .setParameter(7, request.hanSuDung())
                .setParameter(8, request.ghiChu())
                .setParameter(9, request.ngayPhatSinh() != null ? request.ngayPhatSinh() : LocalDateTime.now())
                .getSingleResult();

        return theKhoRepository.findById(id)
                .map(tk -> ResponseEntity.ok(toDTO(tk)))
                .orElse(ResponseEntity.notFound().build());
    }

    public record TonKhoAdjustmentRequest(
            UUID idSanPham, UUID idChiNhanh, Integer soLuong, BigDecimal donGia,
            String maChungTu, String nguoiThucHien, LocalDate hanSuDung,
            String ghiChu, LocalDateTime ngayPhatSinh) {}

    @DeleteMapping("/{idSanPham}/{idChiNhanh}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> delete(@PathVariable UUID idSanPham, @PathVariable UUID idChiNhanh) {
        tonKhoRepository.findByIdSanPhamAndIdChiNhanh(idSanPham, idChiNhanh)
                .ifPresent(tk -> tonKhoRepository.delete(tk));
        return ResponseEntity.ok( ApiResponse.ok("Xóa tồn kho thành công"));
    }

    private TonKhoDTO toDTO(TonKho tk) {
        TonKhoDTO dto = new TonKhoDTO();
        dto.setIdSanPham(tk.getIdSanPham());
        dto.setIdChiNhanh(tk.getIdChiNhanh());
        dto.setSoLuongTon(tk.getSoLuongTon());
        dto.setGiaVonTrungBinh(tk.getGiaVonTrungBinh());
        dto.setGiaTriTon(tk.getGiaTriTon());
        dto.setTonToiThieu(tk.getTonToiThieu());
        dto.setTonToiDa(tk.getTonToiDa());
        dto.setHanSuDungGanNhat(tk.getHanSuDungGanNhat());
        dto.setLanBienDongCuoi(tk.getLanBienDongCuoi());

        if (tk.getIdSanPham() != null) {
            sanPhamRepository.findById(tk.getIdSanPham())
                    .ifPresent(sp -> {
                        dto.setTenSanPham(sp.getTenSanPham());
                        dto.setMaVach(sp.getMaVach());
                    });
        }
        if (tk.getIdChiNhanh() != null) {
            chiNhanhRepository.findById(tk.getIdChiNhanh())
                    .ifPresent(cn -> dto.setTenChiNhanh(cn.getTenChiNhanh()));
        }

        return dto;
    }

//    record ErrorResponse(String message) {}
//    record SuccessResponse(String message) {}
}
