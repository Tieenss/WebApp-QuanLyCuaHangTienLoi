-- Migration: sửa tạo ton_kho khi nhập lần đầu và cập nhật giá vốn bình quân.
-- Chạy sau the_kho.sql.

CREATE OR REPLACE FUNCTION fn_ghi_the_kho_va_dieu_chinh_ton(
    p_id_san_pham    UUID,
    p_id_chi_nhanh   UUID,
    p_loai_giao_dich VARCHAR(30),
    p_so_luong       INTEGER,
    p_don_gia        DECIMAL(12,0),
    p_ma_chung_tu    VARCHAR(50) DEFAULT NULL,
    p_nguoi_thuc_hien VARCHAR(255) DEFAULT 'Hệ thống',
    p_han_su_dung    DATE DEFAULT NULL,
    p_ghi_chu        TEXT DEFAULT NULL,
    p_ngay_phat_sinh TIMESTAMP DEFAULT NOW()
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
    v_ton_truoc INTEGER;
    v_ton_sau INTEGER;
    v_ton_kho_ton_tai BOOLEAN;
    v_gia_von_cu DECIMAL(12,0);
    v_gia_von_moi DECIMAL(12,0);
BEGIN
    SELECT so_luong_ton, gia_von_trung_binh
    INTO v_ton_truoc, v_gia_von_cu
    FROM ton_kho
    WHERE id_san_pham = p_id_san_pham
      AND id_chi_nhanh = p_id_chi_nhanh
    FOR UPDATE;

    v_ton_kho_ton_tai := FOUND;

    IF NOT v_ton_kho_ton_tai THEN
        IF p_so_luong < 0 THEN
            RAISE EXCEPTION 'Không thể xuất % đơn vị: SP chưa có tồn kho tại chi nhánh',
                -p_so_luong;
        END IF;
        v_ton_truoc := 0;
        v_gia_von_cu := 0;
    END IF;

    v_ton_sau := v_ton_truoc + p_so_luong;

    IF v_ton_sau < 0 THEN
        RAISE EXCEPTION 'Không đủ tồn. Hiện tại: %, yêu cầu: %',
            v_ton_truoc, -p_so_luong;
    END IF;

    INSERT INTO the_kho (
        ngay_phat_sinh, id_san_pham, id_chi_nhanh, loai_giao_dich,
        so_luong, don_gia, ton_truoc, ton_sau,
        ma_chung_tu, nguoi_thuc_hien, han_su_dung, ghi_chu
    ) VALUES (
        p_ngay_phat_sinh, p_id_san_pham, p_id_chi_nhanh, p_loai_giao_dich,
        p_so_luong, p_don_gia, v_ton_truoc, v_ton_sau,
        p_ma_chung_tu, p_nguoi_thuc_hien, p_han_su_dung, p_ghi_chu
    )
    RETURNING id INTO v_id;

    IF p_so_luong > 0 THEN
        v_gia_von_moi := (
            (v_ton_truoc * COALESCE(v_gia_von_cu, 0))
            + (p_so_luong * p_don_gia)
        ) / NULLIF(v_ton_sau, 0);
    ELSE
        v_gia_von_moi := COALESCE(v_gia_von_cu, 0);
    END IF;

    IF NOT v_ton_kho_ton_tai THEN
        INSERT INTO ton_kho (
            id_san_pham, id_chi_nhanh, so_luong_ton,
            gia_von_trung_binh, lan_bien_dong_cuoi
        ) VALUES (
            p_id_san_pham, p_id_chi_nhanh, v_ton_sau,
            COALESCE(v_gia_von_moi, p_don_gia), p_ngay_phat_sinh
        );
    ELSE
        UPDATE ton_kho
        SET so_luong_ton = v_ton_sau,
            gia_von_trung_binh = COALESCE(v_gia_von_moi, 0),
            lan_bien_dong_cuoi = p_ngay_phat_sinh
        WHERE id_san_pham = p_id_san_pham
          AND id_chi_nhanh = p_id_chi_nhanh;
    END IF;

    IF p_han_su_dung IS NOT NULL AND p_so_luong > 0 THEN
        UPDATE ton_kho
        SET han_su_dung_gan_nhat = p_han_su_dung
        WHERE id_san_pham = p_id_san_pham
          AND id_chi_nhanh = p_id_chi_nhanh
          AND (han_su_dung_gan_nhat IS NULL OR han_su_dung_gan_nhat > p_han_su_dung);
    END IF;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_ghi_the_kho_va_dieu_chinh_ton IS
    'Ghi the_kho, tạo/cập nhật ton_kho an toàn và tính giá vốn bình quân gia quyền.';
