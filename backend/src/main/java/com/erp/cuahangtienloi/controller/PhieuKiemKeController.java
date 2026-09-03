package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.PhieuKiemKeDTO;
import com.erp.cuahangtienloi.entity.ChiTietKiemKe;
import com.erp.cuahangtienloi.entity.PhieuKiemKe;
import com.erp.cuahangtienloi.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/phieu-kiem-ke")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PhieuKiemKeController {

    private final PhieuKiemKeRepository phieuKiemKeRepository;
    private final ChiNhanhRepository chiNhanhRepository;
    private final NhanVienRepository nhanVienRepository;
    private final ChiTietKiemKeRepository chiTietKiemKeRepository;

    @GetMapping
    public ResponseEntity<List<PhieuKiemKeDTO>> getAll() {
        List<PhieuKiemKeDTO> list = phieuKiemKeRepository.findAll().stream()
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable UUID id) {
        return phieuKiemKeRepository.findById(id)
                .map(hd -> ResponseEntity.ok(toDTO(hd)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-branch/{idChiNhanh}")
    public ResponseEntity<List<PhieuKiemKeDTO>> getByChiNhanh(@PathVariable UUID idChiNhanh) {
        List<PhieuKiemKeDTO> list = phieuKiemKeRepository.findByIdChiNhanh(idChiNhanh).stream()
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-status/{trangThai}")
    public ResponseEntity<List<PhieuKiemKeDTO>> getByStatus(@PathVariable String trangThai) {
        List<PhieuKiemKeDTO> list = phieuKiemKeRepository.findByTrangThai(trangThai).stream()
                .map(this::toDTO)
                .toList();
        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody PhieuKiemKe request) {
        PhieuKiemKe pkk = new PhieuKiemKe();
        pkk.setId(UUID.randomUUID());
        // Sinh mã ở Java để response trả về đúng mã ngay, tránh Hibernate
        // không đọc lại giá trị do DB trigger gán.
        pkk.setMaPhieu(sinhMaPhieuKiemKe(
                request.getNgayKiemKe() != null ? request.getNgayKiemKe() : LocalDate.now()));
        pkk.setIdChiNhanh(request.getIdChiNhanh());
        java.util.UUID idNguoiTao = request.getIdNguoiTao();
        if (idNguoiTao == null || !nhanVienRepository.existsById(idNguoiTao)) {
            idNguoiTao = nhanVienRepository.findAll().stream()
                    .findFirst()
                    .map(nv -> nv.getId())
                    .orElse(null);
        }
        pkk.setIdNguoiTao(idNguoiTao);
        pkk.setIdNguoiDuyet(request.getIdNguoiDuyet());
        pkk.setNgayKiemKe(request.getNgayKiemKe() != null ? request.getNgayKiemKe() : LocalDate.now());
        pkk.setNgayCanBang(request.getNgayCanBang());
        pkk.setTrangThai(request.getTrangThai() != null ? request.getTrangThai() : "DANG_KIEM_KE");
        pkk.setGhiChu(request.getGhiChu());
        pkk.setNgayTao(LocalDateTime.now());
        pkk.setNgayCapNhat(LocalDateTime.now());

        PhieuKiemKe created = phieuKiemKeRepository.saveAndFlush(pkk);
        return ResponseEntity.ok(toDTO(created));
    }

    /**
     * Sinh mã phiếu kiểm kê dạng KK-YYYYMMDD-NNN. Sinh ở Java thay vì phụ
     * thuộc DB trigger để response API có mã ngay lập tức (Hibernate không
     * tự đọc lại field do trigger gán sau save).
     */
    private String sinhMaPhieuKiemKe(LocalDate ngay) {
        String dateStr = ngay.format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        long count = phieuKiemKeRepository.findAll().stream()
                .filter(p -> p.getMaPhieu() != null && p.getMaPhieu().startsWith("KK-" + dateStr + "-"))
                .count();
        return "KK-" + dateStr + "-" + String.format("%03d", count + 1);
    }

    /**
     * Tạo phiếu kiểm kê kèm toàn bộ dòng chi tiết trong MỘT transaction.
     * Tránh tình trạng phiếu header được tạo nhưng dòng chi tiết lỗi →
     * phiếu mồ côi trong DB.
     */
    @PostMapping("/with-lines")
    @Transactional
    public ResponseEntity<?> createWithLines(@RequestBody CreateStocktakeRequest request) {
        if (request.getIdChiNhanh() == null) {
            return ResponseEntity.badRequest().body(new SuccessResponse("Thiếu chi nhánh"));
        }
        if (request.getLines() == null || request.getLines().isEmpty()) {
            return ResponseEntity.badRequest().body(new SuccessResponse("Thiếu danh sách sản phẩm kiểm kê"));
        }

        // 1. Tạo header
        PhieuKiemKe pkk = new PhieuKiemKe();
        pkk.setId(UUID.randomUUID());
        pkk.setMaPhieu(null); // trigger DB tự sinh mã KK-YYYYMMDD-NNN
        pkk.setIdChiNhanh(request.getIdChiNhanh());
        UUID idNguoiTao = request.getIdNguoiTao();
        if (idNguoiTao == null || !nhanVienRepository.existsById(idNguoiTao)) {
            idNguoiTao = nhanVienRepository.findAll().stream()
                    .findFirst()
                    .map(nv -> nv.getId())
                    .orElse(null);
        }
        pkk.setIdNguoiTao(idNguoiTao);
        pkk.setNgayKiemKe(request.getNgayKiemKe() != null ? request.getNgayKiemKe() : LocalDate.now());
        pkk.setTrangThai("DANG_KIEM_KE");
        pkk.setGhiChu(request.getGhiChu());
        pkk.setNgayTao(LocalDateTime.now());
        pkk.setNgayCapNhat(LocalDateTime.now());
        pkk.setMaPhieu(sinhMaPhieuKiemKe(pkk.getNgayKiemKe()));
        PhieuKiemKe savedHeader = phieuKiemKeRepository.saveAndFlush(pkk);

        // 2. Tạo các dòng chi tiết
        List<ChiTietKiemKe> lines = new ArrayList<>();
        for (ChiTietKiemKe line : request.getLines()) {
            ChiTietKiemKe ct = new ChiTietKiemKe();
            ct.setId(UUID.randomUUID());
            ct.setIdPhieuKiemKe(savedHeader.getId());
            ct.setIdSanPham(line.getIdSanPham());
            ct.setTonHeThong(line.getTonHeThong());
            ct.setTonThucTe(line.getTonThucTe());
            ct.setSoLuongLech(line.getSoLuongLech());
            ct.setLyDoLech(line.getLyDoLech());
            ct.setDonGiaVon(line.getDonGiaVon());
            ct.setGiaTriLech(line.getGiaTriLech());
            ct.setNgayTao(LocalDateTime.now());
            lines.add(ct);
        }
        chiTietKiemKeRepository.saveAll(lines);
        chiTietKiemKeRepository.flush();

        return ResponseEntity.ok(toDTO(savedHeader));
    }

    /** Request body cho /with-lines: header + danh sách dòng chi tiết. */
    public static class CreateStocktakeRequest {
        private UUID idChiNhanh;
        private UUID idNguoiTao;
        private LocalDate ngayKiemKe;
        private String ghiChu;
        private List<ChiTietKiemKe> lines;

        public UUID getIdChiNhanh() { return idChiNhanh; }
        public void setIdChiNhanh(UUID idChiNhanh) { this.idChiNhanh = idChiNhanh; }
        public UUID getIdNguoiTao() { return idNguoiTao; }
        public void setIdNguoiTao(UUID idNguoiTao) { this.idNguoiTao = idNguoiTao; }
        public LocalDate getNgayKiemKe() { return ngayKiemKe; }
        public void setNgayKiemKe(LocalDate ngayKiemKe) { this.ngayKiemKe = ngayKiemKe; }
        public String getGhiChu() { return ghiChu; }
        public void setGhiChu(String ghiChu) { this.ghiChu = ghiChu; }
        public List<ChiTietKiemKe> getLines() { return lines; }
        public void setLines(List<ChiTietKiemKe> lines) { this.lines = lines; }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody PhieuKiemKe request) {
        return phieuKiemKeRepository.findById(id)
                .map(pkk -> {
                    if (request.getMaPhieu() != null) pkk.setMaPhieu(request.getMaPhieu());
                    if (request.getIdChiNhanh() != null) pkk.setIdChiNhanh(request.getIdChiNhanh());
                    if (request.getIdNguoiDuyet() != null) pkk.setIdNguoiDuyet(request.getIdNguoiDuyet());
                    if (request.getNgayCanBang() != null) pkk.setNgayCanBang(request.getNgayCanBang());
                    if (request.getTrangThai() != null) pkk.setTrangThai(request.getTrangThai());
                    if (request.getGhiChu() != null) pkk.setGhiChu(request.getGhiChu());
                    pkk.setNgayCapNhat(LocalDateTime.now());
                    phieuKiemKeRepository.save(pkk);
                    return ResponseEntity.ok(toDTO(pkk));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (phieuKiemKeRepository.existsById(id)) {
            phieuKiemKeRepository.deleteById(id);
            return ResponseEntity.ok(new SuccessResponse("Xóa phiếu kiểm kê thành công"));
        }
        return ResponseEntity.notFound().build();
    }

    private PhieuKiemKeDTO toDTO(PhieuKiemKe pkk) {
        PhieuKiemKeDTO dto = new PhieuKiemKeDTO();
        dto.setId(pkk.getId());
        dto.setMaPhieu(pkk.getMaPhieu());
        dto.setIdChiNhanh(pkk.getIdChiNhanh());
        dto.setIdNguoiTao(pkk.getIdNguoiTao());
        dto.setIdNguoiDuyet(pkk.getIdNguoiDuyet());
        dto.setNgayKiemKe(pkk.getNgayKiemKe());
        dto.setNgayCanBang(pkk.getNgayCanBang());
        dto.setTrangThai(pkk.getTrangThai());
        dto.setGhiChu(pkk.getGhiChu());

        if (pkk.getIdChiNhanh() != null) {
            chiNhanhRepository.findById(pkk.getIdChiNhanh())
                    .ifPresent(cn -> dto.setTenChiNhanh(cn.getTenChiNhanh()));
        }
        if (pkk.getIdNguoiTao() != null) {
            nhanVienRepository.findById(pkk.getIdNguoiTao())
                    .ifPresent(nv -> dto.setTenNguoiTao(nv.getHoTen()));
        }
        if (pkk.getIdNguoiDuyet() != null) {
            nhanVienRepository.findById(pkk.getIdNguoiDuyet())
                    .ifPresent(nv -> dto.setTenNguoiDuyet(nv.getHoTen()));
        }

        return dto;
    }

    record SuccessResponse(String message) {}
}
