-- =============================================================================
-- Bảng: cham_cong
-- Mục đích: Ghi nhận mỗi ca làm việc của nhân viên — phục vụ tính lương, đối
--           soát giờ làm, và báo cáo nhân sự.
--
-- Chuẩn hoá theo:
--   - `co_so_du_lieu.md` mục "Bảng 3 — cham_cong" (spec backend cốt lõi)
--   - `frontend/src/types/employeeTypes.ts` AttendanceRecord (UI yêu cầu)
--   - `frontend/src/mockData/employees.ts` buildAttendance() (pattern dữ liệu)
--
-- YÊU CẦU: Chạy `chi_nhanh.sql` + `nhan_vien.sql` TRƯỚC.
--
-- Quy tắc nghiệp vụ quan trọng:
--   - 1 nhân viên / 1 ngày / 1 ca = TỐI ĐA 1 record (UNIQUE).
--   - Phân biệt "giờ hành chính" (planned) và "giờ thực tế" (actual):
--     * check_in_at  = giờ vào ca dự kiến theo lịch (mốc giờ vào ca)
--     * clock_in_at  = giờ chấm công thực tế từ máy (có thể trễ hơn check_in_at)
--   - Ca làm việc: MORNING (06-14), AFTERNOON (14-22), NIGHT (22-06 hôm sau).
-- =============================================================================

