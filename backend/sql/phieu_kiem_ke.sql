-- =============================================================================
-- Bảng: phieu_kiem_ke + chi_tiet_kiem_ke (cặp master-detail)
-- Mục đích: Kiểm kê định kỳ tại chi nhánh (Kho Tổng hoặc Cửa hàng).
--           So sánh tồn sổ sách (he_thong) vs tồn đếm tay (thuc_te), ghi lệch.
--           Khi cân bằng (status = DA_CAN_BANG): ghi the_kho ADJUSTMENT +
--           cập nhật ton_kho.so_luong_ton.
--
-- Chuẩn hoá theo:
--   - `co_so_du_lieu.md` mục "Bảng 9, 10 — phieu_kiem_ke / chi_tiet_kiem_ke"
--   - `frontend/src/types/inventoryTypes.ts` Stocktake + StocktakeLine
--   - `frontend/src/store/slices/stockSlice.ts` balanceAfterStocktake (pattern)
--   - `co_so_du_lieu.md:573-577` quy ước mã chứng từ: KK-YYYYMMDD-NNN
--
-- YÊU CẦU: Tất cả 11 file SQL trước.
--
-- Quy tắc nghiệp vụ:
--   1. Cho phép kiểm kê ở CẢ Kho Tổng VÀ Cửa hàng (khác với phieu_nhap/
--      phieu_xuat chỉ dành cho Kho Tổng).
--   2. Lệch = thuc_te - he_thong. trigger enforce so_luong_lech = thuc_te - he_thong.
--   3. BẮT BUỘC ghi lý do nếu so_luong_lech != 0.
--   4. Cân bằng chỉ chạy 1 lần (status DANG_KIEM_KE -> DA_CAN_BANG, không
--      cân bằng lại được).
--   5. Khi cân bằng, tạo the_kho (ADJUSTMENT) cho từng dòng có lệch,
--      cập nhật ton_kho.so_luong_ton = thuc_te.
-- =============================================================================

