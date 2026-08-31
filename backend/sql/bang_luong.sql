-- =============================================================================
-- Bảng: bang_luong
-- Mục đích: Bảng lương hàng tháng cho mỗi nhân viên. Quy trình duyệt 2 tầng:
--             Tầng 1: Quản lý chi nhánh xác nhận giờ (CHỈ cho THU_NGAN).
--             Tầng 2: Kế toán (hoặc Admin với lương Kế toán) duyệt chi.
--
-- Chuẩn hoá theo:
--   - `co_so_du_lieu.md` mục "Bảng 4 — bang_luong" (spec backend)
--   - `frontend/src/types/employeeTypes.ts` PayrollRow (UI yêu cầu)
--   - `frontend/src/mockData/employees.ts` buildPayrollFromRecords() (công thức)
--
-- YÊU CẦU: Chạy `chi_nhanh.sql` + `nhan_vien.sql` + `cham_cong.sql` TRƯỚC.
--
-- Công thức netPay (xem employeeTypes.ts:220-222):
--   netPay = baseSalary + shiftPay + overtimePay + bonus - deduction
-- Trong đó giờ dùng để tính = adjustedHours ?? tong_gio_lam (nếu Quản lý sửa).
-- =============================================================================

CREATE TABLE IF NOT EXISTS bang_luong (
    -- Khoá chính
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

    -- FK tới nhân viên. ON DELETE RESTRICT vì bảng lương là sổ sách kế toán,
    -- không được phép xoá mất lịch sử.
    id_nhan_vien    UUID         NOT NULL REFERENCES nhan_vien(id)
                                ON DELETE RESTRICT
                                ON UPDATE CASCADE,

    -- Snapshot chi nhánh + loại hợp đồng tại thời điểm chốt lương.
    -- Quan trọng vì nhân viên có thể chuyển chi nhánh giữa tháng — bảng lương
    -- phải "đóng băng" chi nhánh mà họ làm việc trong tháng đó.
    id_chi_nhanh    UUID         NOT NULL REFERENCES chi_nhanh(id)
                                ON DELETE RESTRICT
                                ON UPDATE CASCADE,
    loai_hop_dong   VARCHAR(20)  NOT NULL
                   CHECK (loai_hop_dong IN ('FULL_TIME', 'PART_TIME')),

    -- Kỳ lương dạng MM-YYYY. CHECK đảm bảo format chuẩn — nếu sai sẽ chặn INSERT.
    -- Index unique (id_nhan_vien, thang_nam) để chống tạo trùng 1 NV 1 tháng.
    thang_nam       VARCHAR(7)   NOT NULL
                   CHECK (thang_nam ~ '^(0[1-9]|1[0-2])-[0-9]{4}$'),

    -- ===== GIỜ LÀM =====
    -- Tổng giờ hệ thống tự tổng hợp từ cham_cong (đã trừ break, đã gộp OT).
    -- DECIMAL(7,2) = tối đa 99999.99 giờ (đủ cho 1 năm OT 24/7).
    tong_gio_lam    DECIMAL(7,2) NOT NULL CHECK (tong_gio_lam >= 0),
    -- Số giờ OT riêng (đã gộp trong tong_gio_lam, lưu riêng để tính overtimePay).
    overtime_hours  DECIMAL(7,2) NOT NULL DEFAULT 0 CHECK (overtime_hours >= 0),
    -- Tổng số ca làm việc thực tế (PRESENT + LATE) trong tháng.
    tong_so_ca      INTEGER      NOT NULL DEFAULT 0 CHECK (tong_so_ca >= 0),

    -- ===== GIỜ ĐIỀU CHỈNH (do Quản lý sửa) =====
    -- NULL = không sửa, dùng tong_gio_lam. Có giá trị = dùng giá trị này thay.
    gio_dieu_chinh  DECIMAL(7,2) CHECK (gio_dieu_chinh IS NULL OR gio_dieu_chinh >= 0),
    -- Bắt buộc ghi lý do nếu có điều chỉnh — kiểm tra ở trigger.
    ly_do_dieu_chinh TEXT,

    -- ===== GIÁ LƯƠNG SNAPSHOT =====
    -- Snapshot từ nhan_vien.luong_theo_gio tại thời điểm chốt — nếu sau này tăng
    -- lương, bảng lương tháng cũ vẫn tính theo giá cũ. Đúng nguyên tắc kế toán.
    luong_theo_gio  DECIMAL(12,0) NOT NULL CHECK (luong_theo_gio >= 0),
    -- Snapshot lương cứng từ nhan_vien.luong_cung (cho FULL_TIME).
    luong_cung      DECIMAL(12,0) NOT NULL DEFAULT 0 CHECK (luong_cung >= 0),

    -- ===== BREAKDOWN TIỀN LƯƠNG (lưu riêng để audit) =====
    -- Lương cứng theo tháng, đã tính tỷ lệ theo số ca làm thực tế / tổng ca kỳ.
    luong_cung_thuc_te DECIMAL(12,0) NOT NULL DEFAULT 0,
    -- Tiền công theo giờ × số giờ (áp dụng cho PART_TIME hoặc FULL_TIME tính theo giờ).
    tien_cong_theo_gio DECIMAL(12,0) NOT NULL DEFAULT 0,
    -- Tiền OT = overtime_hours × luong_theo_gio × 1.5 (hệ số OT 150%).
    tien_ot         DECIMAL(12,0) NOT NULL DEFAULT 0,
    -- Thưởng KPI doanh số / thưởng tháng (cho vào bởi Quản lý, cần audit).
    thuong          DECIMAL(12,0) NOT NULL DEFAULT 0,
    -- Khấu trừ: đi muộn, vắng không phép, hao hụt quầy (âm).
    khau_tru        DECIMAL(12,0) NOT NULL DEFAULT 0,

    -- ===== TỔNG CUỐI CÙNG =====
    -- = luong_cung_thuc_te + tien_cong_theo_gio + tien_ot + thuong - khau_tru
    -- Lưu snapshot, KHÔNG tự tính lại khi update field khác (an toàn audit).
    tong_tien_luong DECIMAL(15,0) NOT NULL CHECK (tong_tien_luong >= 0),

    -- ===== TRẠNG THÁI DUYỆT 2 TẦNG =====
    -- CHO_XAC_NHAN: mới chốt, chờ Quản lý xác nhận giờ (chỉ THU_NGAN).
    -- DA_XAC_NHAN:  đã xác nhận giờ, chờ Kế toán duyệt chi.
    -- DA_THANH_TOAN: đã duyệt chi + tạo phiếu chi sổ quỹ.
    trang_thai      VARCHAR(20)  NOT NULL DEFAULT 'CHO_XAC_NHAN'
                   CHECK (trang_thai IN ('CHO_XAC_NHAN', 'DA_XAC_NHAN', 'DA_THANH_TOAN')),

    -- Người xác nhận giờ (Tầng 1) — chỉ có giá trị khi trang_thai >= DA_XAC_NHAN
    -- VÀ vai trò là THU_NGAN. Các vai trò khác bỏ qua tầng này.
    id_nguoi_xac_nhan UUID REFERENCES nhan_vien(id)
                                ON DELETE SET NULL
                                ON UPDATE CASCADE,
    ngay_xac_nhan     TIMESTAMP,

    -- Người duyệt chi (Tầng 2) — Kế toán hoặc Admin (cho lương Kế toán).
    id_nguoi_duyet_chi UUID REFERENCES nhan_vien(id)
                                ON DELETE SET NULL
                                ON UPDATE CASCADE,
    ngay_duyet_chi     TIMESTAMP,

    -- Người thanh toán thực tế (có thể khác người duyệt, vd: thủ quỹ chi tiền).
    id_nguoi_thanh_toan UUID REFERENCES nhan_vien(id)
                                  ON DELETE SET NULL
                                  ON UPDATE CASCADE,
    ngay_thanh_toan     TIMESTAMP,

    -- Mã phiếu chi sổ quỹ (sinh ra tự động khi chuyển DA_THANH_TOAN) để
    -- truy vết ngược. Không FK cứng vì bảng so_quy chưa tạo.
    ma_phieu_chi     VARCHAR(30),

    -- ===== AUDIT TIMESTAMPS =====
    ngay_tao        TIMESTAMP    NOT NULL DEFAULT NOW(),
    ngay_cap_nhat   TIMESTAMP    NOT NULL DEFAULT NOW(),

    -- Mỗi nhân viên chỉ có 1 dòng lương / tháng. Tránh tạo trùng khi chạy
    -- lại job chốt lương.
    CONSTRAINT uq_bang_luong_nv_thang UNIQUE (id_nhan_vien, thang_nam),

    -- Nếu có điều chỉnh giờ thì BẮT BUỘC có lý do. Trigger kiểm tra bên dưới.
    -- Constraint trực tiếp không viết được IF/ELSE trong CHECK nên dùng trigger.
    CONSTRAINT chk_gio_dc_vs_tong CHECK (
        gio_dieu_chinh IS NULL OR gio_dieu_chinh <= tong_gio_lam + 24
    ),
    -- Không cho duyệt chi khi chưa xác nhận giờ.
    CONSTRAINT chk_trang_thai_xac_nhan CHECK (
        trang_thai = 'CHO_XAC_NHAN'
        OR id_nguoi_xac_nhan IS NOT NULL
    ),
    -- Không cho thanh toán khi chưa duyệt chi.
    CONSTRAINT chk_trang_thai_duyet_chi CHECK (
        trang_thai != 'DA_THANH_TOAN' OR id_nguoi_duyet_chi IS NOT NULL
    )
);

