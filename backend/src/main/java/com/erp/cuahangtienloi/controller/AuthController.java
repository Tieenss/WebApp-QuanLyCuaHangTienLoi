package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.LoginRequest;
import jakarta.validation.Valid;
import com.erp.cuahangtienloi.dto.LoginResponse;
import com.erp.cuahangtienloi.dto.Response.ApiResponse;
import com.erp.cuahangtienloi.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            LoginResponse response = authService.login(request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body( ApiResponse.err(e.getMessage()));
        }
    }

    record ErrorResponse(String message) {}
}
