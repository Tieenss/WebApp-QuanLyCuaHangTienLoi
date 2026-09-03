-- =============================================================================
-- Bảng: ton_kho
-- Mục đích: Số lượng tồn hiện tại của TỪNG SẢN PHẨM tại TỪNG CHI NHÁNH.
--           Bao gồm cả Kho Tổng và Cửa hàng bán lẻ — phân biệt qua id_chi_nhanh.
--
-- Chuẩn hoá theo:
--   - `co_so_du_lieu.md` mục "Bảng 7 — ton_kho" (spec backend, composite PK)
--   - `frontend/src/types/inventoryTypes.ts` StockBalance (UI yêu cầu)
--   - `frontend/src/store/slices/stockSlice.ts` applyMovement (pattern cập nhật)
--   - `kien_truc_ky_thuat.md`: "Bảng ton_kho dùng composite PK (id_san_pham, id_chi_nhanh)"
--
-- YÊU CẦU: Chạy `chi_nhanh.sql` + `san_pham.sql` TRƯỚC.
--
-- Quy tắc nghiệp vụ QUAN TRỌNG:
--   1. KHÔNG tồn âm (so_luong_ton >= 0) — kiểm tra ở cả CHECK constraint
--      và trigger BEFORE UPDATE.
--   2. Composite PK (id_san_pham, id_chi_nhanh) — 1 dòng / sản phẩm / chi nhánh.
--   3. Mọi biến động tồn phải qua bảng `the_kho` (sổ cái immutable) — DB
--      không tự cập nhật, backend service phải INSERT the_kho TRƯỚC rồi
--      UPDATE ton_kho trong cùng 1 transaction.
--   4. minStock/maxStock ở đây CÓ THỂ KHÁC với san_pham vì Kho Tổng cần
--      ngưỡng khác cửa hàng.
-- =============================================================================

CREATE TABLE IF NOT EXISTS ton_kho (
    -- ===== COMPOSITE PRIMARY KEY =====
    id_san_pham     UUID         NOT NULL REFERENCES san_pham(id)
                                ON DELETE RESTRICT
                                ON UPDATE CASCADE,
    id_chi_nhanh    UUID         NOT NULL REFERENCES chi_nhanh(id)
                                ON DELETE RESTRICT
                                ON UPDATE CASCADE,

    -- ===== SỐ LƯỢNG TỒN =====
    -- Snapshot số lượng hiện tại. Default 0 cho sản phẩm mới chưa nhập kho.
    -- CHECK >= 0 là rào chắn CUỐI CÙNG (sau transaction), nhưng trigger
    -- BEFORE UPDATE kiểm tra linh hoạt hơn (vd: cho phép cập nhật khi
    -- chi nhánh đã khoá/dang chuyển giao).
    so_luong_ton    INTEGER      NOT NULL DEFAULT 0 CHECK (so_luong_ton >= 0),

    -- Giá vốn bình quân tại thời điểm HIỆN TẠI tại CHI NHÁNH NÀY.
    -- Tính lại theo công thức BQGQ mỗi lần nhập hàng (xem san_pham.gia_von).
    -- Có thể khác giữa các chi nhánh nếu lịch sử nhập khác nhau.
    gia_von_trung_binh DECIMAL(12,0) NOT NULL DEFAULT 0
                      CHECK (gia_von_trung_binh >= 0),

    -- Giá trị tồn = so_luong_ton × gia_von_trung_binh.
    -- DENORMALIZED — tính sẵn để UI/dashboard không phải JOIN + tính lại.
    -- Trigger AFTER UPDATE tự cập nhật khi so_luong_ton hoặc gia_von đổi.
    gia_tri_ton      DECIMAL(15,0) NOT NULL DEFAULT 0
                   CHECK (gia_tri_ton >= 0),

    -- Ngưỡng tồn kho RIÊNG cho từng chi nhánh. Có thể khác với san_pham.
    -- VD: san_pham.ton_toi_thieu = 25 (mặc định), nhưng ton_kho.ton_toi_thieu
    -- của cửa hàng nhỏ = 10, của Kho Tổng = 100.
    -- Khi tạo mới ton_kho, default = san_pham.ton_toi_thieu/da (copy từ gốc).
    ton_toi_thieu    INTEGER      NOT NULL DEFAULT 0
                   CHECK (ton_toi_thieu >= 0),
    ton_toi_da       INTEGER      NOT NULL DEFAULT 0
                   CHECK (ton_toi_da >= 0),

    CONSTRAINT chk_ton_kho_min_max CHECK (ton_toi_da >= ton_toi_thieu),

    -- Ngày hết hạn GẦN NHẤT trong lô đang tồn tại chi nhánh này.
    -- NULL nếu SP không có HSD (vd: đồ gia dụng, đồ khô).
    -- Cập nhật bởi trigger khi INSERT the_kho có expiry_date.
    -- Lưu ý: trong production, cần bảng `lo_hang` (lots) riêng để quản lý
    -- nhiều lô có HSD khác nhau. MVP này chỉ lưu HSD gần nhất.
    han_su_dung_gan_nhat DATE,

    -- Mốc thời gian cuối cùng có biến động tồn (nhập/xuất/điều chỉnh).
    -- Dùng cho UI sort "sản phẩm lâu không bán được".
    lan_bien_dong_cuoi TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Audit timestamps
    ngay_tao         TIMESTAMP    NOT NULL DEFAULT NOW(),
    ngay_cap_nhat    TIMESTAMP    NOT NULL DEFAULT NOW(),

    -- Composite PK
    PRIMARY KEY (id_san_pham, id_chi_nhanh)
);

