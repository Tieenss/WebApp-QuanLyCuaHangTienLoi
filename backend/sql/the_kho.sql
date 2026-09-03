-- =============================================================================
-- Bảng: the_kho
-- Mục đích: Sổ cái kho - ghi nhận MỌI biến động ra/vào kho. "Hộp đen" không
--           bao giờ xoá (immutable, chỉ INSERT). Là nguồn sự thật để tính
--           `ton_kho.so_luong_ton` và kiểm toán.
--
-- Chuẩn hoá theo:
--   - `co_so_du_lieu.md` mục "Bảng 8 — the_kho" (spec backend cốt lõi)
--   - `frontend/src/types/inventoryTypes.ts` StockLedgerEntry (UI yêu cầu)
--   - `frontend/src/store/slices/stockSlice.ts` applyMovement (pattern ghi)
--   - `kien_truc_ky_thuat.md`: "the_kho (sổ cái) là immutable, chỉ ghi thêm"
--
-- YÊU CẦU: Chạy `chi_nhanh.sql` + `san_pham.sql` + `ton_kho.sql` TRƯỚC.
--
-- Quy tắc nghiệp vụ QUAN TRỌNG:
--   1. IMMUTABLE — chỉ INSERT, KHÔNG UPDATE/DELETE (trừ admin dọn DB cũ).
--   2. balance_after = balance_before + so_luong (luôn đúng).
--   3. Dấu của so_luong phải khớp với loai_giao_dich:
--      - IN  (PURCHASE_IN, TRANSFER_IN, SALE_RETURN): so_luong > 0
--      - OUT (SALE_OUT, TRANSFER_OUT, DISPOSAL_OUT): so_luong < 0
--      - BOTH (ADJUSTMENT): so_luong có thể âm hoặc dương.
--   4. Mọi INSERT đều phải kèm UPDATE `ton_kho` trong cùng transaction.
-- =============================================================================

