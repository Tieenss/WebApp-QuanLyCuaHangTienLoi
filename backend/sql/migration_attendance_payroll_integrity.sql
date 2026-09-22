-- Quy ước thống nhất: work_date là NGÀY BẮT ĐẦU ca. Vì vậy ca NIGHT bắt đầu
-- lúc 22:00 của work_date và checkout lúc 06:00 ngày kế tiếp.
COMMENT ON COLUMN cham_cong.work_date IS
    'Ngày bắt đầu ca dạng YYYY-MM-DD. Ca đêm bắt đầu 22:00 của work_date và checkout lúc 06:00 ngày hôm sau.';

-- tong_gio_lam đã bao gồm khoảng OT vì lấy trực tiếp từ clock-out trừ clock-in.
-- overtime_hours là phần tách riêng để áp hệ số lương, không được cộng lần hai.
CREATE OR REPLACE FUNCTION fn_tinh_tong_gio_lam(
    p_clock_in TIMESTAMP,
    p_clock_out TIMESTAMP,
    p_break DECIMAL,
    p_ot DECIMAL
) RETURNS DECIMAL(5,2) AS $$
BEGIN
    IF p_clock_in IS NULL OR p_clock_out IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN ROUND(
        GREATEST(0, (EXTRACT(EPOCH FROM p_clock_out - p_clock_in) / 3600.0) - COALESCE(p_break, 0)),
        2
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON COLUMN cham_cong.tong_gio_lam IS
    'Tổng giờ thực tế = clock_out - clock_in - break_hours; đã bao gồm OT, còn overtime_hours lưu phần OT riêng để tính hệ số.';