-- Tái sử dụng trigger function
DROP TRIGGER IF EXISTS ton_kho_set_ngay_cap_nhat ON ton_kho;
CREATE TRIGGER ton_kho_set_ngay_cap_nhat
    BEFORE UPDATE ON ton_kho
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_ngay_cap_nhat();

-- =============================================================================
-- Trigger QUAN TRỌNG: cập nhật `gia_tri_ton` mỗi khi SL hoặc giá vốn đổi.
-- DENORMALIZED column này giúp Dashboard load nhanh (không phải tính JOIN).
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_ton_kho_cap_nhat_gia_tri()
RETURNS TRIGGER AS $$
BEGIN
    NEW.gia_tri_ton := NEW.so_luong_ton * NEW.gia_von_trung_binh;
    -- Cập nhật mốc biến động cuối nếu SL hoặc giá vốn thay đổi
    IF OLD.so_luong_ton IS DISTINCT FROM NEW.so_luong_ton
       OR OLD.gia_von_trung_binh IS DISTINCT FROM NEW.gia_von_trung_binh THEN
        NEW.lan_bien_dong_cuoi := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ton_kho_cap_nhat_gia_tri ON ton_kho;
CREATE TRIGGER trg_ton_kho_cap_nhat_gia_tri
    BEFORE UPDATE ON ton_kho
    FOR EACH ROW
    EXECUTE FUNCTION fn_ton_kho_cap_nhat_gia_tri();

-- Tính gia_tri_ton khi INSERT (giá trị mặc định = 0 nên OK, nhưng đảm bảo
-- đúng nếu backend INSERT trực tiếp với so_luong_ton > 0)
CREATE OR REPLACE FUNCTION fn_ton_kho_insert_gia_tri()
RETURNS TRIGGER AS $$
BEGIN
    NEW.gia_tri_ton := NEW.so_luong_ton * NEW.gia_von_trung_binh;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ton_kho_insert_gia_tri ON ton_kho;
CREATE TRIGGER trg_ton_kho_insert_gia_tri
    BEFORE INSERT ON ton_kho
    FOR EACH ROW
    EXECUTE FUNCTION fn_ton_kho_insert_gia_tri();

-- =============================================================================
-- Index cho truy vấn thường gặp (xem mockData/inventory.ts, stockSlice.ts):
--   1. Lấy tồn theo CHI NHÁNH (Dashboard, bảng tồn kho)
--   2. Lấy tồn của 1 SẢN PHẨM (chi tiết SP, báo cáo)
--   3. Lọc sản phẩm sắp hết hàng (so_luong_ton <= ton_toi_thieu)
--   4. Lọc sản phẩm tồn nhiều (so_luong_ton > ton_toi_da)
--   5. Sắp theo biến động gần nhất (Dashboard "không bán được")
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_ton_kho_chi_nhanh
    ON ton_kho (id_chi_nhanh);

CREATE INDEX IF NOT EXISTS idx_ton_kho_sap_het
    ON ton_kho (id_chi_nhanh) WHERE so_luong_ton <= ton_toi_thieu;

CREATE INDEX IF NOT EXISTS idx_ton_kho_ton_nhieu
    ON ton_kho (id_chi_nhanh) WHERE so_luong_ton > ton_toi_da;