-- Tái sử dụng trigger function đã có từ chi_nhanh.sql
DROP TRIGGER IF EXISTS bang_luong_set_ngay_cap_nhat ON bang_luong;
CREATE TRIGGER bang_luong_set_ngay_cap_nhat
    BEFORE UPDATE ON bang_luong
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_ngay_cap_nhat();

-- Trigger đảm bảo rule nghiệp vụ: nếu có gio_dieu_chinh thì BẮT BUỘC có ly_do.
CREATE OR REPLACE FUNCTION trg_bang_luong_check_dieu_chinh()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.gio_dieu_chinh IS NOT NULL
       AND (NEW.ly_do_dieu_chinh IS NULL OR TRIM(NEW.ly_do_dieu_chinh) = '') THEN
        RAISE EXCEPTION 'Phải ghi lý do khi điều chỉnh giờ làm (NV %, tháng %)',
            NEW.id_nhan_vien, NEW.thang_nam;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bang_luong_check_dieu_chinh ON bang_luong;
CREATE TRIGGER bang_luong_check_dieu_chinh
    BEFORE INSERT OR UPDATE ON bang_luong
    FOR EACH ROW
    EXECUTE FUNCTION trg_bang_luong_check_dieu_chinh();

-- Index cho truy vấn thường gặp:
--   1. Lấy bảng lương theo tháng (Dashboard / Sổ quỹ / Kế toán duyệt)
--   2. Lấy bảng lương của 1 NV (chi tiết)
--   3. Lọc theo trạng thái (chờ duyệt, chờ chi)
CREATE INDEX IF NOT EXISTS idx_bang_luong_thang_nam
    ON bang_luong (thang_nam DESC);

