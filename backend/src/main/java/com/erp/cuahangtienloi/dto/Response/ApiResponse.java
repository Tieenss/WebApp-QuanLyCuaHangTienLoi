package com.erp.cuahangtienloi.dto.Response;

public record ApiResponse(boolean success, String message) {

    public static ApiResponse ok(String m) {
        return new ApiResponse(true, m);
    }

    public static ApiResponse err(String m) {
        return new ApiResponse(false, m);
    }
}