package com.erp.cuahangtienloi.validation;

import com.erp.cuahangtienloi.dto.CreateSanPhamRequest;
import com.erp.cuahangtienloi.dto.CreateTaiKhoanRequest;
import com.erp.cuahangtienloi.dto.UpdateTaiKhoanRequest;
import com.erp.cuahangtienloi.controller.TaiKhoanController;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class InputValidationTest {
    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    @Test
    void productCreateRejectsMissingRequiredAndNegativeValues() {
        CreateSanPhamRequest request = new CreateSanPhamRequest();
        request.setIdDanhMuc(UUID.randomUUID());
        request.setSku(" ");
        request.setTenSanPham("");
        request.setGiaBan(BigDecimal.valueOf(-1));
        request.setVatPhantram(101);

        var messages = validator.validate(request).stream()
                .map(v -> v.getMessage())
                .toList();

        assertTrue(messages.contains("SKU không được để trống"));
        assertTrue(messages.contains("Tên sản phẩm không được để trống"));
        assertTrue(messages.contains("Giá bán phải lớn hơn hoặc bằng 0"));
        assertTrue(messages.contains("VAT phải từ 0 đến 100"));
    }

    @Test
    void accountCreateRejectsInvalidUsernameAndShortPassword() {
        CreateTaiKhoanRequest request = new CreateTaiKhoanRequest();
        request.setTenDangNhap("a b");
        request.setMatKhau("123");

        var violations = validator.validate(request);

        assertEquals(2, violations.size());
    }

    @Test
    void sharedValidatorRejectsInvalidBusinessValues() {
        assertThrows(IllegalArgumentException.class,
                () -> InputValidator.optionalPhone("123", "Số điện thoại"));
        assertThrows(IllegalArgumentException.class,
                () -> InputValidator.optionalEmail("email-sai"));
        assertThrows(IllegalArgumentException.class,
                () -> InputValidator.nonNegative(-1, "Số lượng"));
        assertThrows(IllegalArgumentException.class,
                () -> InputValidator.positive(BigDecimal.ZERO, "Số tiền"));
    }

    @Test
    void sharedBusinessConstantsMatchDatabaseConstraints() {
        assertEquals(
                Set.of("CASH", "CARD", "MOMO", "ZALOPAY", "VNPAY", "BANK_TRANSFER"),
                InputValidator.PAYMENT_METHODS
        );
        assertEquals(Set.of("RECEIPT", "PAYMENT"), InputValidator.CASH_DIRECTIONS);
    }

    @Test
    void changePasswordRejectsValuesShorterThanEightCharacters() {
        var request = new TaiKhoanController.ChangePasswordRequest("current-password", "123456");

        var messages = validator.validate(request).stream()
                .map(v -> v.getMessage())
                .toList();

        assertTrue(messages.contains("Mật khẩu mới phải từ 8 đến 100 ký tự"));
    }

    @Test
    void accountCreateAndUpdateUseTheSameEightCharacterPasswordPolicy() {
        CreateTaiKhoanRequest createRequest = new CreateTaiKhoanRequest();
        createRequest.setTenDangNhap("valid_user");
        createRequest.setMatKhau("1234567");
        UpdateTaiKhoanRequest updateRequest = new UpdateTaiKhoanRequest();
        updateRequest.setMatKhau("1234567");

        assertTrue(validator.validate(createRequest).stream()
                .anyMatch(v -> "Mật khẩu phải từ 8 đến 100 ký tự".equals(v.getMessage())));
        assertTrue(validator.validate(updateRequest).stream()
                .anyMatch(v -> "Mật khẩu phải từ 8 đến 100 ký tự".equals(v.getMessage())));
    }
}
