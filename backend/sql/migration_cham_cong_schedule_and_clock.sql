-- 1. Thêm trạng thái lịch ca chưa chấm công.
ALTER TABLE cham_cong
    DROP CONSTRAINT IF EXISTS cham_cong_trang_thai_check;

ALTER TABLE cham_cong
    ADD CONSTRAINT cham_cong_trang_thai_check
    CHECK (trang_thai IN ('SCHEDULED', 'PRESENT', 'LATE', 'ABSENT', 'LEAVE'));

-- Các ca tương lai được tạo theo cách cũ là PRESENT nhưng chưa có chấm công
-- thực tế phải được hiển thị là chưa chấm công.
UPDATE cham_cong
SET trang_thai = 'SCHEDULED'
WHERE work_date >= CURRENT_DATE
  AND clock_in_at IS NULL
  AND clock_out_at IS NULL
  AND trang_thai = 'PRESENT';

-- 2. Cho phép trạng thái đã check-in nhưng chưa check-out.
ALTER TABLE cham_cong
    DROP CONSTRAINT IF EXISTS chk_clock_consistency;

ALTER TABLE cham_cong
    ADD CONSTRAINT chk_clock_consistency
    CHECK (
        (clock_in_at IS NULL AND clock_out_at IS NULL)
        OR (clock_in_at IS NOT NULL AND clock_out_at IS NULL)
        OR (clock_in_at IS NOT NULL AND clock_out_at IS NOT NULL AND clock_out_at > clock_in_at)
    );
