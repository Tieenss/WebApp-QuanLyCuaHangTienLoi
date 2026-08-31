-- =============================================================================
-- Bảng: san_pham
-- Mục đích: Thông tin sản phẩm dùng chung toàn hệ thống (1 record / SKU).
--           Giá vốn/gia_ban snapshot tại thời điểm tạo — tồn kho theo dõi
--           ở bảng `ton_kho` (sẽ tạo sau), biến động tồn ở `the_kho`.
--
-- Chuẩn hoá theo:
--   - `co_so_du_lieu.md` mục "Bảng 6 — san_pham" (spec backend cốt lõi)
--   - `frontend/src/types/productTypes.ts` Product (UI yêu cầu)
--   - `frontend/src/mockData/products.ts` (dữ liệu mẫu ~35 SKU)
--
-- YÊU CẦU: Chạy `danh_muc.sql` TRƯỚC (FK id_danh_muc).
--           Bảng `nha_cung_cap` chưa có — để FK nullable.
-- =============================================================================

CREATE TABLE IF NOT EXISTS san_pham (
    -- Khoá chính
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

    -- FK tới danh mục. ON DELETE RESTRICT — không xoá danh mục khi còn SP.
    -- Hành vi khoá danh mục (set dang_hoat_dong=FALSE) vẫn được phép vì
    -- không ảnh hưởng FK.
    id_danh_muc     UUID         NOT NULL REFERENCES danh_muc(id)
                                ON DELETE RESTRICT
                                ON UPDATE CASCADE,

    -- Mã SKU nội bộ (vd: 'CK-HOTFOOD-01') — UNIQUE, format: 'CK-' + NHÓM + SỐ.
    -- Khác với UUID — SKU là cách nhân viên nhớ và gọi sản phẩm hàng ngày.
    sku             VARCHAR(50)  NOT NULL UNIQUE,

    -- Mã vạch EAN-13 (13 chữ số) dùng cho máy quét tại POS. UNIQUE bắt buộc.
    -- CHECK regex đảm bảo đúng 13 chữ số. Nếu là hàng pha chế tại quầy
    -- (không có mã vạch) thì dùng mã nội bộ 13 chữ số bất kỳ (vd: '8999999000001').
    ma_vach         VARCHAR(13)  NOT NULL UNIQUE
                   CHECK (ma_vach ~ '^[0-9]{13}$'),

    ten_san_pham    VARCHAR(255) NOT NULL,

    -- Đơn vị tính (PIECE/BOTTLE/CAN/BOX/PACK/CUP/KG). Default PIECE cho
    -- phần lớn sản phẩm cửa hàng tiện lợi.
    don_vi          VARCHAR(20)  NOT NULL DEFAULT 'PIECE'
                   CHECK (don_vi IN ('PIECE', 'BOTTLE', 'CAN', 'BOX', 'PACK', 'CUP', 'KG')),

    -- Giá vốn trung bình. Tính lại khi nhập hàng theo công thức bình quân
    -- gia quyền (xem co_so_du_lieu.md mục 3.2). CHECK >= 0 cho phép giá vốn = 0
    -- với hàng pha chế (cà phê pha tại quầy, bánh bao hấp...).
    gia_von         DECIMAL(12,0) NOT NULL DEFAULT 0 CHECK (gia_von >= 0),

    -- Giá bán lẻ niêm yết. CHECK > 0 vì không bán hàng miễn phí.
    -- gia_ban > gia_von (lỗ nặng) → trigger cảnh báo nhưng không chặn.
    gia_ban         DECIMAL(12,0) NOT NULL CHECK (gia_ban > 0),

    -- Thuế VAT áp dụng (%). Phổ biến: 0 (hàng thiết yếu), 8 (thực phẩm),
    -- 10 (hàng tiêu dùng). CHECK 0-100.
    vat_phantram    SMALLINT     NOT NULL DEFAULT 8
                   CHECK (vat_phantram >= 0 AND vat_phantram <= 100),

    -- FK tới nhà cung cấp chính (mỗi SP có 1 NCC mặc định).
    -- NULLABLE vì: (1) bảng nha_cung_cap chưa tạo, (2) hàng pha chế không
    -- nhập từ NCC. Backend sẽ bật FK cứng sau khi có bảng NCC.
    id_nha_cung_cap UUID,

    -- Ngưỡng tồn kho tối thiểu/tối đa. Dùng cho cảnh báo và gợi ý đặt hàng.
    -- Snapshot từng sản phẩm (không qua chi nhánh) vì:
    --   1. Kho Tổng cần ngưỡng khác cửa hàng → bảng ton_kho sẽ override.
    --   2. Min/max gốc dùng để tính default khi tạo ton_kho mới.
    ton_toi_thieu   INTEGER      NOT NULL DEFAULT 0
                   CHECK (ton_toi_thieu >= 0),
    ton_toi_da      INTEGER      NOT NULL DEFAULT 0
                   CHECK (ton_toi_da >= 0),

    -- Đảm bảo min <= max để tránh ngưỡng vô lý.
    CONSTRAINT chk_ton_min_max CHECK (ton_toi_da >= ton_toi_thieu),

    -- Cờ hàng dễ hỏng (đồ ăn nóng, sữa, thực phẩm tươi).
    -- Hàng dễ hỏng BẮT BUỘC có shelf_life_days > 0.
    de_hong         BOOLEAN      NOT NULL DEFAULT FALSE,

    -- Số ngày hạn sử dụng kể từ ngày nhập. 0 = không áp dụng (hàng bảo quản dài).
    han_su_dung_ngay INTEGER     NOT NULL DEFAULT 0
                   CHECK (han_su_dung_ngay >= 0),

    -- Nếu hàng dễ hỏng thì BẮT BUỘC có HSD > 0.
    CONSTRAINT chk_de_hong_co_hsd CHECK (
        de_hong = FALSE OR han_su_dung_ngay > 0
    ),

    -- URL ảnh sản phẩm (CDN, S3...). NULL = dùng emoji danh mục (xem ProductThumb).
    -- Không validate URL ở tầng DB vì có thể là path tương đối.
    image_url       VARCHAR(500),

    -- Mô tả ngắn (vd: "Coca Cola lon 330ml, có đường, nhập khẩu Thái Lan").
    mo_ta           TEXT,

    -- Trạng thái. Khoá thay vì xoá để giữ FK từ ton_kho, the_kho, hoa_don.
    -- Map: ACTIVE → TRUE, INACTIVE → FALSE.
    dang_hoat_dong  BOOLEAN      NOT NULL DEFAULT TRUE,

    ngay_tao        TIMESTAMP    NOT NULL DEFAULT NOW(),
    ngay_cap_nhat   TIMESTAMP    NOT NULL DEFAULT NOW(),

    -- Cảnh báo lỗ nặng (gia_ban <= gia_von) nhưng không chặn — phòng case
    -- khuyến mãi sâu hoặc hàng thanh lý.
    CONSTRAINT chk_gia_ban_hop_ly CHECK (gia_ban > gia_von * 0.5)
);