CREATE TABLE IF NOT EXISTS cham_cong (
    -- Khoá chính
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

    -- FK tới nhân viên. ON DELETE RESTRICT để không xoá nhân viên còn lịch
    -- sử chấm công (audit). Nếu cần xoá nhân viên, khoá bằng `dang_hoat_dong`.
    id_nhan_vien    UUID         NOT NULL REFERENCES nhan_vien(id)
                                ON DELETE RESTRICT
                                ON UPDATE CASCADE,

    -- Ngày làm việc dạng YYYY-MM-DD. Lưu riêng (không derive từ check_in_at) để:
    --   1. Ca đêm bắt đầu 22:00 hôm trước nhưng work_date = hôm sau.
    --   2. Dễ query theo ngày/tháng cho bảng lương.
    work_date       DATE         NOT NULL,

    -- Ca làm việc (snapshot từ nhan_vien.ca_mac_dinh tại thời điểm tạo record).
    -- Không FK vì ca là ENUM literal, không có bảng riêng.
    ca_lam_viec     VARCHAR(20)  NOT NULL
                   CHECK (ca_lam_viec IN ('MORNING', 'AFTERNOON', 'NIGHT')),

    -- Giờ vào/ra CA DỰ KIẾN theo lịch (planned). NOT NULL vì luôn biết trước.
    check_in_at     TIMESTAMP    NOT NULL,
    check_out_at    TIMESTAMP    NOT NULL,

    -- Giờ chấm công THỰC TẾ từ máy. NULL nếu chưa check-in / chưa check-out.
    -- Sau khi clock_out_at có giá trị, mới tính được tong_gio_lam.
    clock_in_at     TIMESTAMP,
    clock_out_at    TIMESTAMP,

    -- Đi muộn bao nhiêu phút = clock_in_at - check_in_at (nếu > 0).
    -- Snapshot để tránh phải tính lại mỗi lần đọc. Cho phép 0 (đúng giờ)
    -- hoặc NULL (chưa chấm công).
    di_tre_phut     INTEGER      CHECK (di_tre_phut IS NULL OR di_tre_phut >= 0),

    -- Số giờ làm thêm (overtime). Mặc định 0; >0 khi clock_out_at > check_out_at
    -- và nhân viên được duyệt OT.
    overtime_hours  DECIMAL(5,2) NOT NULL DEFAULT 0
                   CHECK (overtime_hours >= 0),

    -- Số giờ nghỉ trong ca (ăn trưa, giải lao). Trừ vào tổng giờ khi tính lương.
    -- Hằng số phổ biến: 0.5h (ca ngắn) hoặc 1h (ca dài).
    break_hours     DECIMAL(4,2) NOT NULL DEFAULT 0
                   CHECK (break_hours >= 0),

    -- Tổng giờ làm THỰC TẾ = (clock_out - clock_in) - break + overtime.
    -- DECIMAL(5,2) = tối đa 999.99 giờ (đủ cho 30 ngày OT liên tục).
    -- NULL nếu chưa check-out (chưa chốt ca).
    tong_gio_lam    DECIMAL(5,2) CHECK (tong_gio_lam IS NULL OR tong_gio_lam >= 0),

    -- Trạng thái chấm công: PRESENT/LATE/ABSENT/LEAVE.
    trang_thai      VARCHAR(20)  NOT NULL DEFAULT 'PRESENT'
                   CHECK (trang_thai IN ('PRESENT', 'LATE', 'ABSENT', 'LEAVE')),

    -- Cờ đánh dấu đã thanh toán lương cho ca này chưa.
    -- Khi `bang_luong` được duyệt chi → cập nhật is_paid=TRUE cho tất cả
    -- cham_cong có work_date thuộc tháng đó.
    da_thanh_toan   BOOLEAN      NOT NULL DEFAULT FALSE,

    ghi_chu         TEXT,

    ngay_tao        TIMESTAMP    NOT NULL DEFAULT NOW(),
    ngay_cap_nhat   TIMESTAMP    NOT NULL DEFAULT NOW(),

    -- Đảm bảo 1 nhân viên chỉ có 1 record / ngày / ca. Tránh tạo trùng khi
    -- frontend retry check-in do mạng chậm.
    CONSTRAINT uq_cham_cong_nv_ngay_ca UNIQUE (id_nhan_vien, work_date, ca_lam_viec),

    -- Đảm bảo check_out > check_in (planned phải hợp lệ).
    CONSTRAINT chk_check_out_after_in CHECK (check_out_at > check_in_at),

    -- Nếu đã check-out thực tế thì phải có cả clock_in và clock_out; thời
    -- gian thực tế phải > thời gian kế hoạch. Nếu chưa check-out thực tế thì
    -- 2 cột này NULL.
    CONSTRAINT chk_clock_consistency CHECK (
        (clock_in_at IS NULL AND clock_out_at IS NULL)
        OR
        (clock_in_at IS NOT NULL AND clock_out_at IS NOT NULL
         AND clock_out_at > clock_in_at
         AND clock_in_at >= check_in_at - INTERVAL '1 hour'  -- cho phép trễ tối đa 1h
         AND clock_out_at <= check_out_at + INTERVAL '6 hours')  -- cho phép OT tối đa 6h
    )
);

-- Tái sử dụng trigger function đã có từ chi_nhanh.sql
DROP TRIGGER IF EXISTS cham_cong_set_ngay_cap_nhat ON cham_cong;
CREATE TRIGGER cham_cong_set_ngay_cap_nhat
    BEFORE UPDATE ON cham_cong
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_ngay_cap_nhat();

-- Index cho truy vấn thường gặp:
--   1. Lấy chấm công theo nhân viên + tháng (cho bảng lương)
--   2. Lấy chấm công theo chi nhánh + ngày (cho dashboard quản lý)
--   3. Lấy ca chưa check-out (cho nhắc nhở)
CREATE INDEX IF NOT EXISTS idx_cham_cong_nv_ngay
    ON cham_cong (id_nhan_vien, work_date DESC);

CREATE INDEX IF NOT EXISTS idx_cham_cong_work_date
    ON cham_cong (work_date DESC);

CREATE INDEX IF NOT EXISTS idx_cham_cong_chua_checkout
    ON cham_cong (clock_in_at) WHERE clock_out_at IS NULL AND clock_in_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cham_cong_chua_thanh_toan
    ON cham_cong (work_date) WHERE da_thanh_toan = FALSE;