-- =============================================================================
-- BẢNG 1/2: phieu_kiem_ke (header)
-- =============================================================================
CREATE TABLE IF NOT EXISTS phieu_kiem_ke (
    -- Khoá chính
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Mã phiếu dạng 'KK-20260826-001'. UNIQUE, sinh tự động bởi trigger.
    ma_phieu        VARCHAR(50)  NOT NULL UNIQUE,

    -- FK tới chi nhánh kiểm kê. Cho phép CẢ KHO_TONG và CUA_HANG_BAN_LE
    -- (khác với phieu_nhap chỉ cho KHO_TONG).
    id_chi_nhanh    UUID         NOT NULL REFERENCES chi_nhanh(id)
                                ON DELETE RESTRICT
                                ON UPDATE CASCADE,

    -- Người tạo phiếu (Thủ kho hoặc Quản lý chi nhánh tuỳ nơi kiểm kê).
    id_nguoi_tao    UUID         NOT NULL REFERENCES nhan_vien(id)
                                ON DELETE RESTRICT
                                ON UPDATE CASCADE,
    -- Người duyệt cân bằng (sau khi kiểm kê xong, cấp cao hơn duyệt).
    -- VD: Thủ kho kiểm kê Kho Tổng → Admin/Quản lý duyệt.
    --     Quản lý chi nhánh kiểm kê cửa hàng → Admin duyệt.
    -- NULL = chưa duyệt.
    id_nguoi_duyet   UUID         REFERENCES nhan_vien(id)
                                ON DELETE SET NULL
                                ON UPDATE CASCADE,

    -- Ngày kiểm kê (ngày đếm tay). Mặc định = hôm nay.
    ngay_kiem_ke    DATE         NOT NULL DEFAULT CURRENT_DATE,
    -- Ngày cân bằng (ngày ghi ADJUSTMENT vào the_kho). NULL = chưa cân bằng.
    ngay_can_bang   DATE,

    -- CHECK ngay_can_bang >= ngay_kiem_ke (không cân bằng trước khi đếm)
    CONSTRAINT chk_ngay_can_bang_hop_ly CHECK (
        ngay_can_bang IS NULL OR ngay_can_bang >= ngay_kiem_ke
    ),

    -- ===== TRẠNG THÁI =====
    -- DANG_KIEM_KE: đang đếm, có thể thêm/sửa lines
    -- DA_CAN_BANG:  đã cân bằng xong, tồn kho đã cập nhật, KHÔNG sửa được
    -- CANCELLED:    huỷ phiếu (kiểm kê nhầm ngày, sai chi nhánh)
    trang_thai      VARCHAR(20)  NOT NULL DEFAULT 'DANG_KIEM_KE'
                   CHECK (trang_thai IN ('DANG_KIEM_KE', 'DA_CAN_BANG', 'CANCELLED')),

    -- CHECK khi DA_CAN_BANG thì PHẢI có ngay_can_bang + id_nguoi_duyet
    CONSTRAINT chk_can_bang_co_ngay_va_nguoi CHECK (
        trang_thai != 'DA_CAN_BANG' OR (ngay_can_bang IS NOT NULL AND id_nguoi_duyet IS NOT NULL)
    ),

    ghi_chu         TEXT,

    ngay_tao        TIMESTAMP    NOT NULL DEFAULT NOW(),
    ngay_cap_nhat   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Tái sử dụng trigger function
DROP TRIGGER IF EXISTS phieu_kiem_ke_set_ngay_cap_nhat ON phieu_kiem_ke;
CREATE TRIGGER phieu_kiem_ke_set_ngay_cap_nhat
    BEFORE UPDATE ON phieu_kiem_ke
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_ngay_cap_nhat();

-- =============================================================================
-- Trigger sinh mã phiếu tự động 'KK-YYYYMMDD-NNN'
-- =============================================================================
CREATE OR REPLACE FUNCTION trg_phieu_kiem_ke_sinh_ma()
RETURNS TRIGGER AS $$
DECLARE
    v_count INTEGER;
    v_date_str VARCHAR(8);
BEGIN
    IF NEW.ma_phieu IS NOT NULL AND NEW.ma_phieu <> '' THEN
        RETURN NEW;
    END IF;

    v_date_str := TO_CHAR(NEW.ngay_kiem_ke, 'YYYYMMDD');
    SELECT COUNT(*) + 1 INTO v_count
    FROM phieu_kiem_ke
    WHERE ma_phieu LIKE 'KK-' || v_date_str || '-%';

    NEW.ma_phieu := 'KK-' || v_date_str || '-' || LPAD(v_count::TEXT, 3, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS phieu_kiem_ke_sinh_ma ON phieu_kiem_ke;
CREATE TRIGGER phieu_kiem_ke_sinh_ma
    BEFORE INSERT ON phieu_kiem_ke
    FOR EACH ROW
    EXECUTE FUNCTION trg_phieu_kiem_ke_sinh_ma();

-- =============================================================================
-- Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_phieu_kiem_ke_ngay
    ON phieu_kiem_ke (ngay_kiem_ke DESC);

CREATE INDEX IF NOT EXISTS idx_phieu_kiem_ke_chi_nhanh
    ON phieu_kiem_ke (id_chi_nhanh, ngay_kiem_ke DESC);

CREATE INDEX IF NOT EXISTS idx_phieu_kiem_ke_dang
    ON phieu_kiem_ke (trang_thai, ngay_kiem_ke) WHERE trang_thai = 'DANG_KIEM_KE';

-- =============================================================================
-- BẢNG 2/2: chi_tiet_kiem_ke (lines)
-- =============================================================================
CREATE TABLE IF NOT EXISTS chi_tiet_kiem_ke (
    -- Khoá chính
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

    -- FK tới header. ON DELETE CASCADE: xoá phiếu → xoá lines.
    id_phieu_kiem_ke UUID        NOT NULL REFERENCES phieu_kiem_ke(id)
                                ON DELETE CASCADE
                                ON UPDATE CASCADE,

    -- FK tới sản phẩm
    id_san_pham     UUID         NOT NULL REFERENCES san_pham(id)
                                ON DELETE RESTRICT
                                ON UPDATE CASCADE,

    -- ===== SỐ LƯỢNG =====
    -- Tồn theo sổ sách tại thời điểm bắt đầu đếm. Snapshot từ ton_kho.
    -- CHECK >= 0 — tồn sổ sách không âm (đã enforce ở ton_kho).
    ton_he_thong    INTEGER      NOT NULL CHECK (ton_he_thong >= 0),
    -- Tồn đếm thực tế bằng tay. Có thể âm (lỗi nhập), nhưng trong thực tế
    -- CHECK >= 0 cũng OK. Để linh hoạt cho phép COUNTED = 0 (hết hàng).
    ton_thuc_te     INTEGER      NOT NULL CHECK (ton_thuc_te >= 0),

    -- Lệch = ton_thuc_te - ton_he_thong. Dương = thừa, âm = thiếu (hao hụt).
    -- DENORMALIZED — trigger BEFORE INSERT/UPDATE tự tính.
    so_luong_lech   INTEGER      NOT NULL,
    -- CHECK so_luong_lech = ton_thuc_te - ton_he_thong
    CONSTRAINT chk_lech_dung CHECK (so_luong_lech = ton_thuc_te - ton_he_thong),

    -- Lý do lệch: BẮT BUỘC ghi nếu so_luong_lech != 0.
    -- trigger kiểm tra bên dưới (CHECK không viết được IF/ELSE).
    ly_do_lech      TEXT,

    -- Đơn giá vốn (snapshot tại thời điểm kiểm kê, lấy từ ton_kho).
    -- Dùng tính giá trị lệch khi cân bằng.
    don_gia_von     DECIMAL(12,0) NOT NULL CHECK (don_gia_von >= 0),

    -- Giá trị lệch = so_luong_lech × don_gia_von. DENORMALIZED.
    -- Trigger BEFORE INSERT/UPDATE tự tính.
    -- Thường âm (hao hụt) nhưng có thể dương (thừa do nhập sai trước đó).
    gia_tri_lech    DECIMAL(15,0) NOT NULL,

    ngay_tao        TIMESTAMP    NOT NULL DEFAULT NOW(),

    -- 1 SP không xuất hiện 2 lần trong 1 phiếu. UNIQUE.
    CONSTRAINT uq_chi_tiet_kiem_ke_sp UNIQUE (id_phieu_kiem_ke, id_san_pham)
);

-- Trigger tự tính `so_luong_lech` và `gia_tri_lech`
CREATE OR REPLACE FUNCTION trg_chi_tiet_kiem_ke_tinh()
RETURNS TRIGGER AS $$
BEGIN
    NEW.so_luong_lech := NEW.ton_thuc_te - NEW.ton_he_thong;
    NEW.gia_tri_lech := NEW.so_luong_lech * NEW.don_gia_von;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chi_tiet_kiem_ke_tinh ON chi_tiet_kiem_ke;
CREATE TRIGGER chi_tiet_kiem_ke_tinh
    BEFORE INSERT OR UPDATE OF ton_he_thong, ton_thuc_te, don_gia_von ON chi_tiet_kiem_ke
    FOR EACH ROW
    EXECUTE FUNCTION trg_chi_tiet_kiem_ke_tinh();

-- Trigger BẮT BUỘC lý do nếu lệch
CREATE OR REPLACE FUNCTION trg_chi_tiet_kiem_ke_check_ly_do()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.so_luong_lech <> 0
       AND (NEW.ly_do_lech IS NULL OR TRIM(NEW.ly_do_lech) = '') THEN
        RAISE EXCEPTION 'Phải ghi lý do khi tồn lệch (NV/SP %, lệch % đơn vị)',
            NEW.id_san_pham, NEW.so_luong_lech;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chi_tiet_kiem_ke_check_ly_do ON chi_tiet_kiem_ke;
CREATE TRIGGER chi_tiet_kiem_ke_check_ly_do
    BEFORE INSERT OR UPDATE ON chi_tiet_kiem_ke
    FOR EACH ROW
    EXECUTE FUNCTION trg_chi_tiet_kiem_ke_check_ly_do();

CREATE INDEX IF NOT EXISTS idx_ct_kiem_ke_sp
    ON chi_tiet_kiem_ke (id_san_pham);

-- =============================================================================
-- FUNCTION ĐỒNG BỘ: cân bằng kiểm kê end-to-end (1 transaction)
-- Gọi từ backend service, làm 3 việc:
--   1. UPDATE phieu_kiem_ke: status=DA_CAN_BANG, set ngày + người duyệt
--   2. Với từng line có lệch != 0: ghi the_kho (ADJUSTMENT) + cập nhật ton_kho
--   3. Đối với line không lệch: KHÔNG đụng vào tồn (giữ nguyên)
--
-- Lưu ý: function KHÔNG tự UPDATE ton_kho.so_luong_ton = ton_thuc_te trực tiếp
-- (vì sẽ xung đột với fn_ghi_the_kho_va_dieu_chinh_ton). Thay vào đó:
--   - Lệch dương (thuc_te > he_thong): ADJUSTMENT với so_luong = +lech (cộng tồn)
--   - Lệch âm (thuc_te < he_thong): ADJUSTMENT với so_luong = +lech (âm, trừ tồn)
--   - Lệch = 0: KHÔNG ghi ADJUSTMENT
-- =============================================================================
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
    -- 1. Lấy header và khoá row
    SELECT * INTO v_phieu
    FROM phieu_kiem_ke
    WHERE id = p_id_phieu
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy phiếu kiểm kê %', p_id_phieu;
    END IF;

    IF v_phieu.trang_thai != 'DANG_KIEM_KE' THEN
        RAISE EXCEPTION 'Phiếu phải ở trạng thái DANG_KIEM_KE. Hiện tại: %',
            v_phieu.trang_thai;
    END IF;

    v_ma_chung_tu := v_phieu.ma_phieu;

    -- 2. UPDATE header
    UPDATE phieu_kiem_ke
    SET trang_thai = 'DA_CAN_BANG',
        ngay_can_bang = p_ngay_can_bang,
        id_nguoi_duyet = p_id_nguoi_duyet,
        ghi_chu = COALESCE(p_ghi_chu, ghi_chu)
    WHERE id = p_id_phieu;

    -- 3. Với từng line có lệch: ghi ADJUSTMENT
    FOR v_line IN SELECT * FROM chi_tiet_kiem_ke WHERE id_phieu_kiem_ke = p_id_phieu
    LOOP
        IF v_line.so_luong_lech <> 0 THEN
            -- ADJUSTMENT ghi the_kho với so_luong = lệch (+dương nếu thừa, âm nếu thiếu).
            -- fn_ghi_the_kho_va_dieu_chinh_ton() sẽ tự cập nhật ton_kho.
            PERFORM fn_ghi_the_kho_va_dieu_chinh_ton(
                v_line.id_san_pham,
                v_phieu.id_chi_nhanh,
                'ADJUSTMENT',
                v_line.so_luong_lech,  -- có thể âm hoặc dương
                v_line.don_gia_von,
                v_ma_chung_tu,
                p_nguoi_thuc_hien,
                NULL,  -- ADJUSTMENT không có HSD
                'Cân bằng kiểm kê: lệch ' || v_line.so_luong_lech || ' đơn vị. Lý do: ' || COALESCE(v_line.ly_do_lech, ''),
                p_ngay_can_bang::TIMESTAMP
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Dữ liệu mẫu — 1 phiếu kiểm kê ĐANG thực hiện (DANG_KIEM_KE) + 1 phiếu đã cân bằng
-- =============================================================================

-- Phiếu 1: DANG_KIEM_KE — Thủ kho đang đếm tại Kho Tổng
INSERT INTO phieu_kiem_ke
    (id_chi_nhanh, id_nguoi_tao, ngay_kiem_ke, trang_thai, ghi_chu)
VALUES
    ('00000000-0000-0000-0000-000000000020',
     'a1b2c3d4-0001-0000-0000-000000000001',  -- Kho Tổng
     'b2c3d4e5-0001-0000-0000-000000000003',  -- Thủ kho Phạm Quốc Hưng
     CURRENT_DATE, 'DANG_KIEM_KE',
     'Kiểm kê cuối tháng tại Kho Tổng');

UPDATE phieu_kiem_ke
SET ma_phieu = 'KK-' || TO_CHAR(ngay_kiem_ke, 'YYYYMMDD') || '-001'
WHERE id = '00000000-0000-0000-0000-000000000020';

INSERT INTO chi_tiet_kiem_ke
    (id_phieu_kiem_ke, id_san_pham, ton_he_thong, ton_thuc_te,
     don_gia_von, ly_do_lech)
VALUES
    -- 1200 lon Coca: đếm thực tế 1198 (hao hụt 2 lon)
    ('00000000-0000-0000-0000-000000000020',
     'f6a7b8c9-0001-0000-0000-000000000010', 1200, 1198, 9500,
     'Hao hụt 2 lon do vỡ trong kho'),
    -- 600 gói Oishi: đếm thực tế 600 (khớp)
    ('00000000-0000-0000-0000-000000000020',
     'f6a7b8c9-0001-0000-0000-000000000030', 600, 600, 6500, NULL),
    -- 800 gói mì Hảo Hảo: đếm thực tế 803 (thừa 3 gói do nhập trước đó sai)
    ('00000000-0000-0000-0000-000000000020',
     'f6a7b8c9-0001-0000-0000-000000000050', 800, 803, 4500,
     'Thừa 3 gói do lệch khi nhập từ phiếu PN-20260801-001');

-- Phiếu 2: DA_CAN_BANG — Quản lý Bùi Viện kiểm kê cửa hàng, đã cân bằng
INSERT INTO phieu_kiem_ke
    (id_chi_nhanh, id_nguoi_tao, id_nguoi_duyet,
     ngay_kiem_ke, ngay_can_bang, trang_thai, ghi_chu)
VALUES
    ('00000000-0000-0000-0000-000000000021',
     'a1b2c3d4-0001-0000-0000-000000000101',  -- Bùi Viện
     'b2c3d4e5-0001-0000-0000-000000000004',  -- Quản lý Trần Văn Anh (tạo)
     'b2c3d4e5-0001-0000-0000-000000000001',  -- Admin (duyệt)
     CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE - INTERVAL '2 days',
     'DA_CAN_BANG', 'Kiểm kê tuần tại cửa hàng Bùi Viện');

UPDATE phieu_kiem_ke
SET ma_phieu = 'KK-' || TO_CHAR(ngay_kiem_ke, 'YYYYMMDD') || '-001'
WHERE id = '00000000-0000-0000-0000-000000000021';

INSERT INTO chi_tiet_kiem_ke
    (id_phieu_kiem_ke, id_san_pham, ton_he_thong, ton_thuc_te,
     don_gia_von, ly_do_lech)
VALUES
    -- 85 lon Coca: đếm 83 (hao hụt 2)
    ('00000000-0000-0000-0000-000000000021',
     'f6a7b8c9-0001-0000-0000-000000000010', 85, 83, 9500,
     'Hao hụt 2 lon do khách làm đổ'),
    -- 120 chai Aquafina: đếm 120 (khớp)
    ('00000000-0000-0000-0000-000000000021',
     'f6a7b8c9-0001-0000-0000-000000000012', 120, 120, 5000, NULL),
    -- 8 hộp Vinamilk: đếm 7 (hao hụt 1)
    ('00000000-0000-0000-0000-000000000021',
     'f6a7b8c9-0001-0000-0000-000000000040', 8, 7, 26000,
     'Hao hụt 1 hộp do HSD trôi');

COMMENT ON TABLE phieu_kiem_ke IS
    'Phiếu kiểm kê định kỳ tại chi nhánh (Kho Tổng hoặc Cửa hàng). So sánh '
    'tồn sổ sách với tồn đếm tay, ghi lệch. 3 trạng thái: DANG_KIEM_KE (đang '
    'đếm), DA_CAN_BANG (đã cân bằng — tồn đã cập nhật, KHÔNG sửa được), '
    'CANCELLED (huỷ). Khi cân bằng, function `fn_can_bang_kiem_ke` ghi '
    'the_kho ADJUSTMENT cho từng dòng có lệch (âm/dương) và cập nhật ton_kho.';

COMMENT ON COLUMN phieu_kiem_ke.trang_thai IS
    'DANG_KIEM_KE: có thể thêm/sửa lines. DA_CAN_BANG: đã cân bằng, '
    'TON KHO ĐÃ THAY ĐỔI — không sửa được nữa (nếu sai phải tạo phiếu mới). '
    'CANCELLED: huỷ phiếu. CHECK constraint đảm bảo DA_CAN_BANG phải có '
    'ngay_can_bang + id_nguoi_duyet.';

COMMENT ON COLUMN phieu_kiem_ke.ma_phieu IS
    'Mã phiếu dạng KK-YYYYMMDD-NNN (xem co_so_du_lieu.md quy ước mã '
    'chứng từ). Trigger `trg_phieu_kiem_ke_sinh_ma` sinh tự động nếu NULL.';

COMMENT ON TABLE chi_tiet_kiem_ke IS
    'Từng dòng sản phẩm trong phiếu kiểm kê. Snapshot tồn sổ sách (ton_he_thong) '
    'lúc bắt đầu đếm + tồn đếm tay (ton_thuc_te). Lệch = thuc_te - he_thong, '
    'trigger tự tính. CHECK constraint enforce công thức. BẮT BUỘC ghi lý_do_lech '
    'nếu lệch != 0 (trigger check). UNIQUE (id_phieu, id_san_pham) chống trùng.';

COMMENT ON COLUMN chi_tiet_kiem_ke.ton_he_thong IS
    'Tồn sổ sách tại thời điểm BẮT ĐẦU kiểm kê — snapshot từ ton_kho. '
    'Lưu riêng (không JOIN lúc xem) để nếu sau này tồn thay đổi (do xuất bán '
    'trong lúc đếm) thì lệch vẫn khớp với thời điểm bắt đầu.';

COMMENT ON COLUMN chi_tiet_kiem_ke.ly_do_lech IS
    'BẮT BUỘC ghi nếu so_luong_lech != 0 (trigger `trg_chi_tiet_kiem_ke_check_ly_do`). '
    'Lý do phổ biến: hao hụt (hết HSD, vỡ), thất thoát, nhập sai hệ thống '
    'trước đó, đếm sai... Audit bắt buộc để điều tra nguyên nhân gốc.';

COMMENT ON COLUMN chi_tiet_kiem_ke.don_gia_von IS
    'Đơn giá vốn snapshot từ ton_kho.gia_von_trung_binh tại thời điểm đếm. '
    'Dùng tính gia_tri_lech = so_luong_lech × don_gia_von. Khi cân bằng, '
    'ghi the_kho ADJUSTMENT với đơn giá này để audit.';

COMMENT ON COLUMN chi_tiet_kiem_ke.gia_tri_lech IS
    'Giá trị lệch = so_luong_lech × don_gia_von. DENORMALIZED, trigger BEFORE '
    'INSERT/UPDATE tự tính. Thường âm (hao hụt) nhưng có thể dương (thừa). '
    'Dashboard dùng sum(gia_tri_lech) để hiển thị "tổng hao hụt kỳ này".';