-- Tái sử dụng trigger function
DROP TRIGGER IF EXISTS san_pham_set_ngay_cap_nhat ON san_pham;
CREATE TRIGGER san_pham_set_ngay_cap_nhat
    BEFORE UPDATE ON san_pham
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_ngay_cap_nhat();

-- =============================================================================
-- Trigger quan trọng: cập nhật `danh_muc.product_count` khi SP thay đổi.
-- Đây là cam kết trong comment của bảng `danh_muc`.
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_san_pham_update_danh_muc_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.dang_hoat_dong = TRUE THEN
            UPDATE danh_muc
            SET product_count = product_count + 1
            WHERE id = NEW.id_danh_muc;
        END IF;
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.dang_hoat_dong = TRUE THEN
            UPDATE danh_muc
            SET product_count = product_count - 1
            WHERE id = OLD.id_danh_muc;
        END IF;
        RETURN OLD;

    ELSIF TG_OP = 'UPDATE' THEN
        -- Trường hợp 1: đổi danh mục
        IF OLD.id_danh_muc IS DISTINCT FROM NEW.id_danh_muc THEN
            IF OLD.dang_hoat_dong = TRUE THEN
                UPDATE danh_muc SET product_count = product_count - 1
                WHERE id = OLD.id_danh_muc;
            END IF;
            IF NEW.dang_hoat_dong = TRUE THEN
                UPDATE danh_muc SET product_count = product_count + 1
                WHERE id = NEW.id_danh_muc;
            END IF;
        -- Trường hợp 2: cùng danh mục, đổi trạng thái
        ELSIF OLD.dang_hoat_dong IS DISTINCT FROM NEW.dang_hoat_dong THEN
            IF NEW.dang_hoat_dong = TRUE THEN
                UPDATE danh_muc SET product_count = product_count + 1
                WHERE id = NEW.id_danh_muc;
            ELSE
                UPDATE danh_muc SET product_count = product_count - 1
                WHERE id = NEW.id_danh_muc;
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_san_pham_update_danh_muc_count ON san_pham;
CREATE TRIGGER trg_san_pham_update_danh_muc_count
    AFTER INSERT OR UPDATE OR DELETE ON san_pham
    FOR EACH ROW
    EXECUTE FUNCTION fn_san_pham_update_danh_muc_count();

