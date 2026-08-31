-- =============================================================================
-- Bảng: danh_muc
-- Mục đích: Phân loại nhóm hàng hoá (Coca cola, Bánh kẹo, Đồ gia dụng...).
--           Hỗ trợ cấu trúc CÂY 2 cấp: danh mục gốc (parent_id NULL) +
--           danh mục con (parent_id != NULL). UI dùng để lọc/lưới sản phẩm,
--           POS dùng để nhóm nút theo quầy.
--
-- Chuẩn hoá theo:
--   - `co_so_du_lieu.md` mục "Bảng 5 — danh_muc" (spec backend cốt lõi)
--   - `frontend/src/types/productTypes.ts` Category (UI yêu cầu)
--   - `frontend/src/mockData/categories.ts` (dữ liệu mẫu 8 nhóm)
--
-- KHÔNG cần FK tới bảng khác — bảng này là "nền" cho san_pham (sẽ tạo sau).
-- =============================================================================

CREATE TABLE IF NOT EXISTS danh_muc (
    -- Khoá chính
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Mã hiển thị nội bộ (vd: 'DM-01', 'DM-02') — UNIQUE cho dễ tra cứu.
    -- Format: 'DM-' + 2 chữ số. Backend sinh tự động khi INSERT.
    ma_danh_muc     VARCHAR(20)  NOT NULL UNIQUE,

    ten_danh_muc    VARCHAR(255) NOT NULL,

    -- Cấu trúc cây 2 cấp. NULL = danh mục gốc, != NULL = danh mục con.
    -- FK tự tham chiếu tới chính bảng này. ON DELETE RESTRICT để không cho
    -- xoá danh mục gốc khi còn con.
    parent_id       UUID         REFERENCES danh_muc(id)
                                ON DELETE RESTRICT
                                ON UPDATE CASCADE,

    -- Mô tả ngắn (vd: "Bánh bao, hot dog, mì trộn, xúc xích – chế biến tại quầy.")
    mo_ta           TEXT,

    -- Icon hiển thị trên lưới sản phẩm POS — dùng EMOJI thay vì file ảnh để
    -- render tức thì, không phụ thuộc asset, không tốn request mạng.
    -- VARCHAR(8) đủ cho emoji 4 bytes (vd: '🌭', '🥤', '☕').
    icon_emoji      VARCHAR(8),

    -- Màu nền chip danh mục, dùng đồng bộ giữa biểu đồ báo cáo và tag.
    -- Lưu hex string (vd: '#E31837') thay vì RGB để dễ validate regex.
    -- CHECK đảm bảo format hex 6 ký tự hợp lệ (#RRGGBB).
    mau_hex         VARCHAR(7)   CHECK (mau_hex IS NULL OR mau_hex ~ '^#[0-9A-Fa-f]{6}$'),

    -- Thứ tự hiển thị trên lưới danh mục (nhỏ hơn = lên trước). Default 999
    -- để danh mục mới thêm vào không chèn giữa các danh mục đã sắp xếp.
    thu_tu_hien_thi INTEGER      NOT NULL DEFAULT 999
                   CHECK (thu_tu_hien_thi >= 0),

    -- product_count là CỘT DENORMALIZED — đếm số sản phẩm đang active thuộc
    -- danh mục này. Lưu riêng để UI hiển thị nhanh mà không phải COUNT() mỗi
    -- lần render. Trigger ở bảng `san_pham` sẽ tự cập nhật khi INSERT/DELETE.
    product_count   INTEGER      NOT NULL DEFAULT 0
                   CHECK (product_count >= 0),

    -- Trạng thái. Khoá thay vì xoá để giữ FK từ san_pham.
    -- Map: ACTIVE → TRUE, INACTIVE → FALSE (đồng bộ với chi_nhanh, nhan_vien).
    dang_hoat_dong  BOOLEAN      NOT NULL DEFAULT TRUE,

    ngay_tao        TIMESTAMP    NOT NULL DEFAULT NOW(),
    ngay_cap_nhat   TIMESTAMP    NOT NULL DEFAULT NOW(),

    -- Đảm bảo cấu trúc cây chỉ 2 cấp: nếu có parent_id thì parent KHÔNG ĐƯỢC
    -- có parent_id khác. Trigger kiểm tra bên dưới vì CHECK không truy vấn
    -- được bảng khác.
    CONSTRAINT chk_ten_danh_muc_khong_trung UNIQUE (ten_danh_muc)
);

-- Tái sử dụng trigger function đã có từ các script trước
DROP TRIGGER IF EXISTS danh_muc_set_ngay_cap_nhat ON danh_muc;
CREATE TRIGGER danh_muc_set_ngay_cap_nhat
    BEFORE UPDATE ON danh_muc
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_ngay_cap_nhat();

-- Trigger: đảm bảo cấu trúc cây chỉ 2 cấp
CREATE OR REPLACE FUNCTION trg_danh_muc_check_cap()
RETURNS TRIGGER AS $$
DECLARE
    v_grandparent_id UUID;
BEGIN
    IF NEW.parent_id IS NULL THEN
        RETURN NEW;  -- Cấp 1 (gốc) → OK
    END IF;

    -- Lấy parent của parent
    SELECT parent_id INTO v_grandparent_id
    FROM danh_muc
    WHERE id = NEW.parent_id;

    IF v_grandparent_id IS NOT NULL THEN
        RAISE EXCEPTION 'Cấu trúc cây danh mục chỉ hỗ trợ tối đa 2 cấp. '
            'Danh mục cha (%) đã có cha — không thể tạo danh mục cháu.', NEW.parent_id;
    END IF;

    -- Không cho tự tham chiếu chính nó
    IF NEW.parent_id = NEW.id THEN
        RAISE EXCEPTION 'Danh mục không thể là cha của chính nó (%).', NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS danh_muc_check_cap ON danh_muc;
CREATE TRIGGER danh_muc_check_cap
    BEFORE INSERT OR UPDATE ON danh_muc
    FOR EACH ROW
    EXECUTE FUNCTION trg_danh_muc_check_cap();

-- Index cho truy vấn thường gặp:
--   1. Lấy danh mục theo trạng thái, sắp xếp theo thu_tu_hien_thi
--   2. Lấy danh mục con của 1 danh mục gốc (parent_id)
--   3. Lọc theo trạng thái active (UI filter)
CREATE INDEX IF NOT EXISTS idx_danh_muc_active_order
    ON danh_muc (dang_hoat_dong, thu_tu_hien_thi);

CREATE INDEX IF NOT EXISTS idx_danh_muc_parent
    ON danh_muc (parent_id) WHERE parent_id IS NOT NULL;

-- =============================================================================
-- Dữ liệu mẫu — đồng bộ với `mockData/categories.ts` (8 nhóm cấp 1)
-- Đây là seed data, sau khi có bảng `san_pham` thì trigger sẽ cập nhật
-- `product_count` tự động.
-- =============================================================================
INSERT INTO danh_muc
    (id, ma_danh_muc, ten_danh_muc, parent_id, mo_ta,
     icon_emoji, mau_hex, thu_tu_hien_thi, product_count, dang_hoat_dong)
VALUES
    -- Nhóm 1: Đồ ăn nóng
    ('e5f6a7b8-0001-0000-0000-000000000001', 'DM-01',
     'Đồ ăn nóng', NULL,
     'Bánh bao, hot dog, mì trộn, xúc xích – chế biến tại quầy.',
     '🌭', '#E31837', 1, 6, TRUE),

    -- Nhóm 2: Nước giải khát
    ('e5f6a7b8-0001-0000-0000-000000000002', 'DM-02',
     'Nước giải khát', NULL,
     'Nước ngọt, trà, nước suối, nước tăng lực đóng chai/lon.',
     '🥤', '#0EA5E9', 2, 7, TRUE),

    -- Nhóm 3: Thức uống pha chế
    ('e5f6a7b8-0001-0000-0000-000000000003', 'DM-03',
     'Thức uống pha chế', NULL,
     'Froster, cà phê, trà sữa pha tại quầy.',
     '☕', '#FFC72C', 3, 4, TRUE),

    -- Nhóm 4: Bánh kẹo & Snack
    ('e5f6a7b8-0001-0000-0000-000000000004', 'DM-04',
     'Bánh kẹo & Snack', NULL,
     'Khoai tây chiên, bánh quy, socola, kẹo.',
     '🍫', '#6366F1', 4, 5, TRUE),

    -- Nhóm 5: Sữa & Chế phẩm
    ('e5f6a7b8-0001-0000-0000-000000000005', 'DM-05',
     'Sữa & Chế phẩm', NULL,
     'Sữa tươi, sữa chua, phô mai – bảo quản lạnh.',
     '🥛', '#10B981', 5, 4, TRUE),

    -- Nhóm 6: Mì & Thực phẩm khô
    ('e5f6a7b8-0001-0000-0000-000000000006', 'DM-06',
     'Mì & Thực phẩm khô', NULL,
     'Mì ăn liền, cháo gói, đồ hộp.',
     '🍜', '#F97316', 6, 4, TRUE),

    -- Nhóm 7: Hàng tiêu dùng
    ('e5f6a7b8-0001-0000-0000-000000000007', 'DM-07',
     'Hàng tiêu dùng', NULL,
     'Khăn giấy, pin, dao cạo, đồ dùng cá nhân.',
     '🧴', '#8B5CF6', 7, 4, TRUE),

    -- Nhóm 8: Kem & Đồ đông lạnh
    ('e5f6a7b8-0001-0000-0000-000000000008', 'DM-08',
     'Kem & Đồ đông lạnh', NULL,
     'Kem que, kem hộp, thực phẩm đông lạnh.',
     '🍦', '#14B8A6', 8, 3, TRUE),

    -- Ví dụ danh mục con (cấp 2) — minh hoạ cấu trúc cây
    ('e5f6a7b8-0001-0000-0000-000000000101', 'DM-01-01',
     'Bánh bao', 'e5f6a7b8-0001-0000-0000-000000000001',
     'Bánh bao nhân thịt, nhân đỗ xanh — chế biến tại quầy, hấp nóng mỗi giờ.',
     '🥟', '#E31837', 1, 2, TRUE),

    ('e5f6a7b8-0001-0000-0000-000000000102', 'DM-01-02',
     'Hot dog', 'e5f6a7b8-0001-0000-0000-000000000001',
     'Hot dog xúc xích Đức, kèm tương cà + mù tạt vàng.',
     '🌭', '#E31837', 2, 2, TRUE)
ON CONFLICT (ma_danh_muc) DO NOTHING;

COMMENT ON TABLE danh_muc IS
    'Phân loại nhóm hàng hoá dùng cho POS, lưới sản phẩm, báo cáo doanh thu '
    'theo danh mục. Hỗ trợ cấu trúc cây 2 cấp (gốc + con) — trigger đảm bảo '
    'không vượt quá 2 cấp.';

COMMENT ON COLUMN danh_muc.parent_id IS
    'NULL = danh mục gốc (cấp 1). != NULL = danh mục con (cấp 2). Trigger '
    '`trg_danh_muc_check_cap` chặn việc tạo danh mục cấp 3.';

COMMENT ON COLUMN danh_muc.ma_danh_muc IS
    'Mã hiển thị nội bộ (vd: DM-01, DM-01-01). Khác với UUID — dễ đọc trên '
    'báo cáo, Excel, in phiếu. UNIQUE để tra cứu nhanh. Backend sinh tự động '
    'khi INSERT (theo pattern: cấp 1 = DM-NN, cấp 2 = DM-NN-NN).';

COMMENT ON COLUMN danh_muc.icon_emoji IS
    'Emoji hiển thị trên lưới sản phẩm POS. Lưu VARCHAR thay vì file ảnh để '
    'render tức thì, không phụ thuộc asset. VARCHAR(8) đủ cho mọi emoji hiện '
    'tại (max 4 bytes/emoji trong UTF-8).';

COMMENT ON COLUMN danh_muc.mau_hex IS
    'Màu nền chip danh mục dùng đồng bộ giữa biểu đồ báo cáo và tag. Lưu hex '
    'string vd: #E31837. CHECK regex đảm bảo đúng format #RRGGBB để frontend '
    'dùng trực tiếp trong CSS mà không validate lại.';

COMMENT ON COLUMN danh_muc.product_count IS
    'Cột DENORMALIZED — đếm số sản phẩm ACTIVE thuộc danh mục. Lưu riêng để UI '
    'hiển thị nhanh (vd: "Đồ ăn nóng (6 SKU)") mà không phải COUNT() mỗi lần '
    'render. Trigger ở bảng `san_pham` sẽ tự động cập nhật khi INSERT/DELETE/ '
    'UPDATE trạng thái san_pham.';
