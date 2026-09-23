package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.LoHangDTO;
import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.service.BranchAccessService;
import com.erp.cuahangtienloi.service.LoHangService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/lo-hang")
@RequiredArgsConstructor
public class LoHangController {

    private final LoHangService loHangService;
    private final BranchAccessService branchAccessService;

    @GetMapping("/by-product/{idSanPham}/{idChiNhanh}")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY', 'KE_TOAN')")
    public ResponseEntity<List<LoHangDTO>> getLotsByProduct(
            @PathVariable UUID idSanPham,
            @PathVariable UUID idChiNhanh,
            HttpServletRequest request) {
        branchAccessService.requireReadableBranch(branchAccessService.requireAuthenticatedEmployee(request), idChiNhanh);
        List<LoHangDTO> list = loHangService.getDanhSachLoHang(idChiNhanh, idSanPham);
        return ResponseEntity.ok(list);
    }

    @PostMapping("/{id}/dispose")
    @PreAuthorize("hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')")
    public ResponseEntity<?> disposeLot(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body,
            HttpServletRequest request) {
        NhanVien employee = branchAccessService.requireAuthenticatedEmployee(request);
        String lyDo = (body != null && body.containsKey("lyDo")) ? body.get("lyDo") : "Hết hạn sử dụng";
        String performer = employee.getHoTen() + " (" + employee.getMaNhanVien() + ")";

        try {
            loHangService.huyLoHang(id, performer, lyDo);
            return ResponseEntity.ok(ApiResponse.ok("Huỷ lô hàng và cân bằng kho thành công"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.err(e.getMessage()));
        }
    }
}