-- =============================================================================
-- Dữ liệu mẫu — đồng bộ với `mockData/employees.ts` (30 ngày gần nhất × 9 NV)
-- Chỉ INSERT 1 record mẫu đại diện để test schema, không sinh đủ 270 records
-- (chạy stored procedure riêng khi cần data lớn).
-- =============================================================================
INSERT INTO cham_cong
    (id, id_nhan_vien, work_date, ca_lam_viec,
     check_in_at, check_out_at, clock_in_at, clock_out_at,
     di_tre_phut, overtime_hours, break_hours, tong_gio_lam,
     trang_thai, da_thanh_toan, ghi_chu)
VALUES
    -- Ca sáng hoàn tất (Mai - NV-0006, hôm qua)
    ('c3d4e5f6-0001-0000-0000-000000000001',
     'b2c3d4e5-0001-0000-0000-000000000006',
     CURRENT_DATE - INTERVAL '1 day',
     'MORNING',
     (CURRENT_DATE - INTERVAL '1 day')::TIMESTAMP + TIME '06:00:00',
     (CURRENT_DATE - INTERVAL '1 day')::TIMESTAMP + TIME '14:00:00',
     (CURRENT_DATE - INTERVAL '1 day')::TIMESTAMP + TIME '06:00:00',
     (CURRENT_DATE - INTERVAL '1 day')::TIMESTAMP + TIME '14:00:00',
     0, 0, 1.00, 7.00,
     'PRESENT', TRUE, 'Đúng giờ, nghỉ trưa 1h'),

    -- Ca chiều đi muộn 10 phút (Hùng - NV-0007, hôm qua)
    ('c3d4e5f6-0001-0000-0000-000000000002',
     'b2c3d4e5-0001-0000-0000-000000000007',
     CURRENT_DATE - INTERVAL '1 day',
     'AFTERNOON',
     (CURRENT_DATE - INTERVAL '1 day')::TIMESTAMP + TIME '14:00:00',
     (CURRENT_DATE - INTERVAL '1 day')::TIMESTAMP + TIME '22:00:00',
     (CURRENT_DATE - INTERVAL '1 day')::TIMESTAMP + TIME '14:10:00',
     (CURRENT_DATE - INTERVAL '1 day')::TIMESTAMP + TIME '22:00:00',
     10, 0, 0.50, 7.50,
     'LATE', TRUE, 'Đi muộn 10 phút'),

    -- Ca đêm có OT 2h (Toàn - NV-0008, hôm qua)
    ('c3d4e5f6-0001-0000-0000-000000000003',
     'b2c3d4e5-0001-0000-0000-000000000008',
     CURRENT_DATE - INTERVAL '1 day',
     'NIGHT',
     (CURRENT_DATE - INTERVAL '1 day')::TIMESTAMP + TIME '22:00:00',
     CURRENT_DATE::TIMESTAMP + TIME '06:00:00',
     (CURRENT_DATE - INTERVAL '1 day')::TIMESTAMP + TIME '22:00:00',
     CURRENT_DATE::TIMESTAMP + TIME '08:00:00',
     0, 2.00, 0.50, 9.50,
     'PRESENT', TRUE, 'Làm thêm 2h (kiểm kê đột xuất)'),

    -- Ca sáng hôm nay - CHƯA CHECK-OUT (Mai - NV-0006)
    ('c3d4e5f6-0001-0000-0000-000000000004',
     'b2c3d4e5-0001-0000-0000-000000000006',
     CURRENT_DATE,
     'MORNING',
     CURRENT_DATE::TIMESTAMP + TIME '06:00:00',
     CURRENT_DATE::TIMESTAMP + TIME '14:00:00',
     CURRENT_DATE::TIMESTAMP + TIME '06:02:00',
     NULL,  -- chưa check-out
     2, 0, 0.50, NULL,  -- chưa tính được tổng giờ
     'PRESENT', FALSE, 'Đã check-in, chờ check-out'),

    -- Nghỉ phép (Linh - NV-0009, hôm qua)
    ('c3d4e5f6-0001-0000-0000-000000000005',
     'b2c3d4e5-0001-0000-0000-000000000009',
     CURRENT_DATE - INTERVAL '1 day',
     'MORNING',
     (CURRENT_DATE - INTERVAL '1 day')::TIMESTAMP + TIME '06:00:00',
     (CURRENT_DATE - INTERVAL '1 day')::TIMESTAMP + TIME '14:00:00',
     NULL, NULL,  -- nghỉ phép nên không chấm công
     NULL, 0.00, 0.00,
     'LEAVE', FALSE, 'Nghỉ phép năm (đã duyệt)'),

    -- Vắng không phép (thu ngân khác)
    ('c3d4e5f6-0001-0000-0000-000000000006',
     'b2c3d4e5-0001-0000-0000-000000000007',
     CURRENT_DATE - INTERVAL '2 day',
     'MORNING',
     (CURRENT_DATE - INTERVAL '2 day')::TIMESTAMP + TIME '06:00:00',
     (CURRENT_DATE - INTERVAL '2 day')::TIMESTAMP + TIME '14:00:00',
     NULL, NULL,
     NULL, 0.00, 0.00,
     'ABSENT', FALSE, 'Vắng không thông báo')