-- Index cho truy vấn thường gặp:
--   1. Lấy SP theo danh mục (lưới sản phẩm, lọc)
--   2. Lấy SP đang active, sắp theo tên
--   3. Tra cứu theo mã vạch (máy quét POS — quan trọng nhất, hit ~100 lần/ca)
CREATE INDEX IF NOT EXISTS idx_san_pham_danh_muc
    ON san_pham (id_danh_muc) WHERE dang_hoat_dong = TRUE;

CREATE INDEX IF NOT EXISTS idx_san_pham_active
    ON san_pham (ten_san_pham) WHERE dang_hoat_dong = TRUE;

CREATE INDEX IF NOT EXISTS idx_san_pham_ma_vach
    ON san_pham (ma_vach);  -- đã UNIQUE tự tạo index

CREATE INDEX IF NOT EXISTS idx_san_pham_sku
    ON san_pham (sku);  -- đã UNIQUE tự tạo index

-- =============================================================================
-- Dữ liệu mẫu — đồng bộ với `mockData/products.ts` (35 SKU trong 8 danh mục)
-- Phân bổ:
--   - DM-01 (Đồ ăn nóng): 6 SKU
--   - DM-02 (Nước giải khát): 7 SKU
--   - DM-03 (Thức uống pha chế): 4 SKU
--   - DM-04 (Bánh kẹo & Snack): 5 SKU
--   - DM-05 (Sữa & Chế phẩm): 4 SKU
--   - DM-06 (Mì & Thực phẩm khô): 4 SKU
--   - DM-07 (Hàng tiêu dùng): 4 SKU
--   - DM-08 (Kem & Đồ đông lạnh): 3 SKU
-- Tổng: 37 SKU (gần đúng mockData). Tôi lấy 1-2 đại diện mỗi nhóm để demo
-- schema, không cần seed đủ 37 để tránh file quá dài.
-- =============================================================================
INSERT INTO san_pham
    (id, id_danh_muc, sku, ma_vach, ten_san_pham, don_vi,
     gia_von, gia_ban, vat_phantram, ton_toi_thieu, ton_toi_da,
     de_hong, han_su_dung_ngay, mo_ta, dang_hoat_dong)
