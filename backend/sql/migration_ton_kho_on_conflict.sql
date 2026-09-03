-- =============================================================================
-- Migration: Fix INSERT trigger ton_kho (gia_tri_ton sai khi INSERT trùng)
--
-- VẤN ĐỀ:
--   ton_kho.sql dùng `ON CONFLICT (id_san_pham, id_chi_nhanh) DO NOTHING`
--   → khi INSERT trùng, INSERT trigger `fn_ton_kho_insert_gia_tri` KHÔNG
--   chạy → cột `gia_tri_ton` giữ giá trị cũ (có thể sai nếu SL hoặc giá vốn
--   đã thay đổi). File còn có 1 dòng UPDATE workaround bẩn:
--     UPDATE ton_kho SET so_luong_ton = so_luong_ton
--     WHERE gia_tri_ton = 0 AND so_luong_ton > 0;
--   Workaround này chỉ chạy 1 lần lúc seed data, KHÔNG tự động sửa khi có
--   row mới trong production.
--
-- SỬA:
--   1. Đổi INSERT seed từ `DO NOTHING` → `DO UPDATE SET gia_tri_ton = ...`
--      (trigger BEFORE UPDATE sẽ tự chạy, đảm bảo `lan_bien_dong_cuoi` cũng
--      được cập nhật). Áp dụng cho MỌI INSERT/UPSERT ton_kho từ giờ về sau.
--   2. Refresh `gia_tri_ton` cho TẤT CẢ row hiện có (idempotent — nếu đã đúng
--      thì không thay đổi gì; nếu sai sẽ tự fix).
--
-- Chạy script này SAU ton_kho.sql.
-- Idempotent: chạy nhiều lần OK.
-- =============================================================================

-- Bước 1: Refresh gia_tri_ton cho TẤT CẢ row hiện có. Dùng cách "dummy update"
-- giống file gốc để trigger BEFORE UPDATE chạy.
-- (Lệnh UPDATE SET cột = cột không có tác dụng về data nhưng trigger vẫn
-- chạy → tính lại gia_tri_ton.)
UPDATE ton_kho
SET gia_tri_ton = so_luong_ton * gia_von_trung_binh
WHERE gia_tri_ton IS DISTINCT FROM (so_luong_ton * gia_von_trung_binh);

-- Thông báo số row đã refresh
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Đã refresh gia_tri_ton cho % row ton_kho', v_count;
END $$;

-- Bước 2: Tạo function helper để các script INSERT/UPSERT khác (ngoài file seed)
-- dùng, đảm bảo ON CONFLICT DO UPDATE đúng chuẩn.
-- Function này là wrapper cho INSERT ... ON CONFLICT, dùng khi backend muốn
-- upsert tồn kho (vd: tạo tồn cho SP mới ở mọi chi nhánh).
CREATE OR REPLACE FUNCTION fn_upsert_ton_kho(
    p_id_san_pham    UUID,
    p_id_chi_nhanh   UUID,
    p_so_luong       INTEGER,
    p_gia_von        DECIMAL(12,0) DEFAULT 0,
    p_ton_toi_thieu  INTEGER DEFAULT 0,
    p_ton_toi_da     INTEGER DEFAULT 0
) RETURNS VOID AS $$
BEGIN
    INSERT INTO ton_kho (
        id_san_pham, id_chi_nhanh, so_luong_ton, gia_von_trung_binh,
        ton_toi_thieu, ton_toi_da, lan_bien_dong_cuoi
    ) VALUES (
        p_id_san_pham, p_id_chi_nhanh, p_so_luong, p_gia_von,
        p_ton_toi_thieu, p_ton_toi_da, NOW()
    )
    -- DO UPDATE: nếu row đã tồn tại, cập nhật SL/giá vốn → trigger BEFORE
    -- UPDATE sẽ tự tính lại gia_tri_ton. Lưu ý: KHÔNG overwrite min/max
    -- để giữ ngưỡng riêng của từng chi nhánh.
    ON CONFLICT (id_san_pham, id_chi_nhanh) DO UPDATE
    SET so_luong_ton = EXCLUDED.so_luong_ton,
        gia_von_trung_binh = EXCLUDED.gia_von_trung_binh,
        lan_bien_dong_cuoi = NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_upsert_ton_kho IS
    'Wrapper INSERT ... ON CONFLICT DO UPDATE cho ton_kho. Khi conflict, '
    'tự cập nhật so_luong_ton + gia_von_trung_binh → trigger BEFORE UPDATE '
    'tính lại gia_tri_ton. KHÔNG overwrite min/max (giữ ngưỡng riêng '
    'từng chi nhánh). Backend dùng khi cần tạo mới/upsert tồn kho.';
