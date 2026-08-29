package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.PhanHoiChiNhanh;
import com.erp.cuahangtienloi.dto.YeuCauChiNhanh;
import com.erp.cuahangtienloi.entity.enums.VaiTro;
import com.erp.cuahangtienloi.security.YeuCauVaiTro;
import com.erp.cuahangtienloi.service.DichVuChiNhanh;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chi-nhanh")
public class BoDieuKhienChiNhanh {

    private final DichVuChiNhanh dichVuChiNhanh;

    public BoDieuKhienChiNhanh(DichVuChiNhanh dichVuChiNhanh) {
        this.dichVuChiNhanh = dichVuChiNhanh;
    }

    /**
     * Lấy danh sách toàn bộ chi nhánh.
     * Người dùng thường xem được chi nhánh active, Admin xem được hết.
     */
    @GetMapping
    public ResponseEntity<List<PhanHoiChiNhanh>> layDanhSach() {
        return ResponseEntity.ok(dichVuChiNhanh.layDanhSachTatCa());
    }

    /**
     * Xem thông tin chi tiết một chi nhánh.
     */
    @GetMapping("/{id}")
    public ResponseEntity<PhanHoiChiNhanh> layChiTiet(@PathVariable UUID id) {
        return ResponseEntity.ok(dichVuChiNhanh.layChiTiet(id));
    }

    /**
     * Tạo mới chi nhánh. Chỉ ADMIN được phép.
     */
    @PostMapping
    @YeuCauVaiTro(VaiTro.ADMIN)
    public ResponseEntity<PhanHoiChiNhanh> taoMoi(@RequestBody YeuCauChiNhanh request) {
        return ResponseEntity.ok(dichVuChiNhanh.taoMoi(request));
    }

    /**
     * Cập nhật thông tin chi nhánh. Chỉ ADMIN được phép.
     */
    @PutMapping("/{id}")
    @YeuCauVaiTro(VaiTro.ADMIN)
    public ResponseEntity<PhanHoiChiNhanh> capNhat(@PathVariable UUID id, @RequestBody YeuCauChiNhanh request) {
        return ResponseEntity.ok(dichVuChiNhanh.capNhat(id, request));
    }

    /**
     * Khóa (vô hiệu hóa) chi nhánh. Chỉ ADMIN được phép.
     */
    @DeleteMapping("/{id}")
    @YeuCauVaiTro(VaiTro.ADMIN)
    public ResponseEntity<Void> voHieuHoa(@PathVariable UUID id) {
        dichVuChiNhanh.voHieuHoa(id);
        return ResponseEntity.noContent().build();
    }
}
