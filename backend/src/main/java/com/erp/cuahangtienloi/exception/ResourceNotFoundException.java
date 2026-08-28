package com.erp.cuahangtienloi.exception;

/**
 * Ném khi không tìm thấy tài nguyên theo id. Sẽ được map sang HTTP 404.
 */
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
