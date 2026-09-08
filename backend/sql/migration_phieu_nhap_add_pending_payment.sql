-- =============================================================================
-- Migration: thêm trạng thái PENDING_PAYMENT ('chờ thanh toán') cho phieu_nhap.
--
-- Luồng mới module 8 (2 bước):
--   PENDING_PAYMENT : Thủ kho lập phiếu (điền hàng thực nhận), chưa trả tiền NCC,
--                     chưa cộng tồn Kho Tổng.
--   COMPLETED       : Kế toán bấm "Thanh toán" → trả NCC + cộng tồn + thẻ kho.
-- =============================================================================

ALTER TABLE phieu_nhap
    DROP CONSTRAINT IF EXISTS phieu_nhap_trang_thai_check;

ALTER TABLE phieu_nhap
    ADD CONSTRAINT phieu_nhap_trang_thai_check
    CHECK (trang_thai IN ('DRAFT', 'PENDING', 'PENDING_PAYMENT', 'COMPLETED', 'CANCELLED'));

COMMENT ON COLUMN phieu_nhap.trang_thai IS
    'PENDING_PAYMENT=chờ Kế toán thanh toán (chưa cộng tồn); '
    'COMPLETED=đã thanh toán + cộng tồn kho.';