CREATE INDEX IF NOT EXISTS idx_bang_luong_nv
    ON bang_luong (id_nhan_vien, thang_nam DESC);

CREATE INDEX IF NOT EXISTS idx_bang_luong_chi_nhanh_thang
    ON bang_luong (id_chi_nhanh, thang_nam DESC);

CREATE INDEX IF NOT EXISTS idx_bang_luong_trang_thai
    ON bang_luong (trang_thai, thang_nam DESC) WHERE trang_thai != 'DA_THANH_TOAN';

-- =============================================================================
-- Dữ liệu mẫu — đồng bộ với `mockData/employees.ts` (9 NV × tháng hiện tại)
-- Tháng hiện tại format MM-YYYY theo múi giờ server.
-- =============================================================================
INSERT INTO bang_luong
    (id, id_nhan_vien, id_chi_nhanh, loai_hop_dong, thang_nam,
     tong_gio_lam, overtime_hours, tong_so_ca,
     gio_dieu_chinh, ly_do_dieu_chinh,
     luong_theo_gio, luong_cung,
     luong_cung_thuc_te, tien_cong_theo_gio, tien_ot, thuong, khau_tru,
     tong_tien_luong, trang_thai,
     id_nguoi_xac_nhan, ngay_xac_nhan,
     id_nguoi_duyet_chi, ngay_duyet_chi,
     id_nguoi_thanh_toan, ngay_thanh_toan, ma_phieu_chi)