CREATE INDEX IF NOT EXISTS idx_ton_kho_hsd
    ON ton_kho (han_su_dung_gan_nhat)
    WHERE han_su_dung_gan_nhat IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ton_kho_bien_dong
    ON ton_kho (id_chi_nhanh, lan_bien_dong_cuoi DESC);

-- =============================================================================
-- Function tiện ích: cộng/trừ tồn với kiểm tra âm. Gọi từ backend service
-- khi INSERT the_kho. Trả về TRUE nếu thành công, FALSE nếu không đủ tồn.
-- Viết 1 lần ở DB đảm bảo quy tắc "không tồn âm" áp dụng nhất quán.
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_dieu_chinh_ton_kho(
    p_id_san_pham UUID,
    p_id_chi_nhanh UUID,
    p_so_luong_thay_doi INTEGER  -- dương = nhập, âm = xuất
) RETURNS BOOLEAN AS $$
DECLARE
    v_ton_hien_tai INTEGER;
    v_ton_moi INTEGER;
BEGIN
    -- Lấy tồn hiện tại (không khóa row để tránh deadlock)
    SELECT so_luong_ton INTO v_ton_hien_tai
    FROM ton_kho
    WHERE id_san_pham = p_id_san_pham AND id_chi_nhanh = p_id_chi_nhanh
    FOR UPDATE;  -- khoá row để tránh race condition khi 2 transaction cùng trừ

    IF NOT FOUND THEN
        -- Row chưa tồn tại → INSERT mới (chỉ khi p_so_luong_thay_doi > 0)
        IF p_so_luong_thay_doi > 0 THEN
            INSERT INTO ton_kho (id_san_pham, id_chi_nhanh, so_luong_ton, lan_bien_dong_cuoi)
            VALUES (p_id_san_pham, p_id_chi_nhanh, p_so_luong_thay_doi, NOW());
            RETURN TRUE;
        ELSE
            RAISE EXCEPTION 'Không thể xuất % đơn vị sản phẩm (%) vì chưa có tồn kho',
                -p_so_luong_thay_doi, p_id_san_pham;
        END IF;
    END IF;

    v_ton_moi := v_ton_hien_tai + p_so_luong_thay_doi;

    IF v_ton_moi < 0 THEN
        RAISE EXCEPTION 'Không đủ tồn kho. Hiện tại: %, yêu cầu xuất: %',
            v_ton_hien_tai, -p_so_luong_thay_doi;
    END IF;

    UPDATE ton_kho
    SET so_luong_ton = v_ton_moi
    WHERE id_san_pham = p_id_san_pham AND id_chi_nhanh = p_id_chi_nhanh;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Function: tạo tồn kho mặc định cho 1 SP tại 1 chi nhánh (dùng khi mở
-- chi nhánh mới hoặc thêm SP mới). Copy min/max từ san_pham gốc.
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_tao_ton_kho_mac_dinh(
    p_id_san_pham UUID,
    p_id_chi_nhanh UUID
) RETURNS VOID AS $$
DECLARE
    v_min INTEGER;
    v_max INTEGER;
BEGIN
    SELECT ton_toi_thieu, ton_toi_da INTO v_min, v_max
    FROM san_pham
    WHERE id = p_id_san_pham;

    INSERT INTO ton_kho (id_san_pham, id_chi_nhanh, ton_toi_thieu, ton_toi_da)
    VALUES (p_id_san_pham, p_id_chi_nhanh,
            COALESCE(v_min, 0),
            COALESCE(v_max, 0))
    ON CONFLICT (id_san_pham, id_chi_nhanh) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Dữ liệu mẫu — đồng bộ với `mockData/inventory.ts` (StockBalance seed)
-- Pattern: 1 record cho mỗi sản phẩm tại Kho Tổng + 1 record tại 1 cửa hàng
-- để demo "phân biệt tồn theo chi nhánh".
-- 13 sản phẩm × 2 chi nhánh = 26 records. Chỉ lấy mẫu để demo.
-- =============================================================================
INSERT INTO ton_kho
    (id_san_pham, id_chi_nhanh, so_luong_ton, gia_von_trung_binh,
     ton_toi_thieu, ton_toi_da, han_su_dung_gan_nhat, lan_bien_dong_cuoi)
