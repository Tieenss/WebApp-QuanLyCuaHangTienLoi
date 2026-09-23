package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.PhieuXuatKhoDTO;
import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.entity.ChiNhanh;
import com.erp.cuahangtienloi.entity.ChiTietPhieuXuat;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.entity.PhieuXuatKho;
import com.erp.cuahangtienloi.entity.SanPham;
import com.erp.cuahangtienloi.repository.*;
import com.erp.cuahangtienloi.service.BranchAccessService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/phieu-xuat-kho")
@RequiredArgsConstructor
//@CrossOrigin(origins = "*")
public class PhieuXuatKhoController {

    private final PhieuXuatKhoRepository phieuXuatKhoRepository;
    @org.springframework.beans.factory.annotation.Autowired
    private com.erp.cuahangtienloi.repository.NhanVienRepository nhanVienRepository;
    private final ChiNhanhRepository chiNhanhRepository;
    private final ChiTietPhieuXuatRepository chiTietPhieuXuatRepository;
    private final TonKhoRepository tonKhoRepository;
    private final SanPhamRepository sanPhamRepository;
    private final JdbcTemplate jdbcTemplate;
    private final BranchAccessService branchAccessService;
    private final com.erp.cuahangtienloi.service.LoHangService loHangService;

    @PersistenceContext
    private EntityManager entityManager;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'THU_KHO', 'QUAN_LY')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<PhieuXuatKhoDTO>> getAll(HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        List<PhieuXuatKho> filtered = phieuXuatKhoRepository.findAll().stream()
                .filter(pxk -> canReadTransfer(actor, pxk))
                .toList();
        return ResponseEntity.ok(toDTOList(filtered));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> getById(@PathVariable UUID id, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        return phieuXuatKhoRepository.findById(id)
                .filter(pxk -> canReadTransfer(actor, pxk))
                .map(hd -> ResponseEntity.ok(toDTO(hd)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-branch-xuat/{idChiNhanhXuat}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'THU_KHO', 'QUAN_LY')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<PhieuXuatKhoDTO>> getByBranchXuat(@PathVariable UUID idChiNhanhXuat, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        List<PhieuXuatKho> filtered = phieuXuatKhoRepository.findByIdChiNhanhXuat(idChiNhanhXuat).stream()
                .filter(pxk -> canReadTransfer(actor, pxk))
                .toList();
        return ResponseEntity.ok(toDTOList(filtered));
    }

    @GetMapping("/by-branch-nhan/{idChiNhanhNhan}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'THU_KHO', 'QUAN_LY')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<PhieuXuatKhoDTO>> getByBranchNhan(@PathVariable UUID idChiNhanhNhan, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        List<PhieuXuatKho> filtered = phieuXuatKhoRepository.findByIdChiNhanhNhan(idChiNhanhNhan).stream()
                .filter(pxk -> canReadTransfer(actor, pxk))
                .toList();
        return ResponseEntity.ok(toDTOList(filtered));
    }

    @GetMapping("/by-status/{trangThai}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'THU_KHO', 'QUAN_LY')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<PhieuXuatKhoDTO>> getByStatus(@PathVariable String trangThai, HttpServletRequest request) {
        NhanVien actor = branchAccessService.requireAuthenticatedEmployee(request);
        List<PhieuXuatKho> filtered = phieuXuatKhoRepository.findByTrangThai(trangThai).stream()
                .filter(pxk -> canReadTransfer(actor, pxk))
                .toList();
        return ResponseEntity.ok(toDTOList(filtered));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> create(@RequestBody PhieuXuatKho request, HttpServletRequest httpRequest) {
        if (request.getIdChiNhanhXuat() == null || !chiNhanhRepository.existsById(request.getIdChiNhanhXuat())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Chi nhánh xuất không tồn tại"));
        }
        if (request.getIdChiNhanhNhan() == null || !chiNhanhRepository.existsById(request.getIdChiNhanhNhan())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Chi nhánh nhận không tồn tại"));
        }
        if (request.getIdChiNhanhXuat().equals(request.getIdChiNhanhNhan())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Kho xuất và kho nhận phải khác nhau"));
        }
        requireTransferAccess(branchAccessService.requireAuthenticatedEmployee(httpRequest),
                request.getIdChiNhanhXuat(), request.getIdChiNhanhNhan());
        PhieuXuatKho pxk = new PhieuXuatKho();
        pxk.setMaPhieu(request.getMaPhieu());
        pxk.setIdChiNhanhXuat(request.getIdChiNhanhXuat());
        pxk.setIdChiNhanhNhan(request.getIdChiNhanhNhan());
        // Validate idNguoiTao - nếu không tồn tại trong bảng nhan_vien thì lấy NV đầu tiên
        // Mặc định là PENDING (yêu cầu), Thủ kho sẽ duyệt sau
        String trangThai = request.getTrangThai() != null ? request.getTrangThai() : "PENDING";
        pxk.setTrangThai(trangThai);
        // idNguoiTao: lấy NV đầu tiên trong DB
        UUID idNguoiTao = resolveAuthenticatedIdNhanVien(httpRequest);
        if (idNguoiTao == null) {
            throw new RuntimeException("Bảng nhan_vien rỗng, không thể tạo phiếu xuất");
        }
        pxk.setIdNguoiTao(idNguoiTao);
        // Các trường xác nhận chỉ được gán ở approve/ship/receive từ JWT.
        pxk.setIdNguoiDuyet(null);
        pxk.setIdNguoiNhan(null);
        pxk.setNgayXuatThucTe(null);
        pxk.setNgayNhanThucTe(null);
        pxk.setNgayYeuCau(request.getNgayYeuCau() != null ? request.getNgayYeuCau() : LocalDate.now());
        
        if ("COMPLETED".equals(trangThai)) {
            if (pxk.getIdNguoiDuyet() == null) pxk.setIdNguoiDuyet(idNguoiTao);
            if (pxk.getNgayXuatThucTe() == null) pxk.setNgayXuatThucTe(pxk.getNgayYeuCau());
            if (pxk.getNgayNhanThucTe() == null) pxk.setNgayNhanThucTe(pxk.getNgayYeuCau());
        }

        pxk.setGhiChu(request.getGhiChu());
        pxk.setNgayTao(LocalDateTime.now());
        pxk.setNgayCapNhat(LocalDateTime.now());

        PhieuXuatKho saved = phieuXuatKhoRepository.saveAndFlush(pxk);
        // Đọc lại từ DB: trigger sinh ma_phieu thay đổi row ngay khi INSERT,
        // entity trong persistence context vẫn giữ giá trị cũ (maPhieu null).
        entityManager.clear();
        return ResponseEntity.ok(toDTO(phieuXuatKhoRepository.findById(saved.getId()).orElseThrow()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO')")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody PhieuXuatKho request, HttpServletRequest httpRequest) {
        return phieuXuatKhoRepository.findById(id)
                .map(pxk -> {
                    NhanVien actor = branchAccessService.requireAuthenticatedEmployee(httpRequest);
                    requireTransferAccess(actor, pxk.getIdChiNhanhXuat(), pxk.getIdChiNhanhNhan());
                    UUID sourceId = request.getIdChiNhanhXuat() != null
                            ? request.getIdChiNhanhXuat() : pxk.getIdChiNhanhXuat();
                    UUID destinationId = request.getIdChiNhanhNhan() != null
                            ? request.getIdChiNhanhNhan() : pxk.getIdChiNhanhNhan();
                    if (sourceId == null || !chiNhanhRepository.existsById(sourceId)) {
                        return ResponseEntity.badRequest().body(ApiResponse.err("Chi nhánh xuất không tồn tại"));
                    }
                    if (destinationId == null || !chiNhanhRepository.existsById(destinationId)) {
                        return ResponseEntity.badRequest().body(ApiResponse.err("Chi nhánh nhận không tồn tại"));
                    }
                    if (sourceId.equals(destinationId)) {
                        return ResponseEntity.badRequest().body(ApiResponse.err("Kho xuất và kho nhận phải khác nhau"));
                    }
                    // Chặn đổi đầu phiếu sang chi nhánh mà người gọi không có quyền.
                    requireTransferAccess(actor, sourceId, destinationId);
                    if (request.getMaPhieu() != null) pxk.setMaPhieu(request.getMaPhieu());
                    if (request.getIdChiNhanhXuat() != null) pxk.setIdChiNhanhXuat(request.getIdChiNhanhXuat());
                    if (request.getIdChiNhanhNhan() != null) pxk.setIdChiNhanhNhan(request.getIdChiNhanhNhan());
                    if (request.getTrangThai() != null) pxk.setTrangThai(request.getTrangThai());
                    
                    if ("COMPLETED".equals(pxk.getTrangThai())) {
                        if (pxk.getIdNguoiDuyet() == null) pxk.setIdNguoiDuyet(pxk.getIdNguoiTao());
                        if (pxk.getNgayXuatThucTe() == null) pxk.setNgayXuatThucTe(pxk.getNgayYeuCau());
                        if (pxk.getNgayNhanThucTe() == null) pxk.setNgayNhanThucTe(pxk.getNgayYeuCau());
                    }

                    if (request.getGhiChu() != null) pxk.setGhiChu(request.getGhiChu());
                    pxk.setNgayCapNhat(LocalDateTime.now());
                    phieuXuatKhoRepository.save(pxk);
                    return ResponseEntity.ok(toDTO(pxk));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO')")
    public ResponseEntity<?> delete(@PathVariable UUID id, HttpServletRequest httpRequest) {
        return phieuXuatKhoRepository.findById(id).map(pxk -> {
            requireTransferAccess(branchAccessService.requireAuthenticatedEmployee(httpRequest),
                    pxk.getIdChiNhanhXuat(), pxk.getIdChiNhanhNhan());
            phieuXuatKhoRepository.delete(pxk);
            return ResponseEntity.ok(ApiResponse.ok("Xóa phiếu xuất kho thành công"));
        }).orElse(ResponseEntity.notFound().build());
    }

    private boolean canReadTransfer(NhanVien actor, PhieuXuatKho transfer) {
        return branchAccessService.canReadTransfer(actor,
                transfer.getIdChiNhanhXuat(), transfer.getIdChiNhanhNhan());
    }

    private void requireTransferAccess(NhanVien actor, UUID sourceBranchId, UUID destinationBranchId) {
        if (!branchAccessService.canReadTransfer(actor, sourceBranchId, destinationBranchId)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN,
                    "Không được thao tác điều chuyển ngoài phạm vi chi nhánh");
        }
    }

    /** Chỉ duyệt yêu cầu xuất: PENDING → APPROVED, không đụng tồn kho. */
    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO')")
    public ResponseEntity<?> approve(@PathVariable UUID id, @RequestBody(required = false) ApproveRequest body, HttpServletRequest httpRequest) {
        return phieuXuatKhoRepository.findById(id)
                .map(pxk -> {
                    requireTransferAccess(branchAccessService.requireAuthenticatedEmployee(httpRequest),
                            pxk.getIdChiNhanhXuat(), pxk.getIdChiNhanhNhan());
                    if (!"PENDING".equals(pxk.getTrangThai())) {
                        return ResponseEntity.badRequest().body(
                                 ApiResponse.err("Chỉ duyệt phiếu ở trạng thái PENDING"));
                    }
                    UUID idNguoiDuyet = branchAccessService.requireAuthenticatedEmployee(httpRequest).getId();
                    pxk.setTrangThai("APPROVED");
                    pxk.setIdNguoiDuyet(idNguoiDuyet);
                    pxk.setNgayCapNhat(LocalDateTime.now());
                    phieuXuatKhoRepository.save(pxk);
                    return ResponseEntity.ok(toDTO(pxk));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** Từ chối yêu cầu xuất: PENDING → CANCELLED. */
    @PutMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO')")
    public ResponseEntity<?> reject(@PathVariable UUID id, @RequestBody(required = false) RejectRequest body, HttpServletRequest httpRequest) {
        return phieuXuatKhoRepository.findById(id)
                .map(pxk -> {
                    requireTransferAccess(branchAccessService.requireAuthenticatedEmployee(httpRequest),
                            pxk.getIdChiNhanhXuat(), pxk.getIdChiNhanhNhan());
                    if (!"PENDING".equals(pxk.getTrangThai())) {
                        return ResponseEntity.badRequest().body(
                                 ApiResponse.err("Chỉ từ chối phiếu ở trạng thái PENDING"));
                    }
                    UUID idNguoiDuyet = branchAccessService.requireAuthenticatedEmployee(httpRequest).getId();
                    pxk.setTrangThai("CANCELLED");
                    pxk.setIdNguoiDuyet(idNguoiDuyet);
                    String lyDo = body != null && body.lyDo() != null ? body.lyDo().trim() : "";
                    String oldNote = pxk.getGhiChu();
                    if (!lyDo.isEmpty()) {
                        String newNote = (oldNote != null && !oldNote.isBlank())
                                ? oldNote + " | Lý do từ chối: " + lyDo
                                : "Lý do từ chối: " + lyDo;
                        pxk.setGhiChu(newNote);
                    }
                    pxk.setNgayCapNhat(LocalDateTime.now());
                    phieuXuatKhoRepository.save(pxk);
                    return ResponseEntity.ok(toDTO(pxk));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    record ApproveRequest() {}
    record RejectRequest(String lyDo) {}
//    record ErrorResponse(String message) {}

    /** Dòng gửi lên khi thủ kho xác nhận xuất / chi nhánh xác nhận nhận. */
    public static class MoveLine {
        private UUID idSanPham;
        private Integer soLuong;
        public UUID getIdSanPham() { return idSanPham; }
        public void setIdSanPham(UUID v) { this.idSanPham = v; }
        public Integer getSoLuong() { return soLuong; }
        public void setSoLuong(Integer v) { this.soLuong = v; }
    }

    /** Body của /ship và /receive. */
    public static class MoveRequest {
        private List<MoveLine> lines;
        public List<MoveLine> getLines() { return lines; }
        public void setLines(List<MoveLine> lines) { this.lines = lines; }
    }

    private UUID resolveStaffUuid(
            UUID candidate,
            HttpServletRequest httpRequest
    ) {
        // Người thực hiện là danh tính JWT, không tin id do client gửi.
        return resolveAuthenticatedIdNhanVien(httpRequest);
    }

    /**
     * Bước 2: Thủ kho xác nhận XUẤT KHO — APPROVED/PENDING → SHIPPED.
     * Trừ tồn Kho Tổng + ghi thẻ kho TRANSFER_OUT cho từng dòng (qua hàm DB
     * dùng chung), snapshot giá vốn bình quân vào dòng chi tiết.
     */
    @PutMapping("/{id}/ship")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO')")
    @Transactional
    public ResponseEntity<?> ship(@PathVariable UUID id, @RequestBody(required = false) MoveRequest body, HttpServletRequest httpRequest) {
        return phieuXuatKhoRepository.findById(id).<ResponseEntity<?>>map(pxk -> {
            requireTransferAccess(branchAccessService.requireAuthenticatedEmployee(httpRequest),
                    pxk.getIdChiNhanhXuat(), pxk.getIdChiNhanhNhan());
            if (!"PENDING".equals(pxk.getTrangThai()) && !"APPROVED".equals(pxk.getTrangThai())) {
                return ResponseEntity.badRequest().body(
                         ApiResponse.err("Chỉ xác nhận xuất được phiếu ở trạng thái PENDING hoặc APPROVED"));
            }
            List<ChiTietPhieuXuat> lines = chiTietPhieuXuatRepository.findByIdPhieuXuat(id);
            if (lines.isEmpty()) {
                return ResponseEntity.badRequest().body(
                         ApiResponse.err("Phiếu không có dòng chi tiết — không thể xuất"));
            }
            UUID idNguoiDuyet = resolveStaffUuid(null, httpRequest);
            if (idNguoiDuyet == null) {
                return ResponseEntity.badRequest().body( ApiResponse.err("Không tìm thấy nhân viên duyệt"));
            }

            Map<UUID, Integer> overrides = new HashMap<>();
            if (body != null && body.getLines() != null) {
                for (MoveLine ml : body.getLines()) {
                    if (ml.getIdSanPham() != null && ml.getSoLuong() != null) {
                        overrides.put(ml.getIdSanPham(), ml.getSoLuong());
                    }
                }
            }

            LocalDate ngayXuat = LocalDate.now();
            for (ChiTietPhieuXuat ct : lines) {
                int xuat = overrides.containsKey(ct.getIdSanPham())
                        ? overrides.get(ct.getIdSanPham())
                        : (ct.getSoLuongXuat() != null && ct.getSoLuongXuat() > 0
                                ? ct.getSoLuongXuat() : ct.getSoLuongYeuCau());
                if (xuat < 0 || xuat > ct.getSoLuongYeuCau()) {
                    return ResponseEntity.badRequest().body( ApiResponse.err(
                            "Số lượng xuất phải từ 0 đến số lượng yêu cầu"));
                }
                int ton = tonKhoRepository
                        .findByIdSanPhamAndIdChiNhanh(ct.getIdSanPham(), pxk.getIdChiNhanhXuat())
                        .map(t -> t.getSoLuongTon() == null ? 0 : t.getSoLuongTon())
                        .orElse(0);
                if (xuat > ton) {
                    SanPham sp = sanPhamRepository.findById(ct.getIdSanPham()).orElse(null);
                    String tenSp = sp != null ? sp.getTenSanPham() : "sản phẩm";
                    return ResponseEntity.badRequest().body( ApiResponse.err(
                            "Tổng lượng hàng trong kho không đủ để duyệt phiếu - Tổng kho của hàng " + tenSp + " hiện tại: " + ton));
                }
                BigDecimal giaVon = tonKhoRepository
                        .findByIdSanPhamAndIdChiNhanh(ct.getIdSanPham(), pxk.getIdChiNhanhXuat())
                        .map(t -> t.getGiaVonTrungBinh() == null ? BigDecimal.ZERO : t.getGiaVonTrungBinh())
                        .orElse(BigDecimal.ZERO);

                ct.setSoLuongXuat(xuat);
                ct.setSoLuongNhan(0); // chưa nhận — cập nhật ở bước /receive
                ct.setDonGiaVon(giaVon);
                ct.setThanhTien(giaVon.multiply(BigDecimal.valueOf(xuat)));
                chiTietPhieuXuatRepository.save(ct);

                if (xuat > 0) {
                    java.time.LocalDate exp = loHangService.xuatKhoFEFO(ct.getIdSanPham(), pxk.getIdChiNhanhXuat(), xuat);
                    if (exp == null) {
                        SanPham sp = sanPhamRepository.findById(ct.getIdSanPham()).orElse(null);
                        if (sp != null && sp.getHanSuDungNgay() != null && sp.getHanSuDungNgay() >= 0) {
                            exp = ngayXuat.plusDays(sp.getHanSuDungNgay());
                        }
                    }
                    if (exp != null) {
                        ct.setHanSuDung(exp);
                        chiTietPhieuXuatRepository.save(ct);
                    }
                    jdbcTemplate.query(
                            "SELECT fn_ghi_the_kho_va_dieu_chinh_ton(?::uuid, ?::uuid, ?::varchar, ?::integer, ?::numeric, ?::varchar, ?::varchar, ?::date, ?::text, NOW()::timestamp)",
                            rs -> { },
                            ct.getIdSanPham(), pxk.getIdChiNhanhXuat(), "TRANSFER_OUT", -xuat, giaVon,
                            pxk.getMaPhieu(), "Hệ thống", ct.getHanSuDung(),
                            "Xuất luân chuyển sang cửa hàng: phiếu " + pxk.getMaPhieu());
                }
            }

            pxk.setTrangThai("SHIPPED");
            pxk.setIdNguoiDuyet(idNguoiDuyet);
            pxk.setNgayXuatThucTe(ngayXuat);
            pxk.setNgayCapNhat(LocalDateTime.now());
            phieuXuatKhoRepository.save(pxk);
            phieuXuatKhoRepository.flush();

            // Người thực hiện hiển thị trên thẻ kho (chỉ mang tính ghi chú).
            chiTietPhieuXuatRepository.flush();
            entityManager.clear();
            return ResponseEntity.ok(toDTO(phieuXuatKhoRepository.findById(id).orElseThrow()));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * Bước 3: Quản lý chi nhánh xác nhận ĐÃ NHẬN HÀNG — SHIPPED → COMPLETED.
     * Cộng tồn chi nhánh nhận + ghi thẻ kho TRANSFER_IN.
     */
    @PutMapping("/{id}/receive")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY')")
    @Transactional
    public ResponseEntity<?> receive(@PathVariable UUID id, @RequestBody(required = false) MoveRequest body, HttpServletRequest httpRequest) {
        return phieuXuatKhoRepository.findById(id).<ResponseEntity<?>>map(pxk -> {
            requireTransferAccess(branchAccessService.requireAuthenticatedEmployee(httpRequest),
                    pxk.getIdChiNhanhXuat(), pxk.getIdChiNhanhNhan());
            if (!"SHIPPED".equals(pxk.getTrangThai())) {
                return ResponseEntity.badRequest().body(
                         ApiResponse.err("Chỉ xác nhận nhận được phiếu ở trạng thái SHIPPED (chờ nhận hàng)"));
            }
            List<ChiTietPhieuXuat> lines = chiTietPhieuXuatRepository.findByIdPhieuXuat(id);
            UUID idNguoiNhan = resolveStaffUuid(null, httpRequest);
            if (idNguoiNhan == null) {
                return ResponseEntity.badRequest().body( ApiResponse.err("Không tìm thấy nhân viên nhận"));
            }

            Map<UUID, Integer> overrides = new HashMap<>();
            if (body != null && body.getLines() != null) {
                for (MoveLine ml : body.getLines()) {
                    if (ml.getIdSanPham() != null && ml.getSoLuong() != null) {
                        overrides.put(ml.getIdSanPham(), ml.getSoLuong());
                    }
                }
            }

            for (ChiTietPhieuXuat ct : lines) {
                int xuat = ct.getSoLuongXuat() == null ? 0 : ct.getSoLuongXuat();
                int nhan = overrides.containsKey(ct.getIdSanPham())
                        ? overrides.get(ct.getIdSanPham()) : xuat;
                if (nhan < 0 || nhan > xuat) {
                    return ResponseEntity.badRequest().body( ApiResponse.err(
                            "Số lượng nhận phải từ 0 đến số lượng xuất"));
                }
                ct.setSoLuongNhan(nhan);
                chiTietPhieuXuatRepository.save(ct);

                if (nhan > 0) {
                    LocalDate hsdNhan = ct.getHanSuDung();
                    if (hsdNhan == null) {
                        SanPham sp = sanPhamRepository.findById(ct.getIdSanPham()).orElse(null);
                        if (sp != null && sp.getHanSuDungNgay() != null && sp.getHanSuDungNgay() >= 0) {
                            LocalDate baseDate = pxk.getNgayXuatThucTe() != null ? pxk.getNgayXuatThucTe() : LocalDate.now();
                            hsdNhan = baseDate.plusDays(sp.getHanSuDungNgay());
                            ct.setHanSuDung(hsdNhan);
                            chiTietPhieuXuatRepository.save(ct);
                        }
                    }
                    jdbcTemplate.query(
                            "SELECT fn_ghi_the_kho_va_dieu_chinh_ton(?::uuid, ?::uuid, ?::varchar, ?::integer, ?::numeric, ?::varchar, ?::varchar, ?::date, ?::text, NOW()::timestamp)",
                            rs -> { },
                            ct.getIdSanPham(), pxk.getIdChiNhanhNhan(), "TRANSFER_IN", nhan,
                            ct.getDonGiaVon() == null ? BigDecimal.ZERO : ct.getDonGiaVon(),
                            pxk.getMaPhieu(), "Hệ thống", hsdNhan,
                            "Nhận hàng luân chuyển từ kho tổng: phiếu " + pxk.getMaPhieu());
                    loHangService.taoHoacCapNhatLoHang(
                            ct.getIdSanPham(), pxk.getIdChiNhanhNhan(), nhan,
                            ct.getDonGiaVon(), hsdNhan, null, null);
                }
            }

            pxk.setTrangThai("COMPLETED");
            pxk.setIdNguoiNhan(idNguoiNhan);
            pxk.setNgayNhanThucTe(LocalDate.now());
            pxk.setNgayCapNhat(LocalDateTime.now());
            phieuXuatKhoRepository.save(pxk);
            phieuXuatKhoRepository.flush();
            entityManager.clear();
            return ResponseEntity.ok(toDTO(phieuXuatKhoRepository.findById(id).orElseThrow()));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    private UUID resolveAuthenticatedIdNhanVien(HttpServletRequest request) {
        Object attr = request.getAttribute("authenticatedIdNhanVien");

        if (attr instanceof String s) {
            try {
                UUID id = UUID.fromString(s);

                if (nhanVienRepository.existsById(id)) {
                    return id;
                }
            } catch (IllegalArgumentException ignored) {
                // UUID không hợp lệ
            }
        }

        return null;
    }

    /** Bulk convert – chỉ gọi 2 query phụ (ChiNhanh + NhanVien) dù list dài bao nhiêu. */
    private List<PhieuXuatKhoDTO> toDTOList(List<PhieuXuatKho> source) {
        if (source.isEmpty()) return List.of();
        Map<UUID, String> chiNhanhMap = chiNhanhRepository.findAll().stream()
                .collect(Collectors.toMap(cn -> cn.getId(), cn -> cn.getTenChiNhanh()));
        Map<UUID, String> nhanVienMap = nhanVienRepository.findAll().stream()
                .collect(Collectors.toMap(nv -> nv.getId(), nv -> nv.getHoTen()));
        return source.stream().map(pxk -> toDTO(pxk, chiNhanhMap, nhanVienMap)).collect(Collectors.toList());
    }

    private PhieuXuatKhoDTO toDTO(PhieuXuatKho pxk) {
        return toDTO(pxk, null, null);
    }

    private PhieuXuatKhoDTO toDTO(PhieuXuatKho pxk, Map<UUID, String> chiNhanhMap, Map<UUID, String> nhanVienMap) {
        PhieuXuatKhoDTO dto = new PhieuXuatKhoDTO();
        dto.setId(pxk.getId());
        dto.setMaPhieu(pxk.getMaPhieu());
        dto.setIdChiNhanhXuat(pxk.getIdChiNhanhXuat());
        dto.setIdChiNhanhNhan(pxk.getIdChiNhanhNhan());
        dto.setIdNguoiTao(pxk.getIdNguoiTao());
        dto.setIdNguoiDuyet(pxk.getIdNguoiDuyet());
        dto.setIdNguoiNhan(pxk.getIdNguoiNhan());
        dto.setNgayYeuCau(pxk.getNgayYeuCau());
        dto.setNgayXuatThucTe(pxk.getNgayXuatThucTe());
        dto.setNgayNhanThucTe(pxk.getNgayNhanThucTe());
        dto.setTrangThai(pxk.getTrangThai());
        dto.setGhiChu(pxk.getGhiChu());

        if (pxk.getIdChiNhanhXuat() != null) {
            String ten = chiNhanhMap != null ? chiNhanhMap.get(pxk.getIdChiNhanhXuat())
                    : chiNhanhRepository.findById(pxk.getIdChiNhanhXuat()).map(cn -> cn.getTenChiNhanh()).orElse(null);
            dto.setTenChiNhanhXuat(ten);
        }
        if (pxk.getIdChiNhanhNhan() != null) {
            String ten = chiNhanhMap != null ? chiNhanhMap.get(pxk.getIdChiNhanhNhan())
                    : chiNhanhRepository.findById(pxk.getIdChiNhanhNhan()).map(cn -> cn.getTenChiNhanh()).orElse(null);
            dto.setTenChiNhanhNhan(ten);
        }
        if (pxk.getIdNguoiTao() != null) {
            String ten = nhanVienMap != null ? nhanVienMap.get(pxk.getIdNguoiTao())
                    : nhanVienRepository.findById(pxk.getIdNguoiTao()).map(nv -> nv.getHoTen()).orElse(null);
            dto.setTenNguoiTao(ten);
        }
        if (pxk.getIdNguoiDuyet() != null) {
            String ten = nhanVienMap != null ? nhanVienMap.get(pxk.getIdNguoiDuyet())
                    : nhanVienRepository.findById(pxk.getIdNguoiDuyet()).map(nv -> nv.getHoTen()).orElse(null);
            dto.setTenNguoiDuyet(ten);
        }
        if (pxk.getIdNguoiNhan() != null) {
            String ten = nhanVienMap != null ? nhanVienMap.get(pxk.getIdNguoiNhan())
                    : nhanVienRepository.findById(pxk.getIdNguoiNhan()).map(nv -> nv.getHoTen()).orElse(null);
            dto.setTenNguoiNhan(ten);
        }

        return dto;
    }

//    record SuccessResponse(String message) {}
}