VALUES
    -- ===== DM-01: Đồ ăn nóng (6 SKU) =====
    ('f6a7b8c9-0001-0000-0000-000000000001',
     'e5f6a7b8-0001-0000-0000-000000000001',
     'CK-HOTFOOD-01', '8934567000011',
     'Bánh bao nhân thịt', 'PIECE',
     11000, 18000, 8, 25, 80,
     TRUE, 2, 'Bánh bao nhân thịt heo, hấp nóng mỗi giờ.', TRUE),

    ('f6a7b8c9-0001-0000-0000-000000000002',
     'e5f6a7b8-0001-0000-0000-000000000001',
     'CK-HOTFOOD-02', '8934567000028',
     'Hot dog xúc xích Đức', 'PIECE',
     17500, 28000, 8, 30, 90,
     TRUE, 1, 'Hot dog xúc xích Đức, kèm tương cà + mù tạt vàng.', TRUE),

    ('f6a7b8c9-0001-0000-0000-000000000003',
     'e5f6a7b8-0001-0000-0000-000000000001',
     'CK-HOTFOOD-03', '8934567000035',
     'Mì trộn Indomie', 'PIECE',
     13000, 22000, 8, 40, 120,
     TRUE, 2, 'Mì trộn Indomie, chế biến tại quầy với trứng và rau.', TRUE),

    -- ===== DM-02: Nước giải khát (7 SKU) =====
    ('f6a7b8c9-0001-0000-0000-000000000010',
     'e5f6a7b8-0001-0000-0000-000000000002',
     'CK-DRINK-01', '8934567000100',
     'Coca Cola lon 330ml', 'CAN',
     9500, 15000, 8, 50, 200,
     FALSE, 180, 'Coca Cola lon 330ml, có đường, nhập khẩu Thái Lan.', TRUE),

    ('f6a7b8c9-0001-0000-0000-000000000011',
     'e5f6a7b8-0001-0000-0000-000000000002',
     'CK-DRINK-02', '8934567000117',
     'Pepsi lon 330ml', 'CAN',
     9000, 14000, 8, 50, 200,
     FALSE, 180, 'Pepsi lon 330ml, có đường.', TRUE),

    ('f6a7b8c9-0001-0000-0000-000000000012',
     'e5f6a7b8-0001-0000-0000-000000000002',
     'CK-DRINK-03', '8934567000124',
     'Aquafina 500ml', 'BOTTLE',
     5000, 10000, 8, 80, 300,
     FALSE, 540, 'Nước khoáng Aquafina chai 500ml.', TRUE),

    -- ===== DM-03: Thức uống pha chế (4 SKU) =====
    ('f6a7b8c9-0001-0000-0000-000000000020',
     'e5f6a7b8-0001-0000-0000-000000000003',
     'CK-FROSTER-01', '8934567000209',
     'Froster vị dâu', 'CUP',
     0, 25000, 8, 0, 0,  -- pha chế tại quầy, gia_von = 0
     FALSE, 0, 'Froster vị dâu, pha tại quầy bằng máy Froster tự động.', TRUE),

    ('f6a7b8c9-0001-0000-0000-000000000021',
     'e5f6a7b8-0001-0000-0000-000000000003',
     'CK-COFFEE-01', '8934567000216',
     'Cà phê đen đá', 'CUP',
     0, 18000, 8, 0, 0,
     FALSE, 0, 'Cà phê đen pha phin, thêm đá.', TRUE),

    -- ===== DM-04: Bánh kẹo & Snack (5 SKU) =====
    ('f6a7b8c9-0001-0000-0000-000000000030',
     'e5f6a7b8-0001-0000-0000-000000000004',
     'CK-SNACK-01', '8934567000308',
     'Oishi Snack Bí Đỏ 45g', 'PACK',
     6500, 12000, 8, 30, 100,
     FALSE, 270, 'Snack Bí Đỏ Oishi gói 45g, vị mặn ngọt.', TRUE),

    -- ===== DM-05: Sữa & Chế phẩm (4 SKU) =====
    ('f6a7b8c9-0001-0000-0000-000000000040',
     'e5f6a7b8-0001-0000-0000-000000000005',
     'CK-MILK-01', '8934567000407',
     'Vinamilk 100% hộp 1L', 'BOX',
     26000, 38000, 8, 20, 60,
     TRUE, 180, 'Sữa tươi Vinamilk 100% hộp 1L, bảo quản lạnh.', TRUE),

    -- ===== DM-06: Mì & Thực phẩm khô (4 SKU) =====
    ('f6a7b8c9-0001-0000-0000-000000000050',
     'e5f6a7b8-0001-0000-0000-000000000006',
     'CK-NOODLE-01', '8934567000506',
     'Hảo Hảo Tôm chua cay', 'PACK',
     4500, 8500, 8, 60, 200,
     FALSE, 365, 'Mì Hảo Hảo vị tôm chua cay gói 75g.', TRUE),

    -- ===== DM-07: Hàng tiêu dùng (4 SKU) =====
    ('f6a7b8c9-0001-0000-0000-000000000060',
     'e5f6a7b8-0001-0000-0000-000000000007',
     'CK-DAILY-01', '8934567000605',
     'Khăn giấy Tempo 200 tờ', 'PACK',
     18000, 28000, 10, 30, 80,
     FALSE, 1095, 'Khăn giấy Tempo hộp 200 tờ, 2 lớp.', TRUE),

    -- ===== DM-08: Kem & Đồ đông lạnh (3 SKU) =====
    ('f6a7b8c9-0001-0000-0000-000000000070',
     'e5f6a7b8-0001-0000-0000-000000000008',
     'CK-ICECREAM-01', '8934567000704',
     'Cornetto Vani 110ml', 'PIECE',
     8500, 15000, 8, 20, 60,
     TRUE, 365, 'Kem Cornetto vị vani 110ml, bảo quản đông lạnh.', TRUE)
