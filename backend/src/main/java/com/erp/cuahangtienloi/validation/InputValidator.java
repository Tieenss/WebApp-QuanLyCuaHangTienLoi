package com.erp.cuahangtienloi.validation;

import java.math.BigDecimal;
import java.util.Set;
import java.util.regex.Pattern;

/** Các kiểm tra đầu vào dùng chung cho controller đang nhận entity trực tiếp. */
public final class InputValidator {
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final Pattern PHONE = Pattern.compile("^0\\d{9,10}$");

    /** 6 phương thức TT — khớp CHECK constraint so_quy.hinh_thuc_tt & hoa_don.hinh_thuc_tt. */
    public static final Set<String> PAYMENT_METHODS =
            Set.of("CASH", "CARD", "MOMO", "ZALOPAY", "VNPAY", "BANK_TRANSFER");

    /** Chiều phiếu quỹ — khớp CHECK so_quy.direction. */
    public static final Set<String> CASH_DIRECTIONS = Set.of("RECEIPT", "PAYMENT");

    private InputValidator() {}

    public static String requireText(String value, String fieldName, int min, int max) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " không được để trống");
        }
        String normalized = value.trim();
        if (normalized.length() < min || normalized.length() > max) {
            throw new IllegalArgumentException(fieldName + " phải từ " + min + " đến " + max + " ký tự");
        }
        return normalized;
    }

    public static void optionalPhone(String value, String fieldName) {
        if (value != null && !value.isBlank() && !PHONE.matcher(value.trim()).matches()) {
            throw new IllegalArgumentException(fieldName + " không hợp lệ");
        }
    }

    public static void optionalEmail(String value) {
        if (value != null && !value.isBlank() && !EMAIL.matcher(value.trim()).matches()) {
            throw new IllegalArgumentException("Email không đúng định dạng");
        }
    }

    public static void nonNegative(Number value, String fieldName) {
        if (value != null && new BigDecimal(value.toString()).signum() < 0) {
            throw new IllegalArgumentException(fieldName + " phải lớn hơn hoặc bằng 0");
        }
    }

    public static void positive(Number value, String fieldName) {
        if (value == null || new BigDecimal(value.toString()).signum() <= 0) {
            throw new IllegalArgumentException(fieldName + " phải lớn hơn 0");
        }
    }

    public static void oneOf(String value, String fieldName, Set<String> accepted) {
        if (value == null || !accepted.contains(value)) {
            throw new IllegalArgumentException(fieldName + " không hợp lệ");
        }
    }
}
