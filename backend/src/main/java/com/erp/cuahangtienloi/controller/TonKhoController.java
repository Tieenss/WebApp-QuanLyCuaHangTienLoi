package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.dto.TonKhoDTO;
import com.erp.cuahangtienloi.entity.ChiNhanh;
import com.erp.cuahangtienloi.entity.SanPham;
import com.erp.cuahangtienloi.entity.TonKho;
import com.erp.cuahangtienloi.repository.*;
import com.erp.cuahangtienloi.service.BranchAccessService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import static com.erp.cuahangtienloi.validation.InputValidator.*;

@RestController
@RequestMapping("/api/ton-kho")
@RequiredArgsConstructor
//@CrossOrigin(origins = "*")
public class TonKhoController {

    private final TonKhoRepository tonKhoRepository;
    private final SanPhamRepository sanPhamRepository;
    private final ChiNhanhRepository chiNhanhRepository;
    private final BranchAccessService branchAccessService;

    @PersistenceContext
    private EntityManager entityManager;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<TonKhoDTO>> getAll(HttpServletRequest request) {
        var employee = branchAccessService.requireAuthenticatedEmployee(request);
        List<TonKho> source = branchAccessService.isSystemWide(employee)
                ? tonKhoRepository.findAll()
                : tonKhoRepository.findByIdChiNhanh(branchAccessService.requiredOwnBranch(employee));
        return ResponseEntity.ok(toDTOList(source));
    }

    @GetMapping("/by-branch/{idChiNhanh}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY', 'THU_NGAN')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<TonKhoDTO>> getByChiNhanh(@PathVariable UUID idChiNhanh,
                                                           HttpServletRequest request) {
        branchAccessService.requireReadableBranch(branchAccessService.requireAuthenticatedEmployee(request), idChiNhanh);
        return ResponseEntity.ok(toDTOList(tonKhoRepository.findByIdChiNhanh(idChiNhanh)));
    }

    @GetMapping("/by-product/{idSanPham}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<TonKhoDTO>> getBySanPham(@PathVariable UUID idSanPham,
                                                          HttpServletRequest request) {
        var employee = branchAccessService.requireAuthenticatedEmployee(request);
        List<TonKho> source = branchAccessService.isSystemWide(employee)
                ? tonKhoRepository.findByIdSanPham(idSanPham)
                : tonKhoRepository.findByIdSanPhamAndIdChiNhanh(idSanPham,
                        branchAccessService.requiredOwnBranch(employee)).stream().toList();
        return ResponseEntity.ok(toDTOList(source));
    }

    /**
     * Danh sách mặt hàng Kho Tổng còn tồn để lập yêu cầu điều chuyển.
     * Quản lý chi nhánh được đọc dữ liệu tối thiểu này nhưng không được đọc
     * toàn bộ tồn kho Kho Tổng qua endpoint thông thường.
     */
    @GetMapping("/available-for-transfer")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<TonKhoDTO>> getAvailableForTransfer() {
        UUID khoTongId = chiNhanhRepository.findFirstByLoai("KHO_TONG")
                .map(cn -> cn.getId())
                .orElseThrow(() -> new IllegalStateException("Chưa cấu hình Kho Tổng"));
        List<TonKho> source = tonKhoRepository.findByIdChiNhanh(khoTongId).stream()
                .filter(tk -> tk.getSoLuongTon() != null && tk.getSoLuongTon() > 0)
                .toList();
        return ResponseEntity.ok(toDTOList(source));
    }

    @GetMapping("/detail/{idSanPham}/{idChiNhanh}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> getDetail(@PathVariable UUID idSanPham, @PathVariable UUID idChiNhanh,
                                       HttpServletRequest request) {
        branchAccessService.requireReadableBranch(branchAccessService.requireAuthenticatedEmployee(request), idChiNhanh);
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
    public ResponseEntity<?> adjust(@RequestBody TonKhoAdjustmentRequest request, HttpServletRequest httpRequest) {
        if (request.idSanPham() == null || !sanPhamRepository.existsById(request.idSanPham())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Sản phẩm không tồn tại"));
        }
        if (request.idChiNhanh() == null || !chiNhanhRepository.existsById(request.idChiNhanh())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Chi nhánh không tồn tại"));
        }
        branchAccessService.requireReadableBranch(
                branchAccessService.requireAuthenticatedEmployee(httpRequest), request.idChiNhanh());
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

        entityManager.flush();
        return tonKhoRepository.findByIdSanPhamAndIdChiNhanh(request.idSanPham(), request.idChiNhanh())
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

    /** Bulk convert – chỉ gọi 2 query phụ (SanPham + ChiNhanh) dù list dài bao nhiêu. */
    private List<TonKhoDTO> toDTOList(List<TonKho> source) {
        if (source.isEmpty()) return List.of();
        // Pre-load lookup data vào Map – 1 query mỗi loại thay vì N queries
        Map<UUID, SanPham> sanPhamMap = sanPhamRepository.findAll().stream()
                .collect(Collectors.toMap(SanPham::getId, sp -> sp));
        Map<UUID, ChiNhanh> chiNhanhMap = chiNhanhRepository.findAll().stream()
                .collect(Collectors.toMap(ChiNhanh::getId, cn -> cn));
        return source.stream().map(tk -> toDTO(tk, sanPhamMap, chiNhanhMap)).collect(Collectors.toList());
    }

    private TonKhoDTO toDTO(TonKho tk) {
        return toDTO(tk, null, null);
    }

    private TonKhoDTO toDTO(TonKho tk, Map<UUID, SanPham> sanPhamMap, Map<UUID, ChiNhanh> chiNhanhMap) {
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
            SanPham sp = sanPhamMap != null ? sanPhamMap.get(tk.getIdSanPham())
                    : sanPhamRepository.findById(tk.getIdSanPham()).orElse(null);
            if (sp != null) { dto.setTenSanPham(sp.getTenSanPham()); dto.setMaVach(sp.getMaVach()); }
        }
        if (tk.getIdChiNhanh() != null) {
            ChiNhanh cn = chiNhanhMap != null ? chiNhanhMap.get(tk.getIdChiNhanh())
                    : chiNhanhRepository.findById(tk.getIdChiNhanh()).orElse(null);
            if (cn != null) dto.setTenChiNhanh(cn.getTenChiNhanh());
        }

        return dto;
    }

//    record ErrorResponse(String message) {}
//    record SuccessResponse(String message) {}
}