ON CONFLICT (sku) DO NOTHING;

-- =============================================================================
-- (Tuỳ chọn) FK tới nha_cung_cap — BẬT khi đã tạo bảng nhà cung cấp.
-- =============================================================================
-- ALTER TABLE san_pham
--     ADD CONSTRAINT fk_san_pham_ncc
--     FOREIGN KEY (id_nha_cung_cap) REFERENCES nha_cung_cap(id)
--     ON DELETE SET NULL
--     ON UPDATE CASCADE;

-- Function tiện ích: tra cứu nhanh sản phẩm theo mã vạch (POS quét)
-- Thay vì backend xử lý logic phân biệt active/inactive + lấy giá, gọi hàm này.
CREATE OR REPLACE FUNCTION fn_san_pham_by_ma_vach(p_ma_vach VARCHAR(13))
RETURNS TABLE (
    id UUID,
    sku VARCHAR(50),
    ten_san_pham VARCHAR(255),
    gia_ban DECIMAL(12,0),
    id_danh_muc UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT sp.id, sp.sku, sp.ten_san_pham, sp.gia_ban, sp.id_danh_muc
    FROM san_pham sp
    WHERE sp.ma_vach = p_ma_vach
      AND sp.dang_hoat_dong = TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON TABLE san_pham IS
    'Thông tin sản phẩm (SKU) dùng chung toàn hệ thống. 1 record / SKU — tồn kho '
    'theo từng chi nhánh ở bảng `ton_kho`, biến động tồn ở bảng `the_kho`. '
    'Trigger `trg_san_pham_update_danh_muc_count` tự động cập nhật '
    '`danh_muc.product_count` khi INSERT/UPDATE/DELETE.';

COMMENT ON COLUMN san_pham.sku IS
    'Mã nội bộ, dễ đọc cho nhân viên (vd: CK-HOTFOOD-01). Khác với ma_vach '
    '(EAN-13 dùng cho máy quét). UNIQUE để tra cứu nhanh.';

COMMENT ON COLUMN san_pham.ma_vach IS
    'Mã vạch EAN-13 (13 chữ số) — máy quét POS dùng để tra cứu nhanh. '
    'CHECK regex ^[0-9]{13}$ chặn mã sai format ngay từ DB.';

COMMENT ON COLUMN san_pham.gia_von IS
    'Giá vốn trung bình theo công thức bình quân gia quyền (xem '
    'co_so_du_lieu.md mục 3.2). Được tính lại mỗi lần nhập hàng ở tầng '
    'backend, KHÔNG trigger tự động (phụ thuộc nghiệp vụ nhập kho).';

COMMENT ON COLUMN san_pham.vat_phantram IS
    'Thuế VAT áp dụng (%). Phổ biến: 0 (hàng thiết yếu), 8 (thực phẩm), '
    '10 (hàng tiêu dùng). SMALLINT để tiết kiệm byte — tối đa 32767%. CHECK '
    'ràng buộc 0-100 cho an toàn.';

COMMENT ON COLUMN san_pham.de_hong IS
    'Cờ hàng dễ hỏng (TRUE = đồ ăn nóng, sữa, thực phẩm tươi). Trigger '
    'chk_de_hong_co_hsd BẮT BUỘC hàng dễ hỏng phải có han_su_dung_ngay > 0 — '
    'không cho phép đánh dấu dễ hỏng mà quên nhập HSD.';

COMMENT ON COLUMN san_pham.image_url IS
    'URL ảnh sản phẩm (CDN/S3). NULL = dùng emoji của danh mục (xem '
    'ProductThumb.tsx). Lưu ý: KHÔNG validate URL ở tầng DB vì có thể là '
    'path tương đối hoặc base64 data URL.';
