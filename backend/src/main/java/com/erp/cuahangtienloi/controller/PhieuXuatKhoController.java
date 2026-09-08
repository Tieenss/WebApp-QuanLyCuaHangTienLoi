package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.PhieuXuatKhoDTO;
import com.erp.cuahangtienloi.entity.ChiTietPhieuXuat;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.entity.PhieuXuatKho;
import com.erp.cuahangtienloi.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/phieu-xuat-kho")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PhieuXuatKhoController {

    private final PhieuXuatKhoRepository phieuXuatKhoRepository;
    @org.springframework.beans.factory.annotation.Autowired
    private com.erp.cuahangtienloi.repository.NhanVienRepository nhanVienRepository;
    private final ChiNhanhRepository chiNhanhRepository;
    private final ChiTietPhieuXuatRepository chiTietPhieuXuatRepository;
    private final TonKhoRepository tonKhoRepository;
    private final JdbcTemplate jdbcTemplate;

    @PersistenceContext
    private EntityManager entityManager;

    @GetMapping
    public ResponseEntity<List<PhieuXuatKhoDTO>> getAll() {
        List<PhieuXuatKhoDTO> list = phieuXuatKhoRepository.findAll().stream()
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable UUID id) {
        return phieuXuatKhoRepository.findById(id)
                .map(hd -> ResponseEntity.ok(toDTO(hd)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-branch-xuat/{idChiNhanhXuat}")
    public ResponseEntity<List<PhieuXuatKhoDTO>> getByBranchXuat(@PathVariable UUID idChiNhanhXuat) {
        List<PhieuXuatKhoDTO> list = phieuXuatKhoRepository.findByIdChiNhanhXuat(idChiNhanhXuat).stream()
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-branch-nhan/{idChiNhanhNhan}")
    public ResponseEntity<List<PhieuXuatKhoDTO>> getByBranchNhan(@PathVariable UUID idChiNhanhNhan) {
        List<PhieuXuatKhoDTO> list = phieuXuatKhoRepository.findByIdChiNhanhNhan(idChiNhanhNhan).stream()
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-status/{trangThai}")
    public ResponseEntity<List<PhieuXuatKhoDTO>> getByStatus(@PathVariable String trangThai) {
        List<PhieuXuatKhoDTO> list = phieuXuatKhoRepository.findByTrangThai(trangThai).stream()
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody PhieuXuatKho request) {
        PhieuXuatKho pxk = new PhieuXuatKho();
        pxk.setMaPhieu(request.getMaPhieu());
        pxk.setIdChiNhanhXuat(request.getIdChiNhanhXuat());
        pxk.setIdChiNhanhNhan(request.getIdChiNhanhNhan());
        // Validate idNguoiTao - nếu không tồn tại trong bảng nhan_vien thì lấy NV đầu tiên
        // Mặc định là PENDING (yêu cầu), Thủ kho sẽ duyệt sau
        String trangThai = request.getTrangThai() != null ? request.getTrangThai() : "PENDING";
        pxk.setTrangThai(trangThai);
        // idNguoiTao: lấy NV đầu tiên trong DB
        UUID idNguoiTao = request.getIdNguoiTao();
        if (idNguoiTao == null || !nhanVienRepository.existsById(idNguoiTao)) {
            idNguoiTao = nhanVienRepository.findAll().stream()
                    .findFirst()
                    .map(nv -> nv.getId())
                    .orElse(null);
        }
        if (idNguoiTao == null) {
            throw new RuntimeException("Bảng nhan_vien rỗng, không thể tạo phiếu xuất");
        }
        pxk.setIdNguoiTao(idNguoiTao);
        // idNguoiDuyet, idNguoiNhan, ngayXuatThucTe, ngayNhanThucTe - set khi duyệt
        // Giờ chỉ set nếu frontend gửi
        pxk.setIdNguoiDuyet(request.getIdNguoiDuyet());
        pxk.setIdNguoiNhan(request.getIdNguoiNhan());
        pxk.setNgayXuatThucTe(request.getNgayXuatThucTe());
        pxk.setNgayNhanThucTe(request.getNgayNhanThucTe());
        pxk.setNgayYeuCau(request.getNgayYeuCau() != null ? request.getNgayYeuCau() : LocalDate.now());
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
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody PhieuXuatKho request) {
        return phieuXuatKhoRepository.findById(id)
                .map(pxk -> {
                    if (request.getMaPhieu() != null) pxk.setMaPhieu(request.getMaPhieu());
                    if (request.getIdChiNhanhXuat() != null) pxk.setIdChiNhanhXuat(request.getIdChiNhanhXuat());
                    if (request.getIdChiNhanhNhan() != null) pxk.setIdChiNhanhNhan(request.getIdChiNhanhNhan());
                    if (request.getIdNguoiDuyet() != null) pxk.setIdNguoiDuyet(request.getIdNguoiDuyet());
                    if (request.getIdNguoiNhan() != null) pxk.setIdNguoiNhan(request.getIdNguoiNhan());
                    if (request.getNgayXuatThucTe() != null) pxk.setNgayXuatThucTe(request.getNgayXuatThucTe());
                    if (request.getNgayNhanThucTe() != null) pxk.setNgayNhanThucTe(request.getNgayNhanThucTe());
                    if (request.getTrangThai() != null) pxk.setTrangThai(request.getTrangThai());
                    if (request.getGhiChu() != null) pxk.setGhiChu(request.getGhiChu());
                    pxk.setNgayCapNhat(LocalDateTime.now());
                    phieuXuatKhoRepository.save(pxk);
                    return ResponseEntity.ok(toDTO(pxk));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (phieuXuatKhoRepository.existsById(id)) {
            phieuXuatKhoRepository.deleteById(id);
            return ResponseEntity.ok(new SuccessResponse("Xóa phiếu xuất kho thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    /**
     * Thủ kho duyệt yêu cầu xuất: PENDING → COMPLETED.
     * Tự set ngayXuatThucTe, ngayNhanThucTe, idNguoiDuyet.
     */
    @PutMapping("/{id}/approve")
    public ResponseEntity<?> approve(@PathVariable UUID id, @RequestBody(required = false) ApproveRequest body) {
        return phieuXuatKhoRepository.findById(id)
                .map(pxk -> {
                    if (!"PENDING".equals(pxk.getTrangThai())) {
                        return ResponseEntity.badRequest().body(
                                new ErrorResponse("Chỉ duyệt phiếu ở trạng thái PENDING"));
                    }
                    // Tìm NV theo idNguoiDuyet hoặc fallback NV đầu tiên có vai trò THỦ KHO/ADMIN
                    UUID idNguoiDuyet = null;
                    if (body != null && body.idNguoiDuyet() != null && nhanVienRepository.existsById(body.idNguoiDuyet())) {
                        idNguoiDuyet = body.idNguoiDuyet();
                    } else {
                        idNguoiDuyet = nhanVienRepository.findAll().stream()
                                .filter(nv -> "THU_KHO".equals(nv.getVaiTro()) || "ADMIN".equals(nv.getVaiTro()))
                                .map(nv -> nv.getId())
                                .findFirst()
                                .orElseGet(() -> nhanVienRepository.findAll().stream()
                                        .findFirst()
                                        .map(nv -> nv.getId())
                                        .orElse(null));
                    }
                    if (idNguoiDuyet == null) {
                        return ResponseEntity.badRequest().body(
                                new ErrorResponse("Không tìm thấy nhân viên để duyệt"));
                    }
                    pxk.setTrangThai("COMPLETED");
                    pxk.setIdNguoiDuyet(idNguoiDuyet);
                    pxk.setNgayXuatThucTe(LocalDate.now());
                    pxk.setNgayNhanThucTe(LocalDate.now());
                    pxk.setNgayCapNhat(LocalDateTime.now());
                    phieuXuatKhoRepository.save(pxk);
                    return ResponseEntity.ok(toDTO(pxk));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** Từ chối yêu cầu xuất: PENDING → CANCELLED. */
    @PutMapping("/{id}/reject")
    public ResponseEntity<?> reject(@PathVariable UUID id, @RequestBody(required = false) RejectRequest body) {
        return phieuXuatKhoRepository.findById(id)
                .map(pxk -> {
                    if (!"PENDING".equals(pxk.getTrangThai())) {
                        return ResponseEntity.badRequest().body(
                                new ErrorResponse("Chỉ từ chối phiếu ở trạng thái PENDING"));
                    }
                    UUID idNguoiDuyet = null;
                    if (body != null && body.idNguoiDuyet() != null && nhanVienRepository.existsById(body.idNguoiDuyet())) {
                        idNguoiDuyet = body.idNguoiDuyet();
                    } else {
                        idNguoiDuyet = nhanVienRepository.findAll().stream().findFirst().map(nv -> nv.getId()).orElse(null);
                    }
                    pxk.setTrangThai("CANCELLED");
                    pxk.setIdNguoiDuyet(idNguoiDuyet);
                    pxk.setGhiChu(body != null && body.lyDo() != null ? body.lyDo() : pxk.getGhiChu());
                    pxk.setNgayCapNhat(LocalDateTime.now());
                    phieuXuatKhoRepository.save(pxk);
                    return ResponseEntity.ok(toDTO(pxk));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    record ApproveRequest(java.util.UUID idNguoiDuyet) {}
    record RejectRequest(java.util.UUID idNguoiDuyet, String lyDo) {}
    record ErrorResponse(String message) {}

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
        private UUID idNguoiThucHien;
        private List<MoveLine> lines;
        public UUID getIdNguoiThucHien() { return idNguoiThucHien; }
        public void setIdNguoiThucHien(UUID v) { this.idNguoiThucHien = v; }
        public List<MoveLine> getLines() { return lines; }
        public void setLines(List<MoveLine> lines) { this.lines = lines; }
    }

    private UUID resolveStaffUuid(UUID candidate) {
        if (candidate != null && nhanVienRepository.existsById(candidate)) {
            return candidate;
        }
        return nhanVienRepository.findAll().stream().map(NhanVien::getId).findFirst().orElse(null);
    }

    /**
     * Bước 2: Thủ kho xác nhận XUẤT KHO — PENDING → SHIPPED (chờ nhận hàng).
     * Trừ tồn Kho Tổng + ghi thẻ kho TRANSFER_OUT cho từng dòng (qua hàm DB
     * dùng chung), snapshot giá vốn bình quân vào dòng chi tiết.
     */
    @PutMapping("/{id}/ship")
    @Transactional
    public ResponseEntity<?> ship(@PathVariable UUID id, @RequestBody(required = false) MoveRequest body) {
        return phieuXuatKhoRepository.findById(id).<ResponseEntity<?>>map(pxk -> {
            if (!"PENDING".equals(pxk.getTrangThai())) {
                return ResponseEntity.badRequest().body(
                        new ErrorResponse("Chỉ xác nhận xuất được phiếu ở trạng thái PENDING"));
            }
            List<ChiTietPhieuXuat> lines = chiTietPhieuXuatRepository.findByIdPhieuXuat(id);
            if (lines.isEmpty()) {
                return ResponseEntity.badRequest().body(
                        new ErrorResponse("Phiếu không có dòng chi tiết — không thể xuất"));
            }
            UUID idNguoiDuyet = resolveStaffUuid(body != null ? body.getIdNguoiThucHien() : null);
            if (idNguoiDuyet == null) {
                return ResponseEntity.badRequest().body(new ErrorResponse("Không tìm thấy nhân viên duyệt"));
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
                    return ResponseEntity.badRequest().body(new ErrorResponse(
                            "Số lượng xuất phải từ 0 đến số lượng yêu cầu"));
                }
                int ton = tonKhoRepository
                        .findByIdSanPhamAndIdChiNhanh(ct.getIdSanPham(), pxk.getIdChiNhanhXuat())
                        .map(t -> t.getSoLuongTon() == null ? 0 : t.getSoLuongTon())
                        .orElse(0);
                if (xuat > ton) {
                    return ResponseEntity.badRequest().body(new ErrorResponse(
                            "Không đủ tồn kho tại kho xuất (tồn " + ton + ", cần " + xuat + ")"));
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
    @Transactional
    public ResponseEntity<?> receive(@PathVariable UUID id, @RequestBody(required = false) MoveRequest body) {
        return phieuXuatKhoRepository.findById(id).<ResponseEntity<?>>map(pxk -> {
            if (!"SHIPPED".equals(pxk.getTrangThai())) {
                return ResponseEntity.badRequest().body(
                        new ErrorResponse("Chỉ xác nhận nhận được phiếu ở trạng thái SHIPPED (chờ nhận hàng)"));
            }
            List<ChiTietPhieuXuat> lines = chiTietPhieuXuatRepository.findByIdPhieuXuat(id);
            UUID idNguoiNhan = resolveStaffUuid(body != null ? body.getIdNguoiThucHien() : null);
            if (idNguoiNhan == null) {
                return ResponseEntity.badRequest().body(new ErrorResponse("Không tìm thấy nhân viên nhận"));
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
                    return ResponseEntity.badRequest().body(new ErrorResponse(
                            "Số lượng nhận phải từ 0 đến số lượng xuất"));
                }
                ct.setSoLuongNhan(nhan);
                chiTietPhieuXuatRepository.save(ct);

                if (nhan > 0) {
                    jdbcTemplate.query(
                            "SELECT fn_ghi_the_kho_va_dieu_chinh_ton(?::uuid, ?::uuid, ?::varchar, ?::integer, ?::numeric, ?::varchar, ?::varchar, ?::date, ?::text, NOW()::timestamp)",
                            rs -> { },
                            ct.getIdSanPham(), pxk.getIdChiNhanhNhan(), "TRANSFER_IN", nhan,
                            ct.getDonGiaVon() == null ? BigDecimal.ZERO : ct.getDonGiaVon(),
                            pxk.getMaPhieu(), "Hệ thống", ct.getHanSuDung(),
                            "Nhận hàng luân chuyển từ kho tổng: phiếu " + pxk.getMaPhieu());
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

    private PhieuXuatKhoDTO toDTO(PhieuXuatKho pxk) {
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
            chiNhanhRepository.findById(pxk.getIdChiNhanhXuat())
                    .ifPresent(cn -> dto.setTenChiNhanhXuat(cn.getTenChiNhanh()));
        }
        if (pxk.getIdChiNhanhNhan() != null) {
            chiNhanhRepository.findById(pxk.getIdChiNhanhNhan())
                    .ifPresent(cn -> dto.setTenChiNhanhNhan(cn.getTenChiNhanh()));
        }
        if (pxk.getIdNguoiTao() != null) {
            nhanVienRepository.findById(pxk.getIdNguoiTao())
                    .ifPresent(nv -> dto.setTenNguoiTao(nv.getHoTen()));
        }
        if (pxk.getIdNguoiDuyet() != null) {
            nhanVienRepository.findById(pxk.getIdNguoiDuyet())
                    .ifPresent(nv -> dto.setTenNguoiDuyet(nv.getHoTen()));
        }
        if (pxk.getIdNguoiNhan() != null) {
            nhanVienRepository.findById(pxk.getIdNguoiNhan())
                    .ifPresent(nv -> dto.setTenNguoiNhan(nv.getHoTen()));
        }

        return dto;
    }

    record SuccessResponse(String message) {}
}
