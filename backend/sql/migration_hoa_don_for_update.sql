-- =============================================================================
-- Migration: Fix race condition khi 2 thu ngân cùng thanh toán 1 SP
--
-- VẤN ĐỀ:
--   fn_tao_hoa_don (trong hoa_don.sql) check tồn kho bằng
--     NOT EXISTS (SELECT 1 FROM ton_kho WHERE ... AND so_luong_ton >= ?)
--   → KHÔNG khoá row. Nếu 2 thu ngân cùng chạy cùng lúc, cả 2 đều thấy
--   "còn đủ tồn" → cả 2 INSERT hoa_don → 1 bên fail ở CHECK constraint
--   so_luong_ton >= 0 với error message khó hiểu.
--
-- SỬA:
--   Dùng PERFORM 1 ... FOR UPDATE để khoá row ngay khi check. Transaction
--   thứ 2 sẽ CHỜ transaction 1 commit xong → check lại với tồn mới
--   → error message rõ ràng ("Không đủ tồn kho") từ
--   fn_ghi_the_kho_va_dieu_chinh_ton thay vì CHECK chung chung.
--
-- Idempotent: CREATE OR REPLACE FUNCTION — chạy nhiều lần OK.
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_tao_hoa_don(
    p_id_chi_nhanh    UUID,
    p_id_thu_ngan     UUID,
    p_ca_lam_viec     VARCHAR(20),
    p_ngay_ban        TIMESTAMP DEFAULT NOW(),
    p_hinh_thuc_tt    VARCHAR(20),
    p_tien_khach_dua  DECIMAL(15,0) DEFAULT NULL,
    p_sdt_thanh_vien  VARCHAR(20) DEFAULT NULL,
    p_giam_gia        DECIMAL(15,0) DEFAULT 0,
    p_ghi_chu         TEXT DEFAULT NULL,
    p_nguoi_thuc_hien VARCHAR(255) DEFAULT 'Hệ thống',
    p_lines JSONB DEFAULT '[]'::JSONB
    -- Format: [{"id_san_pham":"...", "so_luong": 2,
    --           "don_gia": 15000, "giam_gia_dong": 0, "vat_phantram": 8}]
) RETURNS UUID AS $$
DECLARE
    v_id_hoa_don UUID;
    v_line JSONB;
    v_ma_chung_tu VARCHAR(50);
    v_don_gia_von DECIMAL(12,0);
BEGIN
    -- BR-01: validate tồn kho trước khi INSERT.
    -- Dùng FOR UPDATE để khoá row — tránh race condition khi 2 thu ngân
    -- cùng thanh toán cùng SP. Nếu 1 transaction đang chạy, transaction
    -- còn lại sẽ CHỜ (không fail ngay) → fail message rõ ràng từ
    -- fn_ghi_the_kho_va_dieu_chinh_ton thay vì CHECK constraint.
    FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
    LOOP
        PERFORM 1
        FROM ton_kho
        WHERE id_san_pham = (v_line->>'id_san_pham')::UUID
          AND id_chi_nhanh = p_id_chi_nhanh
          AND so_luong_ton >= (v_line->>'so_luong')::INTEGER
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'BR-01: Không đủ tồn kho cho sản phẩm (%) tại chi nhánh (%)',
                (v_line->>'id_san_pham')::UUID, p_id_chi_nhanh;
        END IF;
    END LOOP;

    -- 1. INSERT header (trigger sinh mã tự động)
    INSERT INTO hoa_don (
        id_chi_nhanh, id_thu_ngan, ca_lam_viec, ngay_ban,
        hinh_thuc_tt, tien_khach_dua, sdt_thanh_vien,
        giam_gia, ghi_chu
    ) VALUES (
        p_id_chi_nhanh, p_id_thu_ngan, p_ca_lam_viec,
        COALESCE(p_ngay_ban, NOW()),
        p_hinh_thuc_tt, p_tien_khach_dua, p_sdt_thanh_vien,
        COALESCE(p_giam_gia, 0), p_ghi_chu
    )
    RETURNING id INTO v_id_hoa_don;

    v_ma_chung_tu := (SELECT ma_hoa_don FROM hoa_don WHERE id = v_id_hoa_don);

    -- 2. INSERT từng line + ghi the_kho + cập nhật ton_kho
    FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
    LOOP
        -- Lấy giá vốn từ ton_kho (snapshot)
        SELECT gia_von_trung_binh INTO v_don_gia_von
        FROM ton_kho
        WHERE id_san_pham = (v_line->>'id_san_pham')::UUID
          AND id_chi_nhanh = p_id_chi_nhanh;

        INSERT INTO chi_tiet_hoa_don (
            id_hoa_don, id_san_pham, so_luong, don_gia, giam_gia_dong,
            vat_phantram, don_gia_von, thu_tu
        ) VALUES (
            v_id_hoa_don,
            (v_line->>'id_san_pham')::UUID,
            (v_line->>'so_luong')::INTEGER,
            (v_line->>'don_gia')::DECIMAL(12,0),
            COALESCE((v_line->>'giam_gia_dong')::DECIMAL(15,0), 0),
            COALESCE((v_line->>'vat_phantram')::SMALLINT, 8),
            v_don_gia_von,
            COALESCE((v_line->>'thu_tu')::INTEGER, 0)
        );

        PERFORM fn_ghi_the_kho_va_dieu_chinh_ton(
            (v_line->>'id_san_pham')::UUID,
            p_id_chi_nhanh,
            'SALE_OUT',
            -(v_line->>'so_luong')::INTEGER,
            v_don_gia_von,
            v_ma_chung_tu,
            p_nguoi_thuc_hien,
            NULL,
            'Bán hàng POS: ' || v_ma_chung_tu,
            COALESCE(p_ngay_ban, NOW())
        );
    END LOOP;

    IF p_tien_khach_dua IS NOT NULL THEN
        UPDATE hoa_don
        SET tien_khach_dua = p_tien_khach_dua
        WHERE id = v_id_hoa_don;
    END IF;

    RETURN v_id_hoa_don;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_tao_hoa_don IS
    'Tạo hoá đơn POS end-to-end. BR-01: dùng FOR UPDATE để khoá row ton_kho '
    'khi check tồn — tránh race condition khi 2 thu ngân cùng bán 1 SP. '
    'Sau khi check, function INSERT header + lines + ghi the_kho SALE_OUT '
    '+ trừ ton_kho. Tất cả trong 1 transaction.';