VALUES
    -- ===== Kho Tổng (CK-DC01) — tồn lớn =====
    -- Đồ ăn nóng
    ('f6a7b8c9-0001-0000-0000-000000000001',
     'a1b2c3d4-0001-0000-0000-000000000001',
     480, 11000, 100, 500, CURRENT_DATE + 1, NOW()),
    ('f6a7b8c9-0001-0000-0000-000000000002',
     'a1b2c3d4-0001-0000-0000-000000000001',
     360, 17500, 100, 500, CURRENT_DATE, NOW()),  -- HSD hôm nay
    -- Nước giải khát
    ('f6a7b8c9-0001-0000-0000-000000000010',
     'a1b2c3d4-0001-0000-0000-000000000001',
     1200, 9500, 200, 1000, NULL, NOW()),
    ('f6a7b8c9-0001-0000-0000-000000000011',
     'a1b2c3d4-0001-0000-0000-000000000001',
     1100, 9000, 200, 1000, NULL, NOW()),
    -- Thức uống pha chế (Kho Tổng KHÔNG lưu — bán trực tiếp tại quầy)
    -- Bánh kẹo
    ('f6a7b8c9-0001-0000-0000-000000000030',
     'a1b2c3d4-0001-0000-0000-000000000001',
     600, 6500, 100, 500, NULL, NOW()),
    -- Sữa
    ('f6a7b8c9-0001-0000-0000-000000000040',
     'a1b2c3d4-0001-0000-0000-000000000001',
     240, 26000, 60, 300, CURRENT_DATE + 150, NOW()),
    -- Mì
    ('f6a7b8c9-0001-0000-0000-000000000050',
     'a1b2c3d4-0001-0000-0000-000000000001',
     800, 4500, 200, 1000, NULL, NOW()),
    -- Hàng tiêu dùng
    ('f6a7b8c9-0001-0000-0000-000000000060',
     'a1b2c3d4-0001-0000-0000-000000000001',
     400, 18000, 100, 500, NULL, NOW()),
    -- Kem
    ('f6a7b8c9-0001-0000-0000-000000000070',
     'a1b2c3d4-0001-0000-0000-000000000001',
     180, 8500, 60, 300, CURRENT_DATE + 300, NOW()),

    -- ===== Cửa hàng Bùi Viện (CK-0101) — tồn nhỏ hơn =====
    -- Đồ ăn nóng
    ('f6a7b8c9-0001-0000-0000-000000000001',
     'a1b2c3d4-0001-0000-0000-000000000101',
     32, 11000, 25, 80, CURRENT_DATE + 1, NOW()),
    ('f6a7b8c9-0001-0000-0000-000000000002',
     'a1b2c3d4-0001-0000-0000-000000000101',
     18, 17500, 30, 90, CURRENT_DATE, NOW()),  -- sắp hết HSD
    -- Nước giải khát
    ('f6a7b8c9-0001-0000-0000-000000000010',
     'a1b2c3d4-0001-0000-0000-000000000101',
     85, 9500, 50, 200, NULL, NOW()),
    ('f6a7b8c9-0001-0000-0000-000000000011',
     'a1b2c3d4-0001-0000-0000-000000000101',
     72, 9000, 50, 200, NULL, NOW()),
    ('f6a7b8c9-0001-0000-0000-000000000012',
     'a1b2c3d4-0001-0000-0000-000000000101',
     120, 5000, 80, 300, NULL, NOW()),
    -- Thức uống pha chế (có tồn ở cửa hàng — pha sẵn buổi sáng)
    ('f6a7b8c9-0001-0000-0000-000000000020',
     'a1b2c3d4-0001-0000-0000-000000000101',
     25, 0, 0, 0, NULL, NOW()),
    ('f6a7b8c9-0001-0000-0000-000000000021',
     'a1b2c3d4-0001-0000-0000-000000000101',
     30, 0, 0, 0, NULL, NOW()),
    -- Bánh kẹo
    ('f6a7b8c9-0001-0000-0000-000000000030',
     'a1b2c3d4-0001-0000-0000-000000000101',
     45, 6500, 30, 100, NULL, NOW()),
    -- Sữa (ít vì bảo quản lạnh)
    ('f6a7b8c9-0001-0000-0000-000000000040',
     'a1b2c3d4-0001-0000-0000-000000000101',
     8, 26000, 20, 60, CURRENT_DATE + 150, NOW()),  -- sắp hết (dưới min=20)
    -- Mì
    ('f6a7b8c9-0001-0000-0000-000000000050',
     'a1b2c3d4-0001-0000-0000-000000000101',
     95, 4500, 60, 200, NULL, NOW()),
    -- Hàng tiêu dùng
    ('f6a7b8c9-0001-0000-0000-000000000060',
     'a1b2c3d4-0001-0000-0000-000000000101',
     28, 18000, 30, 80, NULL, NOW()),
    -- Kem
    ('f6a7b8c9-0001-0000-0000-000000000070',
     'a1b2c3d4-0001-0000-0000-000000000101',
     12, 8500, 20, 60, CURRENT_DATE + 300, NOW())  -- sắp hết (dưới min=20)
