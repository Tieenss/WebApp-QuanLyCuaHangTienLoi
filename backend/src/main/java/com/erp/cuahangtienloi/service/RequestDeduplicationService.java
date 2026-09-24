package com.erp.cuahangtienloi.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;

/**
 * Service quản lý khoá chống trùng lặp request (Request Deduplication / In-Memory Idempotency Lock).
 * Dùng bộ nhớ RAM an toàn cho đa luồng (ConcurrentHashMap) với cơ chế hết hạn (TTL).
 * Hoàn toàn không can thiệp hay thay đổi cấu trúc Database.
 */
@Service
public class RequestDeduplicationService {

    private static final Logger log = LoggerFactory.getLogger(RequestDeduplicationService.class);
    private final ConcurrentHashMap<String, Long> lockMap = new ConcurrentHashMap<>();

    /**
     * Cố gắng lấy khoá thực thi cho một lockKey trong durationSeconds.
     * Nếu lockKey đã tồn tại và chưa hết hạn, hàm trả về false (ngăn chặn spam).
     *
     * @param lockKey khoá định danh duy nhất (Request Fingerprint)
     * @param durationSeconds thời gian giữ khoá (ví dụ 5s - 8s)
     * @return true nếu lấy khoá thành công (hợp lệ), false nếu request bị trùng lặp
     */
    public boolean tryAcquire(String lockKey, int durationSeconds) {
        if (lockKey == null || lockKey.isBlank()) {
            return true;
        }

        long now = System.currentTimeMillis();
        long expireAt = now + (durationSeconds * 1000L);

        // Định kỳ dọn dẹp các key đã hết hạn khi map đạt kích thước đáng kể
        if (lockMap.size() > 1000) {
            lockMap.entrySet().removeIf(entry -> entry.getValue() < now);
        }

        Long activeLock = lockMap.compute(lockKey, (k, existingExpire) -> {
            if (existingExpire != null && existingExpire > now) {
                return existingExpire; // Vẫn đang trong thời gian giữ khoá
            }
            return expireAt; // Đã hết hạn hoặc chưa có khoá -> cấp khoá mới
        });

        boolean acquired = activeLock != null && activeLock.equals(expireAt);
        if (!acquired) {
            log.warn("Phát hiện spam/duplicate request cho lockKey: {}", lockKey);
        }
        return acquired;
    }

    /**
     * Giải phóng khoá sớm (thường dùng khi request bị từ chối do validate logic không hợp lệ,
     * để người dùng có thể sửa dữ liệu và ấn gửi lại ngay mà không phải chờ hết TTL).
     */
    public void release(String lockKey) {
        if (lockKey != null) {
            lockMap.remove(lockKey);
        }
    }
}
