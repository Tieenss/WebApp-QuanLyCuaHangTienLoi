package com.erp.cuahangtienloi.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;

@RestControllerAdvice
public class BoXuLyNgoaiLeToanCuc {

    @ExceptionHandler({BadCredentialsException.class, AuthenticationException.class})
    public ResponseEntity<LoiApi> handleAuthenticationException(Exception ex) {
        LoiApi loiApi = new LoiApi(
                HttpStatus.UNAUTHORIZED.value(),
                ex.getMessage(),
                LocalDateTime.now()
        );
        return new ResponseEntity<>(loiApi, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<LoiApi> handleAccessDeniedException(AccessDeniedException ex) {
        LoiApi loiApi = new LoiApi(
                HttpStatus.FORBIDDEN.value(),
                ex.getMessage(),
                LocalDateTime.now()
        );
        return new ResponseEntity<>(loiApi, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<LoiApi> handleGeneralException(Exception ex) {
        LoiApi loiApi = new LoiApi(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "Đã có lỗi hệ thống xảy ra: " + ex.getMessage(),
                LocalDateTime.now()
        );
        return new ResponseEntity<>(loiApi, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
