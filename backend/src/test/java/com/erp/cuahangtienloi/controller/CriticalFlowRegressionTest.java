package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.SoQuyDTO;
import com.erp.cuahangtienloi.entity.HoaDon;
import com.erp.cuahangtienloi.entity.SoQuy;
import com.erp.cuahangtienloi.repository.ChiNhanhRepository;
import com.erp.cuahangtienloi.repository.ChiTietHoaDonRepository;
import com.erp.cuahangtienloi.repository.HoaDonRepository;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import com.erp.cuahangtienloi.repository.SanPhamRepository;
import com.erp.cuahangtienloi.repository.SoQuyRepository;
import com.erp.cuahangtienloi.repository.TonKhoRepository;
import com.erp.cuahangtienloi.service.BranchAccessService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CriticalFlowRegressionTest {

    @Test
    void createsGlobalCapitalReceiptAndAddsRunningBalance() {
        SoQuyRepository soQuyRepository = mock(SoQuyRepository.class);
        ChiNhanhRepository chiNhanhRepository = mock(ChiNhanhRepository.class);
        NhanVienRepository nhanVienRepository = mock(NhanVienRepository.class);
        SoQuyController controller = new SoQuyController(
                soQuyRepository,
                chiNhanhRepository,
                nhanVienRepository,
                mock(BranchAccessService.class)
        );

        UUID creatorId = UUID.randomUUID();
        SoQuy request = new SoQuy();
        request.setIdChiNhanh(null);
        request.setIdNguoiTao(creatorId);
        request.setDirection("RECEIPT");
        request.setHangMuc("CAP_VON");
        request.setHinhThucTt("CARD");
        request.setSoTien(new BigDecimal("1000000"));

        when(nhanVienRepository.existsById(creatorId)).thenReturn(true);
        when(soQuyRepository.findByIdChiNhanh(null)).thenReturn(List.of());
        when(soQuyRepository.save(any(SoQuy.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = controller.create(request, mock(HttpServletRequest.class));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        SoQuyDTO body = (SoQuyDTO) response.getBody();
        assertEquals(new BigDecimal("1000000"), body.getRunningBalance());
        verify(chiNhanhRepository, never()).existsById(any());
    }

    @Test
    void invoiceAcceptsAllDatabasePaymentMethods() {
        ChiNhanhRepository chiNhanhRepository = mock(ChiNhanhRepository.class);
        HoaDonRepository hoaDonRepository = mock(HoaDonRepository.class);
        HoaDonController controller = new HoaDonController(
                hoaDonRepository,
                chiNhanhRepository,
                mock(NhanVienRepository.class),
                mock(ChiTietHoaDonRepository.class),
                mock(SanPhamRepository.class),
                mock(TonKhoRepository.class),
                mock(SoQuyRepository.class),
                mock(JdbcTemplate.class)
        );
        UUID branchId = UUID.randomUUID();
        when(chiNhanhRepository.existsById(branchId)).thenReturn(true);
        when(hoaDonRepository.save(any(HoaDon.class))).thenAnswer(invocation -> invocation.getArgument(0));

        for (String method : List.of("CASH", "CARD", "MOMO", "ZALOPAY", "VNPAY", "BANK_TRANSFER")) {
            HoaDon request = invoice(branchId, method, new BigDecimal("100000"));
            if ("CASH".equals(method)) {
                request.setTienKhachDua(new BigDecimal("100000"));
            }

            assertEquals(HttpStatus.OK, controller.create(request).getStatusCode(), method);
        }
    }

    @Test
    void onlyCashRequiresCustomerPaidToCoverTotal() {
        ChiNhanhRepository chiNhanhRepository = mock(ChiNhanhRepository.class);
        HoaDonController controller = new HoaDonController(
                mock(HoaDonRepository.class),
                chiNhanhRepository,
                mock(NhanVienRepository.class),
                mock(ChiTietHoaDonRepository.class),
                mock(SanPhamRepository.class),
                mock(TonKhoRepository.class),
                mock(SoQuyRepository.class),
                mock(JdbcTemplate.class)
        );
        UUID branchId = UUID.randomUUID();
        when(chiNhanhRepository.existsById(branchId)).thenReturn(true);

        HoaDon cashInvoice = invoice(branchId, "CASH", new BigDecimal("100000"));
        cashInvoice.setTienKhachDua(new BigDecimal("99999"));

        assertThrows(IllegalArgumentException.class, () -> controller.create(cashInvoice));
    }

    @Test
    void refundRejectsNonCompletedInvoice() {
        HoaDonRepository hoaDonRepository = mock(HoaDonRepository.class);
        HoaDonController controller = new HoaDonController(
                hoaDonRepository,
                mock(ChiNhanhRepository.class),
                mock(NhanVienRepository.class),
                mock(ChiTietHoaDonRepository.class),
                mock(SanPhamRepository.class),
                mock(TonKhoRepository.class),
                mock(SoQuyRepository.class),
                mock(JdbcTemplate.class)
        );
        UUID invoiceId = UUID.randomUUID();
        HoaDon hd = new HoaDon();
        hd.setId(invoiceId);
        hd.setTrangThai("CANCELLED");
        when(hoaDonRepository.findById(invoiceId)).thenReturn(java.util.Optional.of(hd));

        var response = controller.refund(invoiceId, new HoaDonController.RefundRequest(null), mock(HttpServletRequest.class));
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    private HoaDon invoice(UUID branchId, String method, BigDecimal total) {
        HoaDon request = new HoaDon();
        request.setIdChiNhanh(branchId);
        request.setHinhThucTt(method);
        request.setGrandTotal(total);
        return request;
    }
}
