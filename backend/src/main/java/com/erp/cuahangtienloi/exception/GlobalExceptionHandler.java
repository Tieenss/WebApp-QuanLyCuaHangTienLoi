package com.erp.cuahangtienloi.exception;

import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.core.NestedExceptionUtils;

import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .distinct()
                .collect(Collectors.joining("; "));
        return ResponseEntity.badRequest().body(ApiResponse.err(message));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse> handleConstraintViolation(ConstraintViolationException ex) {
        String message = ex.getConstraintViolations().stream()
                .map(violation -> violation.getMessage())
                .distinct()
                .collect(Collectors.joining("; "));
        return ResponseEntity.badRequest().body(ApiResponse.err(message));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse> handleIllegalArgument(IllegalArgumentException ex) {
        String message = ex.getMessage() == null || ex.getMessage().isBlank()
                ? "Dữ liệu không hợp lệ."
                : ex.getMessage();
        return ResponseEntity.badRequest().body(ApiResponse.err(message));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<?> handleDataIntegrity(DataIntegrityViolationException ex) {

        String msg = NestedExceptionUtils
                .getMostSpecificCause(ex)
                .getMessage();

        String text = msg == null ? "" : msg.toLowerCase();

        String userMsg;

        if (text.contains("nha_cung_cap_ma_so_thue_key")) {
            userMsg = "Mã số thuế đã tồn tại.";

        } else if (text.contains("ma_so_thue") && text.contains("check")) {
            userMsg = "Mã số thuế không đúng định dạng: 10 chữ số, hoặc 10 + '-' + 3 chữ số.";

        } else if (text.contains("email") && text.contains("check")) {
            userMsg = "Email không đúng định dạng.";

        } else if (text.contains("dieu_khoan_thanh_toan") && text.contains("check")) {
            userMsg = "Điều khoản thanh toán không hợp lệ.";

        } else if (text.contains("nha_cung_cap_ma_ncc_key")) {
            userMsg = "Mã NCC đã tồn tại.";

        } else if (text.contains("foreign key") || text.contains("violates foreign key constraint")) {
            if (text.contains("nhan_vien") || text.contains("id_thu_ngan") || text.contains("id_nguoi_nhap")
                    || text.contains("id_nguoi_tao") || text.contains("id_nguoi_duyet") || text.contains("id_nguoi_nhan")
                    || text.contains("hoa_don") || text.contains("phieu_") || text.contains("cham_cong")
                    || text.contains("bang_luong") || text.contains("so_quy")) {
                userMsg = "Nhân viên này đã có lịch sử giao dịch trong hệ thống (hóa đơn, phiếu kho, chấm công,...). Vui lòng chuyển trạng thái sang 'Ngừng hoạt động' thay vì xóa.";
            } else {
                userMsg = "Không thể xóa hoặc thay đổi do dữ liệu đang được sử dụng ở phân hệ khác.";
            }

        } else {
            userMsg = "Dữ liệu không hợp lệ.";
        }

        return ResponseEntity
                .badRequest()
                .body(Map.of("message", userMsg));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<?> handleUnreadable(
            HttpMessageNotReadableException ex) {

        return ResponseEntity
                .badRequest()
                .body(Map.of("message", "Body JSON không hợp lệ."));
    }
}
