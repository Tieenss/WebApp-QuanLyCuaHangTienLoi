package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.dto.TheKhoDTO;
import com.erp.cuahangtienloi.entity.TheKho;
import com.erp.cuahangtienloi.repository.*;
import com.erp.cuahangtienloi.service.BranchAccessService;
import jakarta.servlet.http.HttpServletRequest;
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

import static com.erp.cuahangtienloi.validation.InputValidator.*;

@RestController
@RequestMapping("/api/the-kho")
@RequiredArgsConstructor
//@CrossOrigin(origins = "*")
public class TheKhoController {

    private final TheKhoRepository theKhoRepository;
    private final SanPhamRepository sanPhamRepository;
    private final ChiNhanhRepository chiNhanhRepository;
    private final BranchAccessService branchAccessService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<List<TheKhoDTO>> getAll(HttpServletRequest request) {
        var employee = branchAccessService.requireAuthenticatedEmployee(request);
        List<TheKho> source = branchAccessService.isSystemWide(employee)
                ? theKhoRepository.findAll()
                : theKhoRepository.findByIdChiNhanhOrderByNgayPhatSinhDesc(
                        branchAccessService.requiredOwnBranch(employee));
        List<TheKhoDTO> list = source.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> getById(@PathVariable UUID id, HttpServletRequest request) {
        return theKhoRepository.findById(id)
                .map(tk -> {
                    branchAccessService.requireReadableBranch(
                            branchAccessService.requireAuthenticatedEmployee(request), tk.getIdChiNhanh());
                    return ResponseEntity.ok(toDTO(tk));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-product/{idSanPham}/branch/{idChiNhanh}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<List<TheKhoDTO>> getByProductAndBranch(
            @PathVariable UUID idSanPham, @PathVariable UUID idChiNhanh, HttpServletRequest request) {
        branchAccessService.requireReadableBranch(branchAccessService.requireAuthenticatedEmployee(request), idChiNhanh);
        List<TheKhoDTO> list = theKhoRepository
                .findByIdSanPhamAndIdChiNhanhOrderByNgayPhatSinhDesc(idSanPham, idChiNhanh).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-branch/{idChiNhanh}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<List<TheKhoDTO>> getByBranch(@PathVariable UUID idChiNhanh,
                                                        HttpServletRequest request) {
        branchAccessService.requireReadableBranch(branchAccessService.requireAuthenticatedEmployee(request), idChiNhanh);
        List<TheKhoDTO> list = theKhoRepository.findByIdChiNhanhOrderByNgayPhatSinhDesc(idChiNhanh).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-type/{loaiGiaoDich}/branch/{idChiNhanh}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<List<TheKhoDTO>> getByTypeAndBranch(
            @PathVariable String loaiGiaoDich, @PathVariable UUID idChiNhanh, HttpServletRequest request) {
        branchAccessService.requireReadableBranch(branchAccessService.requireAuthenticatedEmployee(request), idChiNhanh);
        List<TheKhoDTO> list = theKhoRepository
                .findByLoaiGiaoDichAndIdChiNhanhOrderByNgayPhatSinhDesc(loaiGiaoDich, idChiNhanh).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/by-branch/{idChiNhanh}/from/{from}/to/{to}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<List<TheKhoDTO>> getByBranchAndDateRange(
            @PathVariable UUID idChiNhanh,
            @PathVariable LocalDateTime from,
            @PathVariable LocalDateTime to,
            HttpServletRequest request) {
        branchAccessService.requireReadableBranch(branchAccessService.requireAuthenticatedEmployee(request), idChiNhanh);
        List<TheKhoDTO> list = theKhoRepository
                .findByIdChiNhanhAndNgayPhatSinhBetweenOrderByNgayPhatSinhDesc(idChiNhanh, from, to).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> create(@RequestBody TheKho request) {
        return ResponseEntity.badRequest().body(ApiResponse.err(
                "Không được tạo trực tiếp thẻ kho. Hãy thực hiện qua giao dịch nhập kho, bán hàng hoặc kiểm kê."));
    }

    private TheKhoDTO toDTO(TheKho tk) {
        TheKhoDTO dto = new TheKhoDTO();
        dto.setId(tk.getId());
        dto.setNgayPhatSinh(tk.getNgayPhatSinh());
        dto.setIdSanPham(tk.getIdSanPham());
        dto.setIdChiNhanh(tk.getIdChiNhanh());
        dto.setLoaiGiaoDich(tk.getLoaiGiaoDich());
        dto.setSoLuong(tk.getSoLuong());
        dto.setDonGia(tk.getDonGia());
        dto.setThanhTien(tk.getThanhTien());
        dto.setTonTruoc(tk.getTonTruoc());
        dto.setTonSau(tk.getTonSau());
        dto.setMaChungTu(tk.getMaChungTu());
        dto.setNguoiThucHien(tk.getNguoiThucHien());
        dto.setHanSuDung(tk.getHanSuDung());
        dto.setGhiChu(tk.getGhiChu());

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

//    record SuccessResponse(String message) {}
}