ON CONFLICT (id_nhan_vien, work_date, ca_lam_viec) DO NOTHING;

-- =============================================================================
-- (Tuỳ chọn) FUNCTION tính tong_gio_lam tự động khi check-out.
-- Backend service có thể gọi hàm này thay vì tính tay ở tầng app.
-- =============================================================================
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
        (EXTRACT(EPOCH FROM p_clock_out - p_clock_in) / 3600.0) - p_break + p_ot,
        2
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON TABLE cham_cong IS
    'Ghi nhận mỗi ca làm việc của nhân viên. Phân biệt giờ hành chính (check_*) '
    'và giờ thực tế từ máy chấm công (clock_*). Nguồn dữ liệu cho bảng lương '
    '`bang_luong` (tổng hợp theo tháng) và báo cáo nhân sự.';

COMMENT ON COLUMN cham_cong.work_date IS
    'Ngày làm việc dạng YYYY-MM-DD. Lưu riêng để xử lý ca đêm (bắt đầu 22:00 '
    'hôm trước nhưng work_date = hôm sau, khi giờ ra là 06:00 sáng hôm sau).';

COMMENT ON COLUMN cham_cong.check_in_at IS
    'Giờ vào ca DỰ KIẾN theo lịch (planned). Dùng để tính "đi muộn" khi so '
    'với clock_in_at. NOT NULL vì luôn biết trước khi tạo record.';

COMMENT ON COLUMN cham_cong.clock_in_at IS
    'Giờ chấm công THỰC TẾ từ máy (actual). NULL nếu nhân viên chưa check-in '
    'hoặc đang nghỉ phép / vắng. Sau khi có giá trị, mới tính được di_tre_phut.';

COMMENT ON COLUMN cham_cong.tong_gio_lam IS
    'Tổng giờ làm thực tế = (clock_out - clock_in) - break_hours + overtime_hours. '
    'NULL khi chưa check-out. Khi tạo bang_luong, hệ thống lấy SUM(tong_gio_lam) '
    'của các cham_cong có work_date thuộc tháng đó.';

COMMENT ON COLUMN cham_cong.da_thanh_toan IS
    'Cờ đánh dấu lương cho ca này đã được duyệt chi. Khi bang_luong chuyển sang '
    'DA_THANH_TOAN, trigger ở tầng backend UPDATE cờ này = TRUE cho tất cả '
    'cham_cong trong tháng đó. Tránh thanh toán trùng khi chạy lại bảng lương.';
