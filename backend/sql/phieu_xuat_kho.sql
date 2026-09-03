-- =============================================================================
-- Bảng: phieu_xuat_kho + chi_tiet_phieu_xuat (cặp master-detail)
-- Mục đích: Phiếu xuất hàng từ Kho Tổng → Cửa hàng bán lẻ (BR-06).
--           Tạo 2 dòng thẻ kho: TRANSFER_OUT (Kho Tổng) + TRANSFER_IN (Cửa hàng).
--
-- Chuẩn hoá theo:
--   - `co_so_du_lieu.md` mục "Bảng 16, 17 — phieu_xuat_kho / chi_tiet_phieu_xuat"
--   - `frontend/src/types/inventoryTypes.ts` StockTransfer + TransferLine
--   - `frontend/src/store/slices/transferSlice.ts` (3 trạng thái, không chỉ HOAN_THANH)
--   - `kenh_truc_ky_thuat.md`: "BR-06: chỉ đi từ Kho Tổng ra cửa hàng bán lẻ"
--
-- YÊU CẦU: Tất cả 10 file SQL trước.
--
-- Quy tắc nghiệp vụ:
--   1. BR-06: chi nhánh xuất PHẢI là KHO_TONG.
--   2. BR-06: chi nhánh nhận PHẢI là CUA_HANG_BAN_LE.
--   3. 2 chi nhánh phải KHÁC NHAU.
--   4. 3 SL: requested (yêu cầu), shipped (xuất thực tế từ kho), received
--      (nhận thực tế tại cửa hàng). Mặc định shipped = requested, received = shipped.
--   5. status PENDING: chỉ ghi nhận, KHÔNG cập nhật tồn kho.
--      status COMPLETED: ghi the_kho (2 dòng) + cập nhật ton_kho (2 nơi).
-- =============================================================================