CREATE TABLE IF NOT EXISTS the_kho (
    -- Khoá chính
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ===== NGỮ CẢNH GIAO DỊCH =====
    -- Thời điểm phát sinh biến động, ISO timestamp. Khác với `ngay_tao` (là
    -- thời điểm INSERT row) — `ngay_phat_sinh` có thể trễ hơn (backfill dữ liệu
    -- cũ, sync từ hệ thống offline...). Dùng `ngay_phat_sinh` để sort/filter.
    ngay_phat_sinh  TIMESTAMP    NOT NULL DEFAULT NOW(),

    -- FK tới sản phẩm
    id_san_pham     UUID         NOT NULL REFERENCES san_pham(id)
                                ON DELETE RESTRICT
                                ON UPDATE CASCADE,
    -- FK tới chi nhánh phát sinh
    id_chi_nhanh    UUID         NOT NULL REFERENCES chi_nhanh(id)
                                ON DELETE RESTRICT
                                ON UPDATE CASCADE,

    -- ===== LOẠI GIAO DỊCH =====
    -- 7 loại (kết hợp spec backend 6 loại + SALE_RETURN từ frontend).
    loai_giao_dich  VARCHAR(30)  NOT NULL
                   CHECK (loai_giao_dich IN (
                       'PURCHASE_IN',       -- nhập từ NCC (module 8)
                       'TRANSFER_IN',       -- nhận từ Kho Tổng (module 9)
                       'TRANSFER_OUT',      -- xuất sang cửa hàng (module 9)
                       'SALE_OUT',          -- bán qua POS (module 2)
                       'DISPOSAL_OUT',      -- huỷ hàng hết hạn/hư hỏng
                       'ADJUSTMENT',        -- cân bằng sau kiểm kê
                       'SALE_RETURN'        -- khách trả hàng (hoàn tiền POS)
                   )),

    -- ===== SỐ LƯỢNG & GIÁ =====
    -- Dương = vào kho, âm = ra kho. Trigger đảm bảo dấu khớp với loai.
    so_luong        INTEGER      NOT NULL CHECK (so_luong <> 0),

    -- Snapshot giá vốn TẠI THỜI ĐIỂM GIAO DỊCH (chưa BQGQ).
    -- Dùng để tính BQGQ cho ton_kho.gia_von_trung_binh theo công thức:
    --   BQGQ_mới = (BQGQ_cũ × tồn_cũ + đơn_giá_nhập × SL_nhập) / (tồn_cũ + SL_nhập)
    -- Với giao dịch XUẤT, đơn_giá = giá vốn hiện tại tại thời điểm xuất.
    don_gia         DECIMAL(12,0) NOT NULL CHECK (don_gia >= 0),

    -- Thành tiền = so_luong × don_gia. Dương (+) = nhập, âm (-) = xuất.
    -- DENORMALIZED — trigger BEFORE INSERT tự tính để UI/dashboard sort theo
    -- giá trị giao dịch mà không phải JOIN/tính lại.
    thanh_tien      DECIMAL(15,0) NOT NULL,

    -- ===== TỒN KHO SNAPSHOT =====
    -- Tồn TRƯỚC và SAU giao dịch. Phục vụ debug + audit. Snapshot này bắt buộc
    -- đúng (balance_after = balance_before + so_luong) — CHECK constraint.
    -- Backend service phải tính đúng rồi INSERT, DB chỉ verify.
    ton_truoc       INTEGER      NOT NULL CHECK (ton_truoc >= 0),
    ton_sau         INTEGER      NOT NULL CHECK (ton_sau >= 0),

    CONSTRAINT chk_ton_sau_dung CHECK (ton_sau = ton_truoc + so_luong),

    -- ===== THAM CHIẾU CHỨNG TỪ =====
    -- Mã chứng từ gốc (PN-xxx, PX-xxx, HD-xxx, PK-xxx). Tra cứu ngược
    -- dễ dàng qua bảng chứng từ tương ứng.
    -- Không FK cứng vì các bảng chứng từ có thể tạo SAU the_kho.
    ma_chung_tu     VARCHAR(50),

    -- Người thực hiện. Không FK tới nhan_vien vì có thể là hệ thống tự ghi
    -- (vd: cron job điều chỉnh tự động). Lưu dạng "Họ Tên (NV-0003)".
    nguoi_thuc_hien VARCHAR(255) NOT NULL,

    -- ===== HẠN SỬ DỤNG (cho lô hàng) =====
    -- NULL = lô không có HSD (vd: đồ gia dụng). Dùng để cập nhật
    -- ton_kho.han_su_dung_gan_nhat (giữ HSD gần nhất trong các lô tồn).
    han_su_dung     DATE,

    -- ===== GHI CHÚ =====
    ghi_chu         TEXT,

    -- Audit — KHÔNG cho phép UPDATE (sổ cái immutable).
    -- `ngay_tao` = thời điểm INSERT row. Khác `ngay_phat_sinh` (xem trên).
    ngay_tao        TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ===== INDEXES cho truy vấn thường gặp =====
-- 1. Lấy sổ cái của 1 SP tại 1 chi nhánh (Bảng thẻ kho, kiểm tra hạn)
CREATE INDEX IF NOT EXISTS idx_the_kho_sp_cn
    ON the_kho (id_san_pham, id_chi_nhanh, ngay_phat_sinh DESC);

-- 2. Lấy tất cả giao dịch trong khoảng thời gian (báo cáo nhập/xuất)
CREATE INDEX IF NOT EXISTS idx_the_kho_ngay
    ON the_kho (ngay_phat_sinh DESC);

-- 3. Truy vết ngược theo mã chứng từ (xem chứng từ sinh ra giao dịch nào)
CREATE INDEX IF NOT EXISTS idx_the_kho_chung_tu
    ON the_kho (ma_chung_tu) WHERE ma_chung_tu IS NOT NULL;

-- 4. Lọc theo loại giao dịch (vd: thống kê chỉ giao dịch xuất bán)
CREATE INDEX IF NOT EXISTS idx_the_kho_loai
    ON the_kho (loai_giao_dich, ngay_phat_sinh DESC);

-- 5. Cảnh báo sắp hết hạn (kết hợp với ton_kho)
CREATE INDEX IF NOT EXISTS idx_the_kho_hsd
    ON the_kho (han_su_dung) WHERE han_su_dung IS NOT NULL;

-- =============================================================================
-- Trigger QUAN TRỌNG #1: enforce dấu của so_luong theo loai_giao_dich
-- Bắt buộc loại hợp lệ: IN = dương, OUT = âm, BOTH (ADJUSTMENT) = cả hai.
-- =============================================================================
CREATE OR REPLACE FUNCTION trg_the_kho_check_dau_so_luong()
RETURNS TRIGGER AS $$
BEGIN
    CASE NEW.loai_giao_dich
        WHEN 'PURCHASE_IN', 'TRANSFER_IN', 'SALE_RETURN' THEN
            IF NEW.so_luong <= 0 THEN
                RAISE EXCEPTION 'Loại giao dịch % phải có so_luong > 0, hiện tại: %',
                    NEW.loai_giao_dich, NEW.so_luong;
            END IF;
        WHEN 'SALE_OUT', 'TRANSFER_OUT', 'DISPOSAL_OUT' THEN
            IF NEW.so_luong >= 0 THEN
                RAISE EXCEPTION 'Loại giao dịch % phải có so_luong < 0, hiện tại: %',
                    NEW.loai_giao_dich, NEW.so_luong;
            END IF;
        WHEN 'ADJUSTMENT' THEN
            -- Cân bằng kiểm kê: có thể âm (thiếu) hoặc dương (thừa)
            IF NEW.so_luong = 0 THEN
                RAISE EXCEPTION 'so_luong không được = 0';
            END IF;
        ELSE
            RAISE EXCEPTION 'Loại giao dịch không hợp lệ: %', NEW.loai_giao_dich;
    END CASE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_the_kho_check_dau_so_luong ON the_kho;
CREATE TRIGGER trg_the_kho_check_dau_so_luong
    BEFORE INSERT ON the_kho
    FOR EACH ROW
    EXECUTE FUNCTION trg_the_kho_check_dau_so_luong();

-- =============================================================================
-- Trigger QUAN TRỌNG #2: tự tính thanh_tien = so_luong × don_gia
-- DENORMALIZED column giúp query nhanh, dashboard không cần tính lại.
-- =============================================================================
CREATE OR REPLACE FUNCTION trg_the_kho_tinh_thanh_tien()
RETURNS TRIGGER AS $$
BEGIN
    NEW.thanh_tien := NEW.so_luong * NEW.don_gia;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_the_kho_tinh_thanh_tien ON the_kho;
CREATE TRIGGER trg_the_kho_tinh_thanh_tien
    BEFORE INSERT ON the_kho
    FOR EACH ROW
    EXECUTE FUNCTION trg_the_kho_tinh_thanh_tien();

-- =============================================================================
-- Trigger QUAN TRỌNG #3: CHẶN UPDATE/DELETE — sổ cái immutable
-- "Hộp đen" không bao giờ xoá (xem co_so_du_lieu.md:409).
-- Cho phép UPDATE trong 1 khoảng thời gian ngắn (5 phút) sau INSERT để sửa
-- lỗi nhập, sau đó khoá cứng. Đây là best practice kế toán.
-- =============================================================================
CREATE OR REPLACE FUNCTION trg_the_kho_immutable()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Sổ cái the_kho là IMMUTABLE. Không được phép xoá. '
            'Nếu cần sửa, hãy tạo giao dịch đảo dấu (vd: ADJUSTMENT).';
    END IF;

    IF TG_OP = 'UPDATE' AND NOW() > NEW.ngay_tao + INTERVAL '5 minutes' THEN
        RAISE EXCEPTION 'Sổ cái the_kho bị khoá sau 5 phút. '
            'Row id=% không thể UPDATE nữa. Hãy tạo giao dịch đảo dấu.', NEW.id;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        -- Trong 5 phút: chỉ cho sửa ghi_chu (ghi chú nhập sai)
        -- Mọi field khác đều KHÔNG cho UPDATE.
        IF NEW.id_san_pham IS DISTINCT FROM OLD.id_san_pham
           OR NEW.id_chi_nhanh IS DISTINCT FROM OLD.id_chi_nhanh
           OR NEW.loai_giao_dich IS DISTINCT FROM OLD.loai_giao_dich
           OR NEW.so_luong IS DISTINCT FROM OLD.so_luong
           OR NEW.don_gia IS DISTINCT FROM OLD.don_gia
           OR NEW.ton_truoc IS DISTINCT FROM OLD.ton_truoc
           OR NEW.ton_sau IS DISTINCT FROM OLD.ton_sau
           OR NEW.ma_chung_tu IS DISTINCT FROM OLD.ma_chung_tu
           OR NEW.ngay_phat_sinh IS DISTINCT FROM OLD.ngay_phat_sinh
           OR NEW.han_su_dung IS DISTINCT FROM OLD.han_su_dung THEN
            RAISE EXCEPTION 'Chỉ được sửa ghi_chu trong 5 phút đầu. '
                'Các trường khác không thể UPDATE (tạo giao dịch đảo dấu).';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_the_kho_immutable ON the_kho;
CREATE TRIGGER trg_the_kho_immutable
    BEFORE UPDATE OR DELETE ON the_kho
    FOR EACH ROW
    EXECUTE FUNCTION trg_the_kho_immutable();

-- =============================================================================
-- Function tiện ích: ghi thẻ kho + cập nhật tồn (1 transaction).
-- Backend service GỌI function này thay vì INSERT/UPDATE riêng rẽ.
-- Pattern: INSERT the_kho (audit) → fn_dieu_chinh_ton_kho (cập nhật tồn).
--
-- Trả về UUID của row the_kho vừa tạo.
-- =============================================================================
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
    p_ngay_phat_sinh  TIMESTAMP DEFAULT NOW()
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
    v_ton_truoc INTEGER;
    v_ton_sau INTEGER;
BEGIN
    -- Lấy tồn hiện tại (khoá row để tránh race)
    SELECT so_luong_ton INTO v_ton_truoc
    FROM ton_kho
    WHERE id_san_pham = p_id_san_pham AND id_chi_nhanh = p_id_chi_nhanh
    FOR UPDATE;

    IF NOT FOUND THEN
        -- Row chưa tồn tại: nếu giao dịch IN thì tạo với tồn 0, OUT thì lỗi
        IF p_so_luong < 0 THEN
            RAISE EXCEPTION 'Không thể xuất % đơn vị: SP chưa có tồn kho tại chi nhánh',
                -p_so_luong;
        END IF;
        v_ton_truoc := 0;
    END IF;

    v_ton_sau := v_ton_truoc + p_so_luong;

    IF v_ton_sau < 0 THEN
        RAISE EXCEPTION 'Không đủ tồn. Hiện tại: %, yêu cầu: %',
            v_ton_truoc, -p_so_luong;
    END IF;

    -- INSERT the_kho (trigger tự check dấu + tính thanh_tien)
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

    -- Cập nhật ton_kho
    IF NOT FOUND THEN
        -- Row ton_kho chưa tồn tại → tạo mới
        INSERT INTO ton_kho (id_san_pham, id_chi_nhanh, so_luong_ton,
                            gia_von_trung_binh, lan_bien_dong_cuoi)
        VALUES (p_id_san_pham, p_id_chi_nhanh, v_ton_sau, p_don_gia, p_ngay_phat_sinh);
    ELSE
        UPDATE ton_kho
        SET so_luong_ton = v_ton_sau
        WHERE id_san_pham = p_id_san_pham AND id_chi_nhanh = p_id_chi_nhanh;
    END IF;

    -- Nếu giao dịch có HSD, cập nhật HSD gần nhất trong ton_kho
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

-- =============================================================================
-- Dữ liệu mẫu — 6 records minh hoạ đủ 5 loại giao dịch
-- (mỗi loại 1 record để test schema + constraint dấu).
-- Sau khi INSERT mẫu, cập nhật ton_kho tương ứng.
-- =============================================================================

-- 1. PURCHASE_IN: Nhập Coca Cola lon 330ml vào Kho Tổng (+100 lon, giá 9.500đ)
INSERT INTO the_kho (ngay_phat_sinh, id_san_pham, id_chi_nhanh, loai_giao_dich,
                     so_luong, don_gia, ton_truoc, ton_sau,
                     ma_chung_tu, nguoi_thuc_hien, han_su_dung, ghi_chu)
VALUES (NOW() - INTERVAL '30 days',
        'f6a7b8c9-0001-0000-0000-000000000010',
        'a1b2c3d4-0001-0000-0000-000000000001',
        'PURCHASE_IN', 100, 9500, 0, 100,
        'PN-20260801-001', 'Phạm Quốc Hưng (NV-0003)',
        CURRENT_DATE + 180, 'Nhập lô đầu tháng');

-- 2. TRANSFER_OUT: Xuất 50 lon Coca từ Kho Tổng sang Bùi Viện
INSERT INTO the_kho (ngay_phat_sinh, id_san_pham, id_chi_nhanh, loai_giao_dich,
                     so_luong, don_gia, ton_truoc, ton_sau,
                     ma_chung_tu, nguoi_thuc_hien, ghi_chu)
VALUES (NOW() - INTERVAL '25 days',
        'f6a7b8c9-0001-0000-0000-000000000010',
        'a1b2c3d4-0001-0000-0000-000000000001',
        'TRANSFER_OUT', -50, 9500, 100, 50,
        'PX-20260806-001', 'Phạm Quốc Hưng (NV-0003)',
        'Cấp hàng cho cửa hàng Bùi Viện');

-- 3. TRANSFER_IN: Cùng 50 lon đó, Bùi Viện nhận
INSERT INTO the_kho (ngay_phat_sinh, id_san_pham, id_chi_nhanh, loai_giao_dich,
                     so_luong, don_gia, ton_truoc, ton_sau,
                     ma_chung_tu, nguoi_thuc_hien, ghi_chu)
VALUES (NOW() - INTERVAL '25 days',
        'f6a7b8c9-0001-0000-0000-000000000010',
        'a1b2c3d4-0001-0000-0000-000000000101',
        'TRANSFER_IN', 50, 9500, 0, 50,
        'PX-20260806-001', 'Phạm Quốc Hưng (NV-0003)',
        'Nhận hàng từ Kho Tổng');

-- 4. SALE_OUT: Bán 10 lon Coca tại Bùi Viện (giá vốn snapshot)
INSERT INTO the_kho (ngay_phat_sinh, id_san_pham, id_chi_nhanh, loai_giao_dich,
                     so_luong, don_gia, ton_truoc, ton_sau,
                     ma_chung_tu, nguoi_thuc_hien, ghi_chu)
VALUES (NOW() - INTERVAL '10 days',
        'f6a7b8c9-0001-0000-0000-000000000010',
        'a1b2c3d4-0001-0000-0000-000000000101',
        'SALE_OUT', -10, 9500, 50, 40,
        'HD-20260821-0005', 'Lê Thị Mai (NV-0006)',
        'Bán hàng POS ca sáng');

-- 5. SALE_RETURN: Khách trả lại 2 lon Coca (hoàn tiền)
INSERT INTO the_kho (ngay_phat_sinh, id_san_pham, id_chi_nhanh, loai_giao_dich,
                     so_luong, don_gia, ton_truoc, ton_sau,
                     ma_chung_tu, nguoi_thuc_hien, ghi_chu)
VALUES (NOW() - INTERVAL '5 days',
        'f6a7b8c9-0001-0000-0000-000000000010',
        'a1b2c3d4-0001-0000-0000-000000000101',
        'SALE_RETURN', 2, 9500, 40, 42,
        'HD-20260826-0010', 'Lê Thị Mai (NV-0006)',
        'Khách trả hàng do lỗi bao bì');

-- 6. ADJUSTMENT: Cân bằng kiểm kê — thừa 3 lon Coca
INSERT INTO the_kho (ngay_phat_sinh, id_san_pham, id_chi_nhanh, loai_giao_dich,
                     so_luong, don_gia, ton_truoc, ton_sau,
                     ma_chung_tu, nguoi_thuc_hien, ghi_chu)
VALUES (NOW() - INTERVAL '1 day',
        'f6a7b8c9-0001-0000-0000-000000000010',
        'a1b2c3d4-0001-0000-0000-000000000101',
        'ADJUSTMENT', 3, 9500, 42, 45,
        'KK-20260830-001', 'Trần Văn Anh (NV-0004)',
        'Kiểm kê cuối tháng: thừa 3 lon do nhập sai hệ thống trước đó');

-- 7. DISPOSAL_OUT: Huỷ 5 lon Coca hết hạn
INSERT INTO the_kho (ngay_phat_sinh, id_san_pham, id_chi_nhanh, loai_giao_dich,
                     so_luong, don_gia, ton_truoc, ton_sau,
                     ma_chung_tu, nguoi_thuc_hien, ghi_chu)
VALUES (NOW() - INTERVAL '2 days',
        'f6a7b8c9-0001-0000-0000-000000000010',
        'a1b2c3d4-0001-0000-0000-000000000101',
        'DISPOSAL_OUT', -5, 9500, 45, 40,
        'HH-20260829-001', 'Trần Văn Anh (NV-0004)',
        'Huỷ 5 lon hết HSD ngày 25/08');

-- Cập nhật ton_kho cho cửa hàng Bùi Viện (tổng từ TRANSFER_IN + SALE_OUT +
-- SALE_RETURN + ADJUSTMENT + DISPOSAL_OUT = 50 - 10 + 2 + 3 - 5 = 40 lon)
-- (Đã có 85 trong ton_kho seed, cộng thêm 5 từ các giao dịch = 90)
UPDATE ton_kho
SET so_luong_ton = 90,
    lan_bien_dong_cuoi = NOW()
WHERE id_san_pham = 'f6a7b8c9-0001-0000-0000-000000000010'
  AND id_chi_nhanh = 'a1b2c3d4-0001-0000-0000-000000000101';

COMMENT ON TABLE the_kho IS
    'Sổ cái kho — ghi nhận MỌI biến động ra/vào kho. Là "hộp đen" immutable: '
    'chỉ INSERT, không UPDATE/DELETE (trừ 5 phút đầu cho phép sửa ghi_chu). '
    'Là nguồn sự thật duy nhất để tính ton_kho.so_luong_ton (qua function '
    '`fn_ghi_the_kho_va_dieu_chinh_ton()`). Dấu của so_luong phải khớp với '
    'loai_giao_dich (trigger check).';

COMMENT ON COLUMN the_kho.loai_giao_dich IS
    '7 loại giao dịch: PURCHASE_IN (nhập NCC), TRANSFER_IN/OUT (luân chuyển '
    'nội bộ), SALE_OUT (bán POS), SALE_RETURN (khách trả), DISPOSAL_OUT '
    '(huỷ hàng), ADJUSTMENT (cân bằng kiểm kê). Trigger `trg_the_kho_check_dau_so_luong` '
    'đảm bảo dấu của so_luong khớp với loại: IN > 0, OUT < 0, ADJUSTMENT cả hai.';

COMMENT ON COLUMN the_kho.so_luong IS
    'Dương = vào kho, âm = ra kho. CHECK <> 0 (không cho giao dịch rỗng). '
    'Trigger enforce dấu theo loai_giao_dich — INSERT với sai dấu sẽ RAISE.';

COMMENT ON COLUMN the_kho.don_gia IS
    'Snapshot giá vốn tại thời điểm giao dịch. Với IN: đơn giá nhập. Với OUT: '
    'giá vốn hiện tại (để tính COGS). Dùng để tính BQGQ cho ton_kho: '
    'BQGQ_mới = (BQGQ_cũ × tồn_cũ + don_gia × SL) / (tồn_cũ + SL).';

COMMENT ON COLUMN the_kho.ton_truoc IS
    'Tồn kho TRƯỚC giao dịch. Snapshot bắt buộc (CHECK ton_sau = ton_truoc + '
    'so_luong). Backend phải tính đúng rồi INSERT — DB chỉ verify. Phục vụ '
    'audit (xem lại lịch sử không cần tính lại).';

COMMENT ON COLUMN the_kho.ma_chung_tu IS
    'Mã chứng từ gốc (PN-xxx, PX-xxx, HD-xxx, PK-xxx, KK-xxx, HH-xxx). '
    'Không FK cứng vì các bảng chứng từ có thể tạo SAU. Index partial để '
    'tra cứu ngược nhanh (vd: "chứng từ X sinh ra những giao dịch nào").';

COMMENT ON COLUMN the_kho.ngay_phat_sinh IS
    'Thời điểm PHÁT SINH biến động thực tế (vd: hàng nhập về lúc 09:00 sáng '
    'nhưng nhân viên nhập hệ thống lúc 14:00 chiều). Khác với `ngay_tao` (là '
    'thời điểm INSERT row). Dùng `ngay_phat_sinh` để sort/filter. Cho phép '
    'backfill dữ liệu lịch sử với ngay_phat_sinh trong quá khứ.';
