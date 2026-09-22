-- Áp dụng cho database đã tạo từ phieu_kiem_ke.sql trước khi có bước gửi duyệt.
-- Chạy file này một lần trước khi deploy backend/frontend mới.
-- DA_DUYET legacy → CHO_DUYET

DO $$
DECLARE
    v_constraint_name TEXT;
BEGIN
    -- Tên CHECK constraint của DB cũ không cố định, nên tìm theo chính các
    -- giá trị trạng thái thay vì giả định một tên constraint.
    FOR v_constraint_name IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'phieu_kiem_ke'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%DANG_KIEM_KE%'
    LOOP
        EXECUTE format('ALTER TABLE phieu_kiem_ke DROP CONSTRAINT %I', v_constraint_name);
    END LOOP;
END $$;

UPDATE phieu_kiem_ke
SET trang_thai = 'CHO_DUYET'
WHERE trang_thai = 'DA_DUYET';

ALTER TABLE phieu_kiem_ke
    ADD CONSTRAINT phieu_kiem_ke_trang_thai_check
    CHECK (trang_thai IN ('DANG_KIEM_KE', 'CHO_DUYET', 'DA_CAN_BANG', 'CANCELLED'));

-- Phiếu cũ đang kiểm kê vẫn là nháp có thể sửa. Không tự chuyển chúng sang chờ duyệt.

CREATE OR REPLACE FUNCTION fn_can_bang_kiem_ke(
    p_id_phieu       UUID,
    p_id_nguoi_duyet UUID,
    p_ngay_can_bang  DATE DEFAULT CURRENT_DATE,
    p_nguoi_thuc_hien VARCHAR(255) DEFAULT 'Hệ thống',
    p_ghi_chu        TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_phieu RECORD;
    v_line RECORD;
    v_ma_chung_tu VARCHAR(50);
BEGIN
    SELECT * INTO v_phieu
    FROM phieu_kiem_ke
    WHERE id = p_id_phieu
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy phiếu kiểm kê %', p_id_phieu;
    END IF;

    IF v_phieu.trang_thai != 'CHO_DUYET' THEN
        RAISE EXCEPTION 'Phiếu phải ở trạng thái CHO_DUYET. Hiện tại: %',
            v_phieu.trang_thai;
    END IF;

    v_ma_chung_tu := v_phieu.ma_phieu;

    UPDATE phieu_kiem_ke
    SET trang_thai = 'DA_CAN_BANG',
        ngay_can_bang = p_ngay_can_bang,
        id_nguoi_duyet = p_id_nguoi_duyet,
        ghi_chu = COALESCE(p_ghi_chu, ghi_chu)
    WHERE id = p_id_phieu;

    FOR v_line IN SELECT * FROM chi_tiet_kiem_ke WHERE id_phieu_kiem_ke = p_id_phieu
    LOOP
        IF v_line.so_luong_lech <> 0 THEN
            PERFORM fn_ghi_the_kho_va_dieu_chinh_ton(
                v_line.id_san_pham,
                v_phieu.id_chi_nhanh,
                'ADJUSTMENT',
                v_line.so_luong_lech,
                v_line.don_gia_von,
                v_ma_chung_tu,
                p_nguoi_thuc_hien,
                NULL,
                'Cân bằng kiểm kê: lệch ' || v_line.so_luong_lech || ' đơn vị. Lý do: ' || COALESCE(v_line.ly_do_lech, ''),
                p_ngay_can_bang::TIMESTAMP
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