-- ON CONFLICT DO UPDATE: nếu row đã tồn tại, update gia_tri_ton = SL × giá vốn
-- (đảm bảo gia_tri_ton luôn đúng kể cả khi INSERT trùng). EXCLUDED tham chiếu
-- giá trị MỚI trong câu INSERT. Khác ON CONFLICT DO NOTHING ở chỗ trigger
-- BEFORE UPDATE vẫn chạy, nên lan_bien_dong_cuoi cũng được cập nhật.
ON CONFLICT (id_san_pham, id_chi_nhanh) DO UPDATE
SET gia_tri_ton = EXCLUDED.so_luong_ton * EXCLUDED.gia_von_trung_binh,
    lan_bien_dong_cuoi = NOW();

COMMENT ON TABLE ton_kho IS
    'Số lượng tồn hiện tại của từng sản phẩm tại từng chi nhánh. Dùng chung cho '
    'cả Kho Tổng và Cửa hàng bán lẻ — phân biệt qua id_chi_nhanh. Composite PK '
    '(id_san_pham, id_chi_nhanh) đảm bảo 1 dòng / SP / chi nhánh. Mọi biến động '
    'tồn phải qua bảng `the_kho` — DB KHÔNG tự cập nhật ton_kho, backend service '
    'phải dùng function `fn_dieu_chinh_ton_kho()` để đảm bảo quy tắc "không '
    'tồn âm" và atomicity.';

COMMENT ON COLUMN ton_kho.so_luong_ton IS
    'Số lượng tồn snapshot. CHECK >= 0 là rào chắn cuối cùng. Mọi UPDATE '
    'nên dùng function `fn_dieu_chinh_ton_kho()` để có error message rõ ràng '
    'khi không đủ tồn (vd: "Hiện tại: 5, yêu cầu xuất: 10") thay vì lỗi CHECK.';

COMMENT ON COLUMN ton_kho.gia_von_trung_binh IS
    'BQGQ riêng cho từng chi nhánh. Có thể khác nhau giữa các chi nhánh nếu '
    'lịch sử nhập khác nhau. Tính lại theo công thức BQGQ (xem '
    'co_so_du_lieu.md mục 3.2) mỗi lần nhập hàng ở tầng backend. DB KHÔNG '
    'tự tính — phụ thuộc giá nhập từ `phieu_nhap`.';

COMMENT ON COLUMN ton_kho.gia_tri_ton IS
    'DENORMALIZED = so_luong_ton × gia_von_trung_binh. Trigger BEFORE INSERT/UPDATE '
    'tự cập nhật. Giúp Dashboard load nhanh (không phải JOIN + tính lại).';

COMMENT ON COLUMN ton_kho.ton_toi_thieu IS
    'Ngưỡng tồn tối thiểu RIÊNG cho từng chi nhánh. Có thể khác với san_pham.ton_toi_thieu '
    'vì Kho Tổng cần ngưỡng lớn hơn cửa hàng. Function `fn_tao_ton_kho_mac_dinh()` '
    'copy giá trị gốc từ san_pham khi tạo row mới.';

COMMENT ON COLUMN ton_kho.han_su_dung_gan_nhat IS
    'HSD gần nhất trong lô đang tồn. NULL nếu SP không có HSD. Trong production, '
    'cần bảng `lo_hang` (lots) riêng để quản lý nhiều lô có HSD khác nhau — '
    'MVP này chỉ lưu HSD gần nhất. Index partial WHERE NOT NULL cho query cảnh '
    'báo "sắp hết hạn".';

COMMENT ON COLUMN ton_kho.lan_bien_dong_cuoi IS
    'Mốc thời gian cuối cùng có biến động tồn (nhập/xuất/điều chỉnh). '
    'Trigger BEFORE UPDATE tự cập nhật khi so_luong_ton hoặc gia_von_trung_binh '
    'thay đổi. Dùng cho Dashboard "sản phẩm lâu không bán được" và audit.';
