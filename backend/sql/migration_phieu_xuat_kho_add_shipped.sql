-- =============================================================================
-- Migration: thêm trạng thái SHIPPED ('chờ nhận hàng') vào phieu_xuat_kho.
--
-- Luồng mới module 9 (3 bước):
--   PENDING   : QL chi nhánh tạo yêu cầu → chờ Thủ kho duyệt
--   SHIPPED   : Thủ kho đã xuất kho (trừ tồn Kho Tổng) → chờ chi nhánh nhận
--   COMPLETED : Chi nhánh xác nhận đã nhận (cộng tồn chi nhánh)
--   CANCELLED : Thủ kho từ chối
-- =============================================================================

ALTER TABLE phieu_xuat_kho
    DROP CONSTRAINT IF EXISTS phieu_xuat_kho_trang_thai_check;

ALTER TABLE phieu_xuat_kho
    ADD CONSTRAINT phieu_xuat_kho_trang_thai_check
    CHECK (trang_thai IN ('PENDING', 'SHIPPED', 'COMPLETED', 'CANCELLED'));

-- SHIPPED bắt buộc có ngày xuất + người duyệt (đã ra khỏi kho).
ALTER TABLE phieu_xuat_kho
    DROP CONSTRAINT IF EXISTS chk_shipped_co_ngay_xuat;
ALTER TABLE phieu_xuat_kho
    ADD CONSTRAINT chk_shipped_co_ngay_xuat CHECK (
        trang_thai != 'SHIPPED' OR ngay_xuat_thuc_te IS NOT NULL
    );

COMMENT ON COLUMN phieu_xuat_kho.trang_thai IS
    'PENDING=chờ Thủ kho duyệt; SHIPPED=đã xuất, chờ chi nhánh nhận; '
    'COMPLETED=chi nhánh đã nhận; CANCELLED=từ chối.';