-- =============================================================================
-- BẢNG 1/2: phieu_xuat_kho (header)
-- =============================================================================
CREATE TABLE IF NOT EXISTS phieu_xuat_kho (
    -- Khoá chính
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Mã phiếu dạng 'PX-20260826-001'. UNIQUE, sinh tự động bởi trigger.
    ma_phieu        VARCHAR(50)  NOT NULL UNIQUE,

    -- ===== FK CHI NHÁNH =====
    -- BR-06: id_chi_nhanh_xuat PHẢI là KHO_TONG.
    id_chi_nhanh_xuat UUID        NOT NULL REFERENCES chi_nhanh(id)
                                ON DELETE RESTRICT
                                ON UPDATE CASCADE,
    -- BR-06: id_chi_nhanh_nhan PHẢI là CUA_HANG_BAN_LE.
    id_chi_nhanh_nhan UUID        NOT NULL REFERENCES chi_nhanh(id)
                                ON DELETE RESTRICT
                                ON UPDATE CASCADE,

    -- CHECK 2 chi nhánh phải KHÁC NHAU.
    CONSTRAINT chk_xuat_va_nhan_khac_nhau CHECK (id_chi_nhanh_xuat <> id_chi_nhanh_nhan),

    -- Người tạo phiếu (thường là thu kho/ quản lý). Tại thời điểm PENDING có
    -- thể là Quản lý chi nhánh (tạo yêu cầu); tại COMPLETED là Thủ kho duyệt.
    id_nguoi_tao    UUID         NOT NULL REFERENCES nhan_vien(id)
                                ON DELETE RESTRICT
                                ON UPDATE CASCADE,
    -- Người duyệt xuất (thường là Thủ kho). NULL = phiếu chưa duyệt.
    id_nguoi_duyet   UUID         REFERENCES nhan_vien(id)
                                ON DELETE SET NULL
                                ON UPDATE CASCADE,
    -- Người xác nhận nhận hàng tại cửa hàng (thường là Quản lý/Thu ngân).
    -- NULL = chưa xác nhận nhận.
    id_nguoi_nhan   UUID         REFERENCES nhan_vien(id)
                                ON DELETE SET NULL
                                ON UPDATE CASCADE,

    -- ===== NGÀY THÁNG =====
    -- Ngày yêu cầu (ngày tạo phiếu). Mặc định = hôm nay.
    ngay_yeu_cau    DATE         NOT NULL DEFAULT CURRENT_DATE,
    -- Ngày xuất thực tế từ kho. NULL = phiếu chưa xuất.
    ngay_xuat_thuc_te DATE,
    -- Ngày cửa hàng nhận được hàng. NULL = chưa nhận.
    ngay_nhan_thuc_te DATE,

    -- CHECK ngày xuất >= ngày yêu cầu (không xuất trước khi tạo phiếu)
    CONSTRAINT chk_ngay_xuat_hop_ly CHECK (
        ngay_xuat_thuc_te IS NULL OR ngay_xuat_thuc_te >= ngay_yeu_cau
    ),
    -- CHECK ngày nhận >= ngày xuất (không nhận trước khi xuất)
    CONSTRAINT chk_ngay_nhan_hop_ly CHECK (
        ngay_nhan_thuc_te IS NULL
        OR (ngay_xuat_thuc_te IS NOT NULL AND ngay_nhan_thuc_te >= ngay_xuat_thuc_te)
    ),

    -- ===== TRẠNG THÁI =====
    -- 3 trạng thái (frontend `transferSlice.ts:180-188`):
    --   PENDING:   mới tạo yêu cầu, chờ Thủ kho duyệt
    --   COMPLETED: đã duyệt + xuất + nhận, tồn kho đã thay đổi
    --   CANCELLED: bị huỷ (hết hàng / chi nhánh đóng)
    -- Spec backend chỉ có HOAN_THANH nhưng frontend + nghiệp vụ cần đủ 3.
    trang_thai      VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                   CHECK (trang_thai IN ('PENDING', 'COMPLETED', 'CANCELLED')),

    -- CHECK ngày xuất phải có khi status = COMPLETED.
    CONSTRAINT chk_completed_co_ngay_xuat CHECK (
        trang_thai != 'COMPLETED' OR ngay_xuat_thuc_te IS NOT NULL
    ),
    -- CHECK ngày nhận phải có khi status = COMPLETED.
    CONSTRAINT chk_completed_co_ngay_nhan CHECK (
        trang_thai != 'COMPLETED' OR ngay_nhan_thuc_te IS NOT NULL
    ),
    -- CHECK người duyệt phải có khi COMPLETED.
    CONSTRAINT chk_completed_co_nguoi_duyet CHECK (
        trang_thai != 'COMPLETED' OR id_nguoi_duyet IS NOT NULL
    ),

    ghi_chu         TEXT,

    ngay_tao        TIMESTAMP    NOT NULL DEFAULT NOW(),
    ngay_cap_nhat   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Tái sử dụng trigger function
DROP TRIGGER IF EXISTS phieu_xuat_kho_set_ngay_cap_nhat ON phieu_xuat_kho;
CREATE TRIGGER phieu_xuat_kho_set_ngay_cap_nhat
    BEFORE UPDATE ON phieu_xuat_kho
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_ngay_cap_nhat();

-- =============================================================================
-- Trigger QUAN TRỌNG #1: enforce BR-06
--   - id_chi_nhanh_xuat phải là KHO_TONG
--   - id_chi_nhanh_nhan phải là CUA_HANG_BAN_LE
-- =============================================================================
CREATE OR REPLACE FUNCTION trg_phieu_xuat_check_br06()
RETURNS TRIGGER AS $$
DECLARE
    v_loai_xuat VARCHAR(20);
    v_loai_nhan VARCHAR(20);
BEGIN
    SELECT loai INTO v_loai_xuat
    FROM chi_nhanh WHERE id = NEW.id_chi_nhanh_xuat;
    SELECT loai INTO v_loai_nhan
    FROM chi_nhanh WHERE id = NEW.id_chi_nhanh_nhan;

    IF v_loai_xuat <> 'KHO_TONG' THEN
        RAISE EXCEPTION 'BR-06: Chi nhánh XUẤT phải là KHO_TỔNG. '
            'Hiện tại "%" có loai = %', NEW.id_chi_nhanh_xuat, v_loai_xuat;
    END IF;

    IF v_loai_nhan <> 'CUA_HANG_BAN_LE' THEN
        RAISE EXCEPTION 'BR-06: Chi nhánh NHẬN phải là CỬA HÀNG BÁN LẺ. '
            'Hiện tại "%" có loai = %', NEW.id_chi_nhanh_nhan, v_loai_nhan;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS phieu_xuat_check_br06 ON phieu_xuat_kho;
CREATE TRIGGER phieu_xuat_check_br06
    BEFORE INSERT OR UPDATE OF id_chi_nhanh_xuat, id_chi_nhanh_nhan ON phieu_xuat_kho
    FOR EACH ROW
    EXECUTE FUNCTION trg_phieu_xuat_check_br06();

-- =============================================================================
-- Trigger QUAN TRỌNG #2: sinh mã phiếu tự động 'PX-YYYYMMDD-NNN'
-- =============================================================================
CREATE OR REPLACE FUNCTION trg_phieu_xuat_sinh_ma()
RETURNS TRIGGER AS $$
DECLARE
    v_count INTEGER;
    v_date_str VARCHAR(8);
BEGIN
    IF NEW.ma_phieu IS NOT NULL AND NEW.ma_phieu <> '' THEN
        RETURN NEW;
    END IF;

    v_date_str := TO_CHAR(NEW.ngay_yeu_cau, 'YYYYMMDD');
    SELECT COUNT(*) + 1 INTO v_count
    FROM phieu_xuat_kho
    WHERE ma_phieu LIKE 'PX-' || v_date_str || '-%';

    NEW.ma_phieu := 'PX-' || v_date_str || '-' || LPAD(v_count::TEXT, 3, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS phieu_xuat_sinh_ma ON phieu_xuat_kho;
CREATE TRIGGER phieu_xuat_sinh_ma
    BEFORE INSERT ON phieu_xuat_kho
    FOR EACH ROW
    EXECUTE FUNCTION trg_phieu_xuat_sinh_ma();

-- =============================================================================
-- Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_phieu_xuat_kho_ngay_yeu_cau
    ON phieu_xuat_kho (ngay_yeu_cau DESC);

CREATE INDEX IF NOT EXISTS idx_phieu_xuat_kho_xuat
    ON phieu_xuat_kho (id_chi_nhanh_xuat, ngay_yeu_cau DESC);

CREATE INDEX IF NOT EXISTS idx_phieu_xuat_kho_nhan
    ON phieu_xuat_kho (id_chi_nhanh_nhan, ngay_yeu_cau DESC);

CREATE INDEX IF NOT EXISTS idx_phieu_xuat_kho_cho_duyet
    ON phieu_xuat_kho (trang_thai, ngay_yeu_cau) WHERE trang_thai = 'PENDING';

-- =============================================================================
-- BẢNG 2/2: chi_tiet_phieu_xuat (lines)
-- =============================================================================
CREATE TABLE IF NOT EXISTS chi_tiet_phieu_xuat (
    -- Khoá chính
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

    -- FK tới header. ON DELETE CASCADE: xoá phiếu → xoá lines.
    id_phieu_xuat   UUID         NOT NULL REFERENCES phieu_xuat_kho(id)
                                ON DELETE CASCADE
                                ON UPDATE CASCADE,

    -- FK tới sản phẩm
    id_san_pham     UUID         NOT NULL REFERENCES san_pham(id)
                                ON DELETE RESTRICT
                                ON UPDATE CASCADE,

    -- ===== 3 SỐ LƯỢNG =====
    -- Yêu cầu ban đầu (do Quản lý chi nhánh tạo).
    so_luong_yeu_cau INTEGER      NOT NULL CHECK (so_luong_yeu_cau > 0),
    -- Thực xuất từ kho (do Thủ kho duyệt). Có thể < yêu cầu nếu kho thiếu.
    so_luong_xuat    INTEGER      NOT NULL CHECK (so_luong_xuat >= 0),
    -- Thực nhận tại cửa hàng. Có thể < xuất nếu hàng bị hư/sai trên đường.
    so_luong_nhan   INTEGER      NOT NULL CHECK (so_luong_nhan >= 0),
    -- CHECK shipped <= requested
    CONSTRAINT chk_xuat_khong_vuot_yeu_cau CHECK (so_luong_xuat <= so_luong_yeu_cau),
    -- CHECK received <= shipped
    CONSTRAINT chk_nhan_khong_vuot_xuat CHECK (so_luong_nhan <= so_luong_xuat),
    -- CHECK mặc định received = shipped, override sau nếu có chênh lệch
    -- (không enforce, cho phép backend cập nhật sau)

    -- Đơn giá vốn (snapshot tại thời điểm xuất). Dùng tính thành tiền line.
    -- Lấy từ ton_kho.gia_von_trung_binh tại chi nhánh xuất.
    don_gia_von     DECIMAL(12,0) NOT NULL CHECK (don_gia_von >= 0),

    -- Thành tiền = so_luong_xuat × don_gia_von. DENORMALIZED.
    -- Trigger BEFORE INSERT/UPDATE tự tính.
    thanh_tien      DECIMAL(15,0) NOT NULL CHECK (thanh_tien >= 0),

    -- HSD của lô xuất (nếu có). Dùng cập nhật ton_kho.han_su_dung_gan_nhat
    -- tại cửa hàng nhận.
    han_su_dung     DATE,

    -- Số thứ tự dòng trong phiếu.
    thu_tu          INTEGER      NOT NULL DEFAULT 0 CHECK (thu_tu >= 0),

    ngay_tao        TIMESTAMP    NOT NULL DEFAULT NOW(),

    -- 1 SP không xuất hiện 2 lần trong cùng 1 phiếu. UNIQUE.
    CONSTRAINT uq_chi_tiet_phieu_xuat_sp UNIQUE (id_phieu_xuat, id_san_pham)
);

-- Trigger tự tính `thanh_tien = so_luong_xuat × don_gia_von`
CREATE OR REPLACE FUNCTION trg_chi_tiet_phieu_xuat_tinh_tien()
RETURNS TRIGGER AS $$
BEGIN
    NEW.thanh_tien := NEW.so_luong_xuat * NEW.don_gia_von;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chi_tiet_phieu_xuat_tinh_tien ON chi_tiet_phieu_xuat;
CREATE TRIGGER chi_tiet_phieu_xuat_tinh_tien
    BEFORE INSERT OR UPDATE OF so_luong_xuat, don_gia_von ON chi_tiet_phieu_xuat
    FOR EACH ROW
    EXECUTE FUNCTION trg_chi_tiet_phieu_xuat_tinh_tien();

CREATE INDEX IF NOT EXISTS idx_ct_phieu_xuat_sp
    ON chi_tiet_phieu_xuat (id_san_pham);

-- =============================================================================
-- FUNCTION ĐỒNG BỘ: xuất kho nội bộ end-to-end (1 transaction)
-- Gọi từ backend service, làm 4 việc:
--   1. INSERT phieu_xuat_kho (header)
--   2. INSERT các chi_tiet_phieu_xuat (lines)
--   3. Khi status = COMPLETED:
--      a. INSERT the_kho (TRANSFER_OUT) cho từng line tại kho xuất
--      b. INSERT the_kho (TRANSFER_IN) cho từng line tại kho nhận
--      c. Cập nhật ton_kho (trừ ở kho xuất, cộng ở kho nhận)
--   4. Khi status = PENDING: KHÔNG đụng tồn kho (chờ duyệt)
-- Trả về UUID của phieu_xuat_kho vừa tạo.
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_luu_chuyen_noi_bo(
    p_id_chi_nhanh_xuat UUID,
    p_id_chi_nhanh_nhan UUID,
    p_id_nguoi_tao      UUID,
    p_ngay_yeu_cau      DATE DEFAULT CURRENT_DATE,
    p_ghi_chu          TEXT DEFAULT NULL,
    p_nguoi_thuc_hien   VARCHAR(255) DEFAULT 'Hệ thống',
    p_lines JSONB DEFAULT '[]'::JSONB
    -- Format lines: [{"id_san_pham":"...", "so_luong_yeu_cau": 50,
    --                 "so_luong_xuat": 50, "so_luong_nhan": 50,
    --                 "don_gia_von": 9500, "han_su_dung": null}]
    -- so_luong_nhan có thể NULL (sẽ = so_luong_xuat)
    -- han_su_dung có thể NULL
) RETURNS UUID AS $$
DECLARE
    v_id_phieu UUID;
    v_line JSONB;
    v_ma_chung_tu VARCHAR(50);
    v_ngay_xuat DATE := p_ngay_yeu_cau;  -- mặc định = ngày yêu cầu
BEGIN
    -- 1. INSERT header (PENDING, chờ duyệt — KHÔNG cập nhật tồn)
    INSERT INTO phieu_xuat_kho (
        id_chi_nhanh_xuat, id_chi_nhanh_nhan, id_nguoi_tao,
        ngay_yeu_cau, trang_thai, ghi_chu
    ) VALUES (
        p_id_chi_nhanh_xuat, p_id_chi_nhanh_nhan, p_id_nguoi_tao,
        p_ngay_yeu_cau, 'PENDING', p_ghi_chu
    )
    RETURNING id INTO v_id_phieu;

    -- 2. INSERT từng line
    FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
    LOOP
        INSERT INTO chi_tiet_phieu_xuat (
            id_phieu_xuat, id_san_pham,
            so_luong_yeu_cau, so_luong_xuat, so_luong_nhan,
            don_gia_von, han_su_dung, thu_tu
        ) VALUES (
            v_id_phieu,
            (v_line->>'id_san_pham')::UUID,
            (v_line->>'so_luong_yeu_cau')::INTEGER,
            (v_line->>'so_luong_xuat')::INTEGER,
            COALESCE((v_line->>'so_luong_nhan')::INTEGER,
                     (v_line->>'so_luong_xuat')::INTEGER),
            (v_line->>'don_gia_von')::DECIMAL(12,0),
            (v_line->>'han_su_dung')::DATE,
            COALESCE((v_line->>'thu_tu')::INTEGER, 0)
        );
    END LOOP;

    -- Trigger sinh mã tự động (BEFORE INSERT) đã chạy. Lấy mã để dùng cho
    -- the_kho.ma_chung_tu khi được duyệt.
    v_ma_chung_tu := (SELECT ma_phieu FROM phieu_xuat_kho WHERE id = v_id_phieu);

    -- 3. KHÔNG cập nhật tồn kho ở PENDING. Khi Thủ kho duyệt, gọi
    --    function `fn_duyet_luu_chuyen(p_id_phieu, p_id_nguoi_duyet, p_ngay_xuat)`.

    RETURN v_id_phieu;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FUNCTION: duyệt phiếu luân chuyển (chuyển PENDING → COMPLETED)
-- Làm 4 việc:
--   1. UPDATE header: status=COMPLETED, set ngày + người duyệt
--   2. Ghi the_kho TRANSFER_OUT (âm) tại kho xuất
--   3. Ghi the_kho TRANSFER_IN (dương) tại kho nhận
--   4. Cập nhật ton_kho 2 nơi (trừ ở kho xuất, cộng ở kho nhận)
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_duyet_luu_chuyen(
    p_id_phieu       UUID,
    p_id_nguoi_duyet UUID,
    p_ngay_xuat      DATE DEFAULT CURRENT_DATE,
    p_nguoi_nhan     UUID DEFAULT NULL,  -- người xác nhận nhận hàng tại cửa hàng
    p_ngay_nhan      DATE DEFAULT NULL,  -- ngày nhận tại cửa hàng
    p_nguoi_thuc_hien VARCHAR(255) DEFAULT 'Hệ thống'
) RETURNS VOID AS $$
DECLARE
    v_phieu RECORD;
    v_line RECORD;
    v_ma_chung_tu VARCHAR(50);
    v_ngay_nhan DATE;
    v_sl_nhan INTEGER;
BEGIN
    -- Lấy header
    SELECT * INTO v_phieu
    FROM phieu_xuat_kho
    WHERE id = p_id_phieu
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy phiếu xuất %', p_id_phieu;
    END IF;

    IF v_phieu.trang_thai != 'PENDING' THEN
        RAISE EXCEPTION 'Phiếu phải ở trạng thái PENDING để duyệt. Hiện tại: %',
            v_phieu.trang_thai;
    END IF;

    v_ma_chung_tu := v_phieu.ma_phieu;
    v_ngay_nhan := COALESCE(p_ngay_nhan, p_ngay_xuat);

    -- 1. UPDATE header
    UPDATE phieu_xuat_kho
    SET trang_thai = 'COMPLETED',
        ngay_xuat_thuc_te = p_ngay_xuat,
        ngay_nhan_thuc_te = v_ngay_nhan,
        id_nguoi_duyet = p_id_nguoi_duyet,
        id_nguoi_nhan = p_nguoi_nhan
    WHERE id = p_id_phieu;

    -- 2-4. Với từng line: ghi 2 dòng the_kho + cập nhật 2 ton_kho
    FOR v_line IN SELECT * FROM chi_tiet_phieu_xuat WHERE id_phieu_xuat = p_id_phieu
    LOOP
        v_sl_nhan := COALESCE(p_sl_nhan_override, v_line.so_luong_nhan);

        -- 2a. Ghi the_kho TRANSFER_OUT (âm) tại kho xuất
        IF v_line.so_luong_xuat > 0 THEN
            PERFORM fn_ghi_the_kho_va_dieu_chinh_ton(
                v_line.id_san_pham,
                v_phieu.id_chi_nhanh_xuat,
                'TRANSFER_OUT',
                -v_line.so_luong_xuat,
                v_line.don_gia_von,
                v_ma_chung_tu,
                p_nguoi_thuc_hien,
                NULL,  -- HSD không áp dụng khi xuất khỏi kho
                'Xuất luân chuyển sang chi nhánh nhận',
                p_ngay_xuat::TIMESTAMP
            );
        END IF;

        -- 2b. Ghi the_kho TRANSFER_IN (dương) tại kho nhận
        IF v_sl_nhan > 0 THEN
            PERFORM fn_ghi_the_kho_va_dieu_chinh_ton(
                v_line.id_san_pham,
                v_phieu.id_chi_nhanh_nhan,
                'TRANSFER_IN',
                v_sl_nhan,
                v_line.don_gia_von,
                v_ma_chung_tu,
                p_nguoi_thuc_hien,
                v_line.han_su_dung,
                'Nhận luân chuyển từ Kho Tổng',
                v_ngay_nhan::TIMESTAMP
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Dữ liệu mẫu — 2 phiếu minh hoạ
-- =============================================================================

-- Phiếu 1: COMPLETED — Xuất 50 lon Coca + 30 gói Oishi từ Kho Tổng → Bùi Viện
INSERT INTO phieu_xuat_kho
    (id_chi_nhanh_xuat, id_chi_nhanh_nhan, id_nguoi_tao,
     ngay_yeu_cau, ngay_xuat_thuc_te, ngay_nhan_thuc_te,
     id_nguoi_duyet, id_nguoi_nhan,
     trang_thai, ghi_chu)
VALUES
    ('00000000-0000-0000-0000-000000000010',
     'a1b2c3d4-0001-0000-0000-000000000001',  -- Kho Tổng (xuất)
     'a1b2c3d4-0001-0000-0000-000000000101',  -- Bùi Viện (nhận)
     'b2c3d4e5-0001-0000-0000-000000000003',  -- Thủ kho tạo
     CURRENT_DATE - INTERVAL '25 days',
     CURRENT_DATE - INTERVAL '25 days',
     CURRENT_DATE - INTERVAL '25 days',
     'b2c3d4e5-0001-0000-0000-000000000003',  -- Thủ kho duyệt
     'b2c3d4e5-0001-0000-0000-000000000004',  -- Quản lý Bùi Viện nhận
     'COMPLETED', 'Cấp hàng cho cửa hàng Bùi Viện đầu tháng');

UPDATE phieu_xuat_kho
SET ma_phieu = 'PX-' || TO_CHAR(ngay_yeu_cau, 'YYYYMMDD') || '-001'
WHERE id = '00000000-0000-0000-0000-000000000010';

INSERT INTO chi_tiet_phieu_xuat
    (id_phieu_xuat, id_san_pham, so_luong_yeu_cau, so_luong_xuat, so_luong_nhan,
     don_gia_von, han_su_dung, thu_tu)
VALUES
    -- 50 lon Coca (xuất = nhận = 50)
    ('00000000-0000-0000-0000-000000000010',
     'f6a7b8c9-0001-0000-0000-000000000010', 50, 50, 50,
     9500, CURRENT_DATE + 180, 1),
    -- 30 gói Oishi
    ('00000000-0000-0000-0000-000000000010',
     'f6a7b8c9-0001-0000-0000-000000000030', 30, 30, 30,
     6500, NULL, 2);

-- Phiếu 2: PENDING — Quản lý Bùi Viện yêu cầu 20 lon Coca, chờ thủ kho duyệt
INSERT INTO phieu_xuat_kho
    (id_chi_nhanh_xuat, id_chi_nhanh_nhan, id_nguoi_tao,
     ngay_yeu_cau, trang_thai, ghi_chu)
VALUES
    ('00000000-0000-0000-0000-000000000011',
     'a1b2c3d4-0001-0000-0000-000000000001',
     'a1b2c3d4-0001-0000-0000-000000000101',
     'b2c3d4e5-0001-0000-0000-000000000004',  -- Quản lý Bùi Viện
     CURRENT_DATE - INTERVAL '1 day', 'PENDING',
     'Cửa hàng sắp hết Coca, yêu cầu cấp thêm');

UPDATE phieu_xuat_kho
SET ma_phieu = 'PX-' || TO_CHAR(ngay_yeu_cau, 'YYYYMMDD') || '-002'
WHERE id = '00000000-0000-0000-0000-000000000011';

INSERT INTO chi_tiet_phieu_xuat
    (id_phieu_xuat, id_san_pham, so_luong_yeu_cau, so_luong_xuat, so_luong_nhan,
     don_gia_von, han_su_dung, thu_tu)
VALUES
    ('00000000-0000-0000-0000-000000000011',
     'f6a7b8c9-0001-0000-0000-000000000010', 20, 0, 0,
     9500, CURRENT_DATE + 180, 1);

COMMENT ON TABLE phieu_xuat_kho IS
    'Phiếu xuất hàng từ Kho Tổng → Cửa hàng bán lẻ (BR-06). Trigger '
    '`trg_phieu_xuat_check_br06` enforce BR-06 ở DB: chi nhánh xuất BẮT BUỘC '
    'là KHO_TONG, chi nhánh nhận BẮT BUỘC là CUA_HANG_BAN_LE. 3 trạng thái: '
    'PENDING (yêu cầu, chưa đụng tồn), COMPLETED (đã duyệt + xuất + nhận, '
    'tồn đã thay đổi), CANCELLED (huỷ). Mỗi lần duyệt tạo 2 dòng the_kho: '
    'TRANSFER_OUT tại kho xuất (âm) + TRANSFER_IN tại kho nhận (dương).';

COMMENT ON COLUMN phieu_xuat_kho.trang_thai IS
    'PENDING: chờ Thủ kho/Admin duyệt. COMPLETED: đã duyệt + xuất + nhận. '
    'CANCELLED: bị huỷ (hết hàng / chi nhánh đóng). 3 CHECK constraint đảm bảo '
    'COMPLETED phải có đủ ngay_xuat, ngay_nhan, id_nguoi_duyet.';

COMMENT ON COLUMN phieu_xuat_kho.ma_phieu IS
    'Mã phiếu dạng PX-YYYYMMDD-NNN. Trigger `trg_phieu_xuat_sinh_ma` sinh tự '
    'động nếu NULL. UNIQUE.';

COMMENT ON TABLE chi_tiet_phieu_xuat IS
    'Từng dòng hàng trong phiếu xuất. 3 SL: so_luong_yeu_cau (yêu cầu từ '
    'cửa hàng), so_luong_xuat (Thủ kho thực xuất, có thể < yêu cầu), '
    'so_luong_nhan (cửa hàng thực nhận, có thể < xuất nếu hư/sai). '
    'UNIQUE (id_phieu_xuat, id_san_pham) chống trùng SP trong phiếu.';

COMMENT ON COLUMN chi_tiet_phieu_xuat.so_luong_xuat IS
    'SL thực xuất từ kho. CHECK <= so_luong_yeu_cau. Khi duyệt phiếu: '
    'the_kho TRANSFER_OUT ghi SL âm = -so_luong_xuat tại kho xuất.';

COMMENT ON COLUMN chi_tiet_phieu_xuat.so_luong_nhan IS
    'SL thực nhận tại cửa hàng. CHECK <= so_luong_xuat. Mặc định = so_luong_xuat '
    '(nhận đủ). Nếu < so_luong_xuat: cửa hàng báo hàng hư/sai trên đường, '
    'the_kho TRANSFER_IN ghi SL dương = so_luong_nhan (chỉ nhận thực tế).';

COMMENT ON COLUMN chi_tiet_phieu_xuat.don_gia_von IS
    'Đơn giá vốn snapshot tại thời điểm xuất. Lấy từ ton_kho.gia_von_trung_binh '
    'của kho xuất. Dùng tính thanh_tien và làm căn cứ kiểm toán khi chênh lệch '
    'giữa kho xuất và kho nhận.';
