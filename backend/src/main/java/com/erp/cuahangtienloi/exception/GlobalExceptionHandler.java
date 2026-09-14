package com.erp.cuahangtienloi.exception;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.core.NestedExceptionUtils;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

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

        } else if (text.contains("foreign key")) {
            userMsg = "Dữ liệu tham chiếu không hợp lệ.";

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