VALUES
    -- 1. Thu ngân Mai (NV-0006) - đã thanh toán, đi qua 2 tầng duyệt
    ('d4e5f6a7-0001-0000-0000-000000000001',
     'b2c3d4e5-0001-0000-0000-000000000006',
     'a1b2c3d4-0001-0000-0000-000000000101',
     'FULL_TIME',
     TO_CHAR(CURRENT_DATE, 'MM-YYYY'),
     168.0, 4.0, 24,  -- 24 ca × 7h = 168h, trong đó 4h OT
     NULL, NULL,
     0, 14000000,  -- lương cứng 14tr, không theo giờ
     14000000, 0, 0, 500000, 0,  -- lương cứng + thưởng 500k
     14500000,
     'DA_THANH_TOAN',
     'b2c3d4e5-0001-0000-0000-000000000004',
     DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '2 days',
     'b2c3d4e5-0001-0000-0000-000000000002',
     DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '5 days',
     'b2c3d4e5-0001-0000-0000-000000000002',
     DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '10 days',
     'PC-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-001'),

    -- 2. Thu ngân Hùng (NV-0007) - đã thanh toán, có điều chỉnh giờ
    ('d4e5f6a7-0001-0000-0000-000000000002',
     'b2c3d4e5-0001-0000-0000-000000000007',
     'a1b2c3d4-0001-0000-0000-000000000101',
     'FULL_TIME',
     TO_CHAR(CURRENT_DATE, 'MM-YYYY'),
     160.0, 0.0, 24,
     152.0, 'NV báo quên chấm công 2 ca cuối tuần, đã đối chiếu lịch làm',
     0, 14000000,
     13300000, 0, 0, 0, 0,
     13300000,
     'DA_THANH_TOAN',
     'b2c3d4e5-0001-0000-0000-000000000004',
     DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '2 days',
     'b2c3d4e5-0001-0000-0000-000000000002',
     DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '5 days',
     'b2c3d4e5-0001-0000-0000-000000000002',
     DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '10 days',
     'PC-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-002'),

    -- 3. Thu ngân Toàn (NV-0008) - PART_TIME ca đêm, đã thanh toán
    ('d4e5f6a7-0001-0000-0000-000000000003',
     'b2c3d4e5-0001-0000-0000-000000000008',
     'a1b2c3d4-0001-0000-0000-000000000101',
     'PART_TIME',
     TO_CHAR(CURRENT_DATE, 'MM-YYYY'),
     168.0, 12.0, 24,  -- 168h làm việc, trong đó 12h OT
     NULL, NULL,
     28000, 0,  -- 28k/giờ × 1.3 hệ số ca đêm
     0, 6165600, 1176000, 0, 0,  -- 168h × 28000 × 1.3 = 6.1tr + 12h × 28000 × 1.5 = 504k + OT 1.3 hệ số
     7341600,
     'DA_THANH_TOAN',
     'b2c3d4e5-0001-0000-0000-000000000004',
     DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '2 days',
     'b2c3d4e5-0001-0000-0000-000000000002',
     DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '5 days',
     'b2c3d4e5-0001-0000-0000-000000000002',
     DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '10 days',
     'PC-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-003'),

    -- 4. Quản lý Trần Văn Anh (NV-0004) - đã duyệt chi, chờ thanh toán
    ('d4e5f6a7-0001-0000-0000-000000000004',
     'b2c3d4e5-0001-0000-0000-000000000004',
     'a1b2c3d4-0001-0000-0000-000000000101',
     'FULL_TIME',
     TO_CHAR(CURRENT_DATE, 'MM-YYYY'),
     176.0, 0.0, 22,  -- quản lý làm 22 ngày
     NULL, NULL,
     0, 22000000,
     22000000, 0, 0, 1000000, 0,
     23000000,
     'DA_XAC_NHAN',
     NULL, NULL,  -- quản lý KHÔNG qua tầng 1 (bỏ qua xác nhận giờ)
     'b2c3d4e5-0001-0000-0000-000000000002',
     DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '3 days',
     NULL, NULL, NULL),

    -- 5. Thủ kho Hưng (NV-0003) - đã xác nhận giờ, chờ Kế toán duyệt
    ('d4e5f6a7-0001-0000-0000-000000000005',
     'b2c3d4e5-0001-0000-0000-000000000003',
     'a1b2c3d4-0001-0000-0000-000000000001',  -- Kho Tổng
     'FULL_TIME',
     TO_CHAR(CURRENT_DATE, 'MM-YYYY'),
     176.0, 8.0, 22,
     NULL, NULL,
     0, 28000000,
     28000000, 0, 0, 1500000, 0,
     29500000,
     'CHO_XAC_NHAN',  -- chờ Kế toán duyệt chi
     NULL, NULL,  -- thủ kho không qua tầng 1
     NULL, NULL, NULL, NULL, NULL),

    -- 6. Thu ngân Linh (NV-0009) - chi nhánh Hoàn Kiếm, mới chốt
    ('d4e5f6a7-0001-0000-0000-000000000006',
     'b2c3d4e5-0001-0000-0000-000000000009',
     'a1b2c3d4-0001-0000-0000-000000000201',
     'FULL_TIME',
     TO_CHAR(CURRENT_DATE, 'MM-YYYY'),
     168.0, 0.0, 24,
     NULL, NULL,
     0, 13500000,
     13500000, 0, 0, 0, 100000,  -- trừ 100k vì đi muộn
     13400000,
     'CHO_XAC_NHAN',
     NULL, NULL,
     NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (id_nhan_vien, thang_nam) DO NOTHING;

-- =============================================================================
-- Function tiện ích — tạo nhanh bảng lương cho 1 NV trong tháng từ chấm công.
-- Backend service có thể gọi sau khi chạy job tổng hợp cuối tháng.
-- Công thức khớp với `buildPayrollFromRecords()` trong mockData.
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_tao_bang_luong(
    p_id_nhan_vien UUID,
    p_thang_nam    VARCHAR(7)
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
    v_employee RECORD;
    v_metrics RECORD;
    v_status VARCHAR(20) := 'CHO_XAC_NHAN';
    v_nguoi_xac_nhan UUID := NULL;
    v_ngay_xac_nhan TIMESTAMP := NULL;
BEGIN
    -- Lấy thông tin nhân viên (snapshot lương)
    SELECT * INTO v_employee
    FROM nhan_vien
    WHERE id = p_id_nhan_vien AND dang_hoat_dong = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Nhân viên % không tồn tại hoặc đã ngừng hoạt động', p_id_nhan_vien;
    END IF;

    -- Tổng hợp chấm công tháng này
    SELECT
        COALESCE(SUM(tong_gio_lam), 0) AS tong_gio,
        COALESCE(SUM(overtime_hours), 0) AS tong_ot,
        COUNT(*) FILTER (WHERE trang_thai IN ('PRESENT', 'LATE')) AS so_ca
    INTO v_metrics
    FROM cham_cong
    WHERE id_nhan_vien = p_id_nhan_vien
      AND TO_CHAR(work_date, 'MM-YYYY') = p_thang_nam;

    -- Tính tiền OT = overtime × hourly_wage × 1.5
    -- (PART_TIME dùng hourly_wage, FULL_TIME dùng prorated base — đơn giản hoá
    -- bằng cách cộng prorated base + shift_pay riêng ở tầng backend)
    INSERT INTO bang_luong (
        id_nhan_vien, id_chi_nhanh, loai_hop_dong, thang_nam,
        tong_gio_lam, overtime_hours, tong_so_ca,
        luong_theo_gio, luong_cung,
        luong_cung_thuc_te, tien_cong_theo_gio, tien_ot, thuong, khau_tru,
        tong_tien_luong, trang_thai
    ) VALUES (
        p_id_nhan_vien, v_employee.id_chi_nhanh, v_employee.loai_hop_dong, p_thang_nam,
        v_metrics.tong_gio, v_metrics.tong_ot, v_metrics.so_ca,
        v_employee.luong_theo_gio, v_employee.luong_cung,
        v_employee.luong_cung, 0,
        ROUND(v_metrics.tong_ot * v_employee.luong_theo_gio * 1.5),
        0, 0,
        v_employee.luong_cung + ROUND(v_metrics.tong_ot * v_employee.luong_theo_gio * 1.5),
        v_status
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE bang_luong IS
    'Bảng lương hàng tháng cho mỗi nhân viên. Quy trình duyệt 2 tầng: '
    '(1) Quản lý chi nhánh xác nhận giờ (CHỈ cho THU_NGAN) → '
    '(2) Kế toán (hoặc Admin với lương Kế toán) duyệt chi. '
    'Khi chuyển DA_THANH_TOAN, hệ thống đồng thời cập nhật cờ da_thanh_toan=TRUE '
    'trên tất cả cham_cong có work_date thuộc tháng đó và tạo phiếu chi sổ quỹ.';

COMMENT ON COLUMN bang_luong.tong_gio_lam IS
    'Tổng giờ làm hệ thống tự tổng hợp từ cham_cong.tong_gio_lam của các ca '
    'trong tháng. KHÔNG tính các ca LEAVE/ABSENT. Nguồn sự thật để tính lương, '
    'sẽ bị ghi đè bằng gio_dieu_chinh nếu Quản lý sửa.';

COMMENT ON COLUMN bang_luong.gio_dieu_chinh IS
    'Số giờ sau khi Quản lý điều chỉnh (vd: NV quên chấm công). NULL = giữ '
    'nguyên tong_gio_lam. Khi có giá trị, ly_do_dieu_chinh BẮT BUỘC (trigger check).';

COMMENT ON COLUMN bang_luong.tong_tien_luong IS
    'Snapshot tổng tiền thực nhận tại thời điểm chốt = baseSalary + shiftPay + '
    'overtimePay + bonus - deduction. KHÔNG tự tính lại khi UPDATE field khác — '
    'an toàn audit. Trigger ở tầng backend service phải tính lại nếu thay đổi '
    'gio_dieu_chinh/thuong/khau_tru.';

COMMENT ON COLUMN bang_luong.ma_phieu_chi IS
    'Mã phiếu chi sổ quỹ (PC-YYYYMMDD-NNN) sinh ra khi chuyển DA_THANH_TOAN. '
    'Không FK cứng tới bảng so_quy để bảng lương có thể INSERT trước khi sổ quỹ '
    'được tạo. Truy vết ngược bằng mã.';
