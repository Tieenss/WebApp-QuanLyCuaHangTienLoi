-- Sequence sinh mã hóa đơn an toàn khi nhiều checkout chạy đồng thời.
CREATE SEQUENCE IF NOT EXISTS seq_hoa_don_ma;

SELECT setval(
    'seq_hoa_don_ma',
    GREATEST(1, COALESCE((
        SELECT MAX(RIGHT(ma_hoa_don, 4)::integer)
        FROM hoa_don
        WHERE ma_hoa_don ~ '^HD-[0-9]{8}-[0-9]{4}$'
    ), 0)),
    COALESCE((
        SELECT MAX(RIGHT(ma_hoa_don, 4)::integer)
        FROM hoa_don
        WHERE ma_hoa_don ~ '^HD-[0-9]{8}-[0-9]{4}$'
    ), 0) > 0
);

-- Ràng buộc idempotency cho phiếu thu tự động của checkout POS.
CREATE UNIQUE INDEX IF NOT EXISTS uq_so_quy_receipt_ban_hang_hoa_don
    ON so_quy (ma_chung_tu_lien_quan, direction, hang_muc)
    WHERE ma_chung_tu_lien_quan IS NOT NULL
      AND direction = 'RECEIPT'
      AND hang_muc = 'BAN_HANG';
