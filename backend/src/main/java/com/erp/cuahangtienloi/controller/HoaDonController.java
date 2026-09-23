package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.HoaDonDTO;
import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.entity.HoaDon;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import com.erp.cuahangtienloi.service.HoaDonService;
import com.erp.cuahangtienloi.service.HoaDonService.CheckoutRequest;
import com.erp.cuahangtienloi.service.HoaDonService.CreateSaleRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/hoa-don")
@RequiredArgsConstructor
public class HoaDonController {

    private final HoaDonService hoaDonService;
    private final NhanVienRepository nhanVienRepository;

    private UUID resolveAuthenticatedIdNhanVien(HttpServletRequest request) {
        Object attr = request.getAttribute("authenticatedIdNhanVien");
        if (attr instanceof String value) {
            try {
                return UUID.fromString(value);
            } catch (IllegalArgumentException ignored) {}
        }
        return null;
    }

    private NhanVien requireAuthenticatedEmployee(HttpServletRequest request) {
        UUID employeeId = resolveAuthenticatedIdNhanVien(request);
        if (employeeId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tài khoản chưa liên kết nhân viên");
        }
        return nhanVienRepository.findById(employeeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Nhân viên đăng nhập không tồn tại"));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY', 'THU_NGAN')")
    public ResponseEntity<List<HoaDonDTO>> getAll(HttpServletRequest request) {
        return ResponseEntity.ok(hoaDonService.getAll(requireAuthenticatedEmployee(request)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY', 'THU_NGAN')")
    public ResponseEntity<?> getById(@PathVariable UUID id, HttpServletRequest request) {
        return hoaDonService.getById(id, requireAuthenticatedEmployee(request))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-branch/{idChiNhanh}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY', 'THU_NGAN')")
    public ResponseEntity<List<HoaDonDTO>> getByChiNhanh(@PathVariable UUID idChiNhanh, HttpServletRequest request) {
        return ResponseEntity.ok(hoaDonService.getByChiNhanh(idChiNhanh, requireAuthenticatedEmployee(request)));
    }

    @GetMapping("/by-cashier/{idThuNgan}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY', 'THU_NGAN')")
    public ResponseEntity<List<HoaDonDTO>> getByThuNgan(@PathVariable UUID idThuNgan, HttpServletRequest request) {
        return ResponseEntity.ok(hoaDonService.getByThuNgan(idThuNgan, requireAuthenticatedEmployee(request)));
    }

    @GetMapping("/by-status/{trangThai}")
    @PreAuthorize("hasAnyRole('ADMIN', 'KE_TOAN', 'QUAN_LY', 'THU_NGAN')")
    public ResponseEntity<List<HoaDonDTO>> getByStatus(@PathVariable String trangThai, HttpServletRequest request) {
        return ResponseEntity.ok(hoaDonService.getByStatus(trangThai, requireAuthenticatedEmployee(request)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY', 'THU_NGAN')")
    public ResponseEntity<?> create(@RequestBody HoaDon request) {
        return ResponseEntity.ok(hoaDonService.create(request));
    }

    @PostMapping("/with-lines")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY', 'THU_NGAN')")
    public ResponseEntity<?> createWithLines(@Valid @RequestBody CreateSaleRequest request, HttpServletRequest httpRequest) {
        UUID authenticatedCashierId = resolveAuthenticatedIdNhanVien(httpRequest);
        return ResponseEntity.ok(hoaDonService.createWithLines(request, authenticatedCashierId));
    }

    @PostMapping("/checkout")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY', 'THU_NGAN')")
    public ResponseEntity<?> checkout(@Valid @RequestBody CheckoutRequest request, HttpServletRequest httpRequest) {
        UUID cashierId = resolveAuthenticatedIdNhanVien(httpRequest);
        if (cashierId == null) {
            return ResponseEntity.status(401).body(ApiResponse.err("Không xác định được nhân viên đăng nhập"));
        }
        NhanVien cashier = nhanVienRepository.findById(cashierId).orElseThrow();
        HoaDonDTO created = hoaDonService.checkout(request, cashierId, cashier);
        return ResponseEntity.status(201).body(created);
    }

    public record RefundRequest(String lyDoHoan) {}

    @PostMapping("/{id}/refund")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY', 'THU_NGAN')")
    @Transactional
    public ResponseEntity<?> refund(@PathVariable UUID id,
                                   @RequestBody(required = false) RefundRequest body,
                                   HttpServletRequest httpRequest) {
        HoaDon hd = hoaDonRepository.findById(id).orElse(null);
        if (hd == null) {
            return ResponseEntity.notFound().build();
        }
        if (!"COMPLETED".equals(hd.getTrangThai())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Chỉ hoàn tiền được hoá đơn ở trạng thái COMPLETED"));
        }

        NhanVien actor = requireAuthenticatedEmployee(httpRequest);
        if ("QUAN_LY".equals(actor.getVaiTro()) || "THU_NGAN".equals(actor.getVaiTro())) {
            if (actor.getIdChiNhanh() != null && !actor.getIdChiNhanh().equals(hd.getIdChiNhanh())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.err("Không thể hoàn hoá đơn khác chi nhánh"));
            }
        }

        String lyDo = (body != null && body.lyDoHoan() != null && !body.lyDoHoan().trim().isEmpty())
                ? body.lyDoHoan().trim()
                : "Khách trả hàng hoàn tiền";

        String nguoiThucHien = (actor.getHoTen() != null && !actor.getHoTen().trim().isEmpty())
                ? actor.getHoTen()
                : "Hệ thống";

        jdbcTemplate.query(
                "SELECT fn_hoan_hoa_don(?::uuid, ?::uuid, ?::text, ?::varchar)",
                rs -> { }, hd.getId(), actor.getId(), lyDo, nguoiThucHien
        );

        hd.setTrangThai("REFUNDED");
        hd.setIdNguoiHoan(actor.getId());
        hd.setNgayHoan(LocalDateTime.now());
        hd.setLyDoHoan(lyDo);
        hd.setNgayCapNhat(LocalDateTime.now());

        return ResponseEntity.ok(toDTO(hd));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY', 'THU_NGAN')")
    @Transactional
    public ResponseEntity<?> cancel(@PathVariable UUID id,
                                   @RequestBody(required = false) RefundRequest body,
                                   HttpServletRequest httpRequest) {
        HoaDon hd = hoaDonRepository.findById(id).orElse(null);
        if (hd == null) {
            return ResponseEntity.notFound().build();
        }
        if (!"COMPLETED".equals(hd.getTrangThai())) {
            return ResponseEntity.badRequest().body(ApiResponse.err("Chỉ huỷ được hoá đơn ở trạng thái COMPLETED"));
        }

        NhanVien actor = requireAuthenticatedEmployee(httpRequest);
        if ("QUAN_LY".equals(actor.getVaiTro()) || "THU_NGAN".equals(actor.getVaiTro())) {
            if (actor.getIdChiNhanh() != null && !actor.getIdChiNhanh().equals(hd.getIdChiNhanh())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.err("Không thể huỷ hoá đơn khác chi nhánh"));
            }
        }

        String lyDo = (body != null && body.lyDoHoan() != null && !body.lyDoHoan().trim().isEmpty())
                ? body.lyDoHoan().trim()
                : "Huỷ đơn hàng";

        String nguoiThucHien = (actor.getHoTen() != null && !actor.getHoTen().trim().isEmpty())
                ? actor.getHoTen()
                : "Hệ thống";

        hd.setTrangThai("CANCELLED");
        hd.setIdNguoiHoan(actor.getId());
        hd.setNgayHoan(LocalDateTime.now());
        hd.setLyDoHoan(lyDo);
        hd.setNgayCapNhat(LocalDateTime.now());
        hoaDonRepository.saveAndFlush(hd);

        List<ChiTietHoaDon> lines = chiTietHoaDonRepository.findByIdHoaDon(id);
        for (ChiTietHoaDon line : lines) {
            jdbcTemplate.query(
                    "SELECT fn_ghi_the_kho_va_dieu_chinh_ton(?::uuid, ?::uuid, 'SALE_RETURN'::varchar, ?::integer, ?::numeric, ?::varchar, ?::varchar, NULL::date, ?::text, NOW()::timestamp)",
                    rs -> { }, line.getIdSanPham(), hd.getIdChiNhanh(), line.getSoLuong(), line.getDonGiaVon(),
                    hd.getMaHoaDon(), nguoiThucHien, "Huỷ đơn hàng: " + hd.getMaHoaDon());
        }

        return ResponseEntity.ok(toDTO(hd));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'QUAN_LY', 'THU_NGAN')")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody HoaDon request) {
        return hoaDonService.update(id, request)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        if (hoaDonService.delete(id)) {
            return ResponseEntity.ok(ApiResponse.ok("Xóa hóa đơn thành công"));
        }
        return ResponseEntity.notFound().build();
    }
}
