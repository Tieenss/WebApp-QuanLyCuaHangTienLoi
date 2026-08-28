package com.erp.cuahangtienloi.exception;

/**
 * Ném khi vi phạm quy tắc nghiệp vụ (VD: mã vạch trùng, xóa danh mục còn sản phẩm,
 * xóa sản phẩm đã có giao dịch...). Sẽ được map sang HTTP 400/409.
 */
public class BusinessException extends RuntimeException {
    public BusinessException(String message) {
        super(message);
    }
}
