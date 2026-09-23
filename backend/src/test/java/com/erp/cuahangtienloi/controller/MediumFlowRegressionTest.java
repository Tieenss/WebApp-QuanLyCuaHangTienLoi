package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.UpdateSanPhamRequest;
import com.erp.cuahangtienloi.entity.ChiTietKiemKe;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.entity.SanPham;
import com.erp.cuahangtienloi.repository.ChiNhanhRepository;
import com.erp.cuahangtienloi.repository.DanhMucRepository;
import com.erp.cuahangtienloi.repository.NhaCungCapRepository;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import com.erp.cuahangtienloi.repository.SanPhamRepository;
import com.erp.cuahangtienloi.repository.TaiKhoanRepository;
import com.erp.cuahangtienloi.service.BranchAccessService;
import com.erp.cuahangtienloi.service.BranchProductStatusService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.reflect.Method;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MediumFlowRegressionTest {
    private static final String STOCKTAKE_WRITE_ROLES =
            "hasAnyRole('ADMIN', 'THU_KHO', 'QUAN_LY')";

    @Test
    void productPartialUpdateHandlesLegacyNullStockLimits() {
        SanPhamRepository sanPhamRepository = mock(SanPhamRepository.class);
        SanPhamController controller = new SanPhamController(
                sanPhamRepository,
                mock(DanhMucRepository.class),
                mock(NhaCungCapRepository.class),
                mock(BranchAccessService.class),
                mock(BranchProductStatusService.class)
        );
        UUID productId = UUID.randomUUID();
        SanPham product = new SanPham();
        product.setId(productId);
        product.setTenSanPham("Bánh mì");
        product.setTonToiThieu(null);
        product.setTonToiDa(null);
        UpdateSanPhamRequest request = new UpdateSanPhamRequest();
        request.setTenSanPham("Bánh mì mới");

        when(sanPhamRepository.findById(productId)).thenReturn(Optional.of(product));
        when(sanPhamRepository.save(any(SanPham.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = controller.update(productId, request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(sanPhamRepository).save(product);
    }

    @Test
    void profileOnlyUpdateDoesNotRevalidateUntouchedLegacyBranch() {
        NhanVienRepository nhanVienRepository = mock(NhanVienRepository.class);
        NhanVienController controller = new NhanVienController(
                nhanVienRepository,
                mock(ChiNhanhRepository.class),
                mock(TaiKhoanRepository.class),
                mock(BranchAccessService.class)
        );
        UUID employeeId = UUID.randomUUID();
        NhanVien employee = new NhanVien();
        employee.setId(employeeId);
        employee.setVaiTro("THU_NGAN");
        employee.setIdChiNhanh(null);
        NhanVien request = new NhanVien();
        request.setEmail("new_email@gmail.com");
        request.setLuongCung(8_000_000);

        when(nhanVienRepository.findById(employeeId)).thenReturn(Optional.of(employee));
        when(nhanVienRepository.findByEmail(request.getEmail())).thenReturn(Optional.empty());
        when(nhanVienRepository.save(any(NhanVien.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = controller.update(employeeId, request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(nhanVienRepository).save(employee);
    }

    @Test
    void changingToOperationalRoleStillRequiresBranch() {
        NhanVienRepository nhanVienRepository = mock(NhanVienRepository.class);
        NhanVienController controller = new NhanVienController(
                nhanVienRepository,
                mock(ChiNhanhRepository.class),
                mock(TaiKhoanRepository.class),
                mock(BranchAccessService.class)
        );
        UUID employeeId = UUID.randomUUID();
        NhanVien employee = new NhanVien();
        employee.setId(employeeId);
        employee.setVaiTro("ADMIN");
        employee.setIdChiNhanh(null);
        NhanVien request = new NhanVien();
        request.setVaiTro("THU_NGAN");

        when(nhanVienRepository.findById(employeeId)).thenReturn(Optional.of(employee));

        var response = controller.update(employeeId, request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void stocktakeWriteEndpointsDeclareRolesExplicitly() throws NoSuchMethodException {
        List<Method> writeMethods = List.of(
                ChiTietKiemKeController.class.getDeclaredMethod("create", ChiTietKiemKe.class),
                ChiTietKiemKeController.class.getDeclaredMethod("createBatch", List.class),
                ChiTietKiemKeController.class.getDeclaredMethod("delete", UUID.class),
                ChiTietKiemKeController.class.getDeclaredMethod("deleteByPhieuKiemKe", UUID.class)
        );

        for (Method method : writeMethods) {
            assertEquals(STOCKTAKE_WRITE_ROLES, method.getAnnotation(PreAuthorize.class).value());
        }
    }
}
