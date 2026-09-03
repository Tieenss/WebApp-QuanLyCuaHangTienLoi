-- =============================================================================
-- Bảng: nha_cung_cap
-- Mục đích: Danh sách nhà cung cấp hàng hoá. Là nguồn tham chiếu cho
--           `phieu_nhap` (nhập kho) và `san_pham.id_nha_cung_cap` (NCC mặc định).
--
-- Chuẩn hoá theo:
--   - `co_so_du_lieu.md` mục "Bảng 13 — nha_cung_cap" (spec backend cốt lõi)
--   - `frontend/src/types/supplierTypes.ts` Supplier (UI yêu cầu)
--   - `frontend/src/mockData/suppliers.ts` (dữ liệu mẫu 8 NCC)
--
-- KHÔNG cần FK tới bảng khác (bảng "nền" — chỉ được tham chiếu bởi bảng khác).
-- =============================================================================

CREATE TABLE IF NOT EXISTS nha_cung_cap (
    -- Khoá chính
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Mã hiển thị nội bộ (vd: 'NCC-001'). UNIQUE, dễ nhớ cho nhân viên mua hàng.
    -- Backend sinh tự động khi INSERT.
    ma_ncc          VARCHAR(20)  NOT NULL UNIQUE,

    ten_ncc         VARCHAR(255) NOT NULL,

    -- Mã số thuế VAT (MST) — UNIQUE vì mỗi DN chỉ có 1 MST.
    -- Format VN: 10 chữ số (cá nhân/ hộ KD) hoặc 10 chữ số + '-XXX' (chi nhánh).
    -- Cho phép NULL nếu NCC là cá nhân/ hộ KD không có MST.
    -- CHECK regex linh hoạt: chỉ chấp nhận 10-13 chữ số, có thể có dấu gạch ngang.
    ma_so_thue      VARCHAR(20)  UNIQUE
                   CHECK (ma_so_thue IS NULL
                          OR ma_so_thue ~ '^[0-9]{10}(-[0-9]{3})?$'),

    so_dien_thoai   VARCHAR(20),

    -- Email liên hệ. CHECK regex cơ bản — validate sâu hơn ở tầng backend.
    email           VARCHAR(255)
                   CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),

    dia_chi         VARCHAR(500),

    -- Người liên hệ chính (account manager) — tên + chức danh + SĐT.
    -- Lưu VARCHAR thay vì FK tới nhan_vien vì NCC là bên ngoài, không phải
    -- nhân viên công ty. Một số NCC có thể không có liên hệ cố định.
    nguoi_lien_he   VARCHAR(255),
    chuc_danh_lien_he VARCHAR(100),
    sdt_lien_he     VARCHAR(20),

    -- Điều khoản thanh toán. VARCHAR + CHECK thay vì ENUM type để dễ mở rộng.
    -- 4 giá trị phổ biến trong frontend.
    dieu_khoan_thanh_toan VARCHAR(50) NOT NULL DEFAULT 'Thanh toán ngay'
                            CHECK (dieu_khoan_thanh_toan IN (
                                'Thanh toán ngay',
                                'Công nợ 15 ngày',
                                'Công nợ 30 ngày',
                                'Công nợ 45 ngày',
                                'Công nợ 60 ngày'
                            )),

    -- Số ngày được phép nợ (DERIVED từ dieu_khoan_thanh_toan, lưu riêng để
    -- tính hạn thanh toán nhanh). Trigger tự đồng bộ khi UPDATE dieu_khoan_thanh_toan.
    -- 0 = thanh toán ngay (không có hạn).
    so_ngay_duoc_no INTEGER      NOT NULL DEFAULT 0
                   CHECK (so_ngay_duoc_no >= 0 AND so_ngay_duoc_no <= 180),

    -- ===== THỐNG KÊ DENORMALIZED =====
    -- tong_cong_no: tổng tiền chưa thanh toán cho NCC. Snapshot, cập nhật
    -- bằng trigger khi INSERT phieu_nhap hoặc khi duyệt thanh toán.
    -- tong_don_hang: tổng số phiếu nhập đã tạo. Cập nhật bằng trigger.
    -- 2 cột này giúp Dashboard/StatCard load nhanh (không phải COUNT/SUM).
    tong_cong_no    DECIMAL(15,0) NOT NULL DEFAULT 0
                   CHECK (tong_cong_no >= 0),
    tong_don_hang   INTEGER      NOT NULL DEFAULT 0
                   CHECK (tong_don_hang >= 0),

    -- Trạng thái. Khoá thay vì xoá để giữ FK từ phieu_nhap, san_pham.
    -- Map: ACTIVE → TRUE, INACTIVE → FALSE.
    dang_hoat_dong  BOOLEAN      NOT NULL DEFAULT TRUE,

    -- Ghi chú nội bộ (vd: "NCC chiến lược 2025", "đang đàm phán giá mới").
    ghi_chu         TEXT,

    ngay_tao        TIMESTAMP    NOT NULL DEFAULT NOW(),
    ngay_cap_nhat   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Tái sử dụng trigger function
DROP TRIGGER IF EXISTS nha_cung_cap_set_ngay_cap_nhat ON nha_cung_cap;
CREATE TRIGGER nha_cung_cap_set_ngay_cap_nhat
    BEFORE UPDATE ON nha_cung_cap
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_ngay_cap_nhat();

-- =============================================================================
-- Trigger tự đồng bộ `so_ngay_duoc_no` từ `dieu_khoan_thanh_toan`
-- Tránh phải nhập thủ công 2 field cùng lúc → tránh sai lệch.
-- =============================================================================
CREATE OR REPLACE FUNCTION trg_ncc_dong_bo_ngay_no()
RETURNS TRIGGER AS $$
BEGIN
    CASE NEW.dieu_khoan_thanh_toan
        WHEN 'Thanh toán ngay'    THEN NEW.so_ngay_duoc_no := 0;
        WHEN 'Công nợ 15 ngày'   THEN NEW.so_ngay_duoc_no := 15;
        WHEN 'Công nợ 30 ngày'   THEN NEW.so_ngay_duoc_no := 30;
        WHEN 'Công nợ 45 ngày'   THEN NEW.so_ngay_duoc_no := 45;
        WHEN 'Công nợ 60 ngày'   THEN NEW.so_ngay_duoc_no := 60;
    END CASE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ncc_dong_bo_ngay_no ON nha_cung_cap;
CREATE TRIGGER ncc_dong_bo_ngay_no
    BEFORE INSERT OR UPDATE OF dieu_khoan_thanh_toan ON nha_cung_cap
    FOR EACH ROW
    EXECUTE FUNCTION trg_ncc_dong_bo_ngay_no();

-- =============================================================================
-- Bảng quan hệ N-N: nha_cung_cap_danh_muc
-- Liên kết NCC với các danh mục hàng hoá mà họ cung cấp.
-- VD: Pepsico cung cấp 'Nước giải khát' + 'Bánh kẹo & Snack'.
-- Tách riêng thay vì lưu array trong nha_cung_cap để dễ query + index.
-- =============================================================================
CREATE TABLE IF NOT EXISTS nha_cung_cap_danh_muc (
    id_nha_cung_cap UUID         NOT NULL REFERENCES nha_cung_cap(id)
                                ON DELETE CASCADE
                                ON UPDATE CASCADE,
    id_danh_muc     UUID         NOT NULL REFERENCES danh_muc(id)
                                ON DELETE CASCADE
                                ON UPDATE CASCADE,
    ngay_tao        TIMESTAMP    NOT NULL DEFAULT NOW(),

    PRIMARY KEY (id_nha_cung_cap, id_danh_muc)
);

CREATE INDEX IF NOT EXISTS idx_ncc_dm_danh_muc
    ON nha_cung_cap_danh_muc (id_danh_muc);

-- Index cho query thường gặp (xem SuppliersPage, stockSlice, productFilter):
--   1. Lấy NCC đang active, sort theo tên
--   2. Lấy NCC theo điều khoản thanh toán (lọc công nợ)
--   3. Sort theo công nợ giảm dần (Dashboard "NCC nợ nhiều nhất")
--   4. Lấy NCC theo MST (tra cứu khi cần)
CREATE INDEX IF NOT EXISTS idx_ncc_active_ten
    ON nha_cung_cap (dang_hoat_dong, ten_ncc);

CREATE INDEX IF NOT EXISTS idx_ncc_dieu_khoan
    ON nha_cung_cap (dieu_khoan_thanh_toan, dang_hoat_dong);

CREATE INDEX IF NOT EXISTS idx_ncc_cong_no
    ON nha_cung_cap (tong_cong_no DESC) WHERE tong_cong_no > 0;

-- =============================================================================
-- Bật FK cứng từ `san_pham.id_nha_cung_cap` → `nha_cung_cap.id`
-- (Trước đó để NULL vì chưa có bảng nha_cung_cap — bỏ comment trong san_pham.sql)
-- =============================================================================
ALTER TABLE san_pham
    DROP CONSTRAINT IF EXISTS fk_san_pham_ncc;

ALTER TABLE san_pham
    ADD CONSTRAINT fk_san_pham_ncc
    FOREIGN KEY (id_nha_cung_cap) REFERENCES nha_cung_cap(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- =============================================================================
-- Dữ liệu mẫu — đồng bộ với `mockData/suppliers.ts` (8 NCC chính)
-- =============================================================================
INSERT INTO nha_cung_cap
    (id, ma_ncc, ten_ncc, ma_so_thue, so_dien_thoai, email, dia_chi,
     nguoi_lien_he, chuc_danh_lien_he, sdt_lien_he,
     dieu_khoan_thanh_toan, tong_cong_no, tong_don_hang, dang_hoat_dong,
     ghi_chu)
VALUES
    -- 1. Pepsico (NCC-001)
    ('0a1b2c3d-0001-0000-0000-000000000001', 'NCC-001',
     'Công Ty TNHH Pepsico Việt Nam', '0300845912',
     '028 3821 9999', 'contact@pepsico.com.vn',
     'Tầng 5, Toà nhà Sheraton, 88 Đồng Khởi, Quận 1, TP.HCM',
     'Nguyễn Văn A', 'Trưởng phòng KD', '0903111222',
     'Công nợ 30 ngày', 125000000, 48, TRUE,
     'NCC chiến lược, chiếm 40% doanh thu nước giải khát'),

    -- 2. Vinamilk (NCC-002)
    ('0a1b2c3d-0001-0000-0000-000000000002', 'NCC-002',
     'Công Ty Cổ Phần Sữa Việt Nam (Vinamilk)', '0300588569',
     '028 5415 5555', 'vinamilk@vinamilk.com.vn',
     '10 Tân Trào, Phường Tân Phú, Quận 7, TP.HCM',
     'Trần Thị B', 'Account Manager', '0903444555',
     'Công nợ 15 ngày', 84500000, 62, TRUE,
     'Sữa tươi + chế phẩm, giao 2 lần/tuần'),

    -- 3. Acecook (NCC-003)
    ('0a1b2c3d-0001-0000-0000-000000000003', 'NCC-003',
     'Công Ty TNHH Acecook Việt Nam', '0300600123',
     '028 3815 4064', 'info@acecookvietnam.com',
     'Lô II-3, Đường CN1, KCN Tân Bình, Quận Tân Phú, TP.HCM',
     'Lê Văn C', 'Giám đốc vùng', '0903777888',
     'Công nợ 30 ngày', 96000000, 55, TRUE,
     'Mì ăn liền, phổ biến toàn quốc'),

    -- 4. C.P. Vietnam (NCC-004)
    ('0a1b2c3d-0001-0000-0000-000000000004', 'NCC-004',
     'Công Ty TNHH Thực Phẩm C.P. Việt Nam', '3600248900',
     '0251 3836 251', 'info@cp.com.vn',
     'KCN Biên Hoà 2, Thành phố Biên Hoà, Đồng Nai',
     'Phạm Thị D', 'Quản lý kênh MT', '0903000111',
     'Thanh toán ngay', 0, 34, TRUE,
     'Thực phẩm tươi sống, giao trong ngày'),

    -- 5. Nestlé (NCC-005)
    ('0a1b2c3d-0001-0000-0000-000000000005', 'NCC-005',
     'Công Ty TNHH Nestlé Việt Nam', '3600170068',
     '028 3911 3737', 'contact@nestle.com.vn',
     'Lô A2-1, KCN Tân Thới Hiệp, Quận 12, TP.HCM',
     'Hoàng Văn E', 'Trưởng phòng bán hàng', '0903222333',
     'Công nợ 30 ngày', 64000000, 28, TRUE,
     'Cà phê, thức uống, sữa bột'),

    -- 6. Unilever (NCC-006)
    ('0a1b2c3d-0001-0000-0000-000000000006', 'NCC-006',
     'Công Ty TNHH Unilever Việt Nam', '0301535585',
     '028 5413 8888', 'contact@unilever.com.vn',
     'Lô A2-3, KCN Tây Bắc, Củ Chi, TP.HCM',
     'Võ Thị F', 'Account Manager', '0903555666',
     'Công nợ 45 ngày', 38000000, 21, TRUE,
     'Hàng tiêu dùng nhanh (FMCG)'),

    -- 7. Masan Consumer (NCC-007)
    ('0a1b2c3d-0001-0000-0000-000000000007', 'NCC-007',
     'Công Ty Cổ Phần Hàng Tiêu Dùng Masan', '0302016440',
     '028 6255 6666', 'contact@masanconsumer.com',
     'Tầng 12, Tòa nhà Vincom, 191 Bà Triệu, Hà Nội',
     'Đỗ Văn G', 'Giám đốc kinh doanh', '0903888999',
     'Công nợ 30 ngày', 52000000, 19, TRUE,
     'Nước chấm, gia vị, đồ uống đóng chai'),

    -- 8. Sabeco (NCC-008) - NCC inactive (ngừng hợp tác)
    ('0a1b2c3d-0001-0000-0000-000000000008', 'NCC-008',
     'Tổng Công Ty Bia - Rượu - Nước Giải Khát Sài Gòn (Sabeco)', '0300580009',
     '028 3829 4084', 'info@sabeco.com.vn',
     '187 Nguyễn Chí Thanh, Quận 5, TP.HCM',
     'Trương Văn H', 'Trưởng phòng KD', '0903000222',
     'Thanh toán ngay', 0, 5, FALSE,
     'Ngừng hợp tác từ Q1/2025, chuyển sang NCC khác')
ON CONFLICT (ma_ncc) DO NOTHING;

-- =============================================================================
-- Quan hệ N-N giữa NCC và danh mục — đồng bộ với `categories` ở frontend
-- =============================================================================
INSERT INTO nha_cung_cap_danh_muc (id_nha_cung_cap, id_danh_muc)
VALUES
    -- Pepsico: Nước giải khát + Bánh kẹo & Snack
    ('0a1b2c3d-0001-0000-0000-000000000001',
     'e5f6a7b8-0001-0000-0000-000000000002'),
    ('0a1b2c3d-0001-0000-0000-000000000001',
     'e5f6a7b8-0001-0000-0000-000000000004'),

    -- Vinamilk: Sữa & Chế phẩm
    ('0a1b2c3d-0001-0000-0000-000000000002',
     'e5f6a7b8-0001-0000-0000-000000000005'),

    -- Acecook: Đồ ăn nóng + Mì & Thực phẩm khô
    ('0a1b2c3d-0001-0000-0000-000000000003',
     'e5f6a7b8-0001-0000-0000-000000000001'),
    ('0a1b2c3d-0001-0000-0000-000000000003',
     'e5f6a7b8-0001-0000-0000-000000000006'),

    -- C.P.: Đồ ăn nóng (thực phẩm tươi sống)
    ('0a1b2c3d-0001-0000-0000-000000000004',
     'e5f6a7b8-0001-0000-0000-000000000001'),

    -- Nestlé: Thức uống pha chế + Sữa & Chế phẩm
    ('0a1b2c3d-0001-0000-0000-000000000005',
     'e5f6a7b8-0001-0000-0000-000000000003'),
    ('0a1b2c3d-0001-0000-0000-000000000005',
     'e5f6a7b8-0001-0000-0000-000000000005'),

    -- Unilever: Hàng tiêu dùng
    ('0a1b2c3d-0001-0000-0000-000000000006',
     'e5f6a7b8-0001-0000-0000-000000000007'),

    -- Masan: Mì & Thực phẩm khô (gia vị) + Nước giải khát
    ('0a1b2c3d-0001-0000-0000-000000000007',
     'e5f6a7b8-0001-0000-0000-000000000006'),
    ('0a1b2c3d-0001-0000-0000-000000000007',
     'e5f6a7b8-0001-0000-0000-000000000002')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- Cập nhật `san_pham.id_nha_cung_cap` cho các SP đã seed
-- (Trước đó NULL vì chưa có bảng NCC)
-- =============================================================================
UPDATE san_pham SET id_nha_cung_cap = '0a1b2c3d-0001-0000-0000-000000000001'  -- Pepsico
WHERE ma_vach IN ('8934567000100', '8934567000117');  -- Coca, Pepsi

UPDATE san_pham SET id_nha_cung_cap = '0a1b2c3d-0001-0000-0000-000000000002'  -- Vinamilk
WHERE ma_vach = '8934567000407';  -- Vinamilk 1L

UPDATE san_pham SET id_nha_cung_cap = '0a1b2c3d-0001-0000-0000-000000000003'  -- Acecook
WHERE ma_vach = '8934567000506';  -- Hảo Hảo

UPDATE san_pham SET id_nha_cung_cap = '0a1b2c3d-0001-0000-0000-000000000006'  -- Unilever
WHERE ma_vach = '8934567000605';  -- Tempo

UPDATE san_pham SET id_nha_cung_cap = '0a1b2c3d-0001-0000-0000-000000000005'  -- Nestlé
WHERE ma_vach IN ('8934567000209', '8934567000216');  -- Froster, Cà phê

UPDATE san_pham SET id_nha_cung_cap = '0a1b2c3d-0001-0000-0000-000000000004'  -- C.P.
WHERE ma_vach IN ('8934567000011', '8934567000028', '8934567000035');  -- Bánh bao, Hot dog, Mì trộn

UPDATE san_pham SET id_nha_cung_cap = '0a1b2c3d-0001-0000-0000-000000000001'  -- Pepsico (snack)
WHERE ma_vach = '8934567000308';  -- Oishi

UPDATE san_pham SET id_nha_cung_cap = '0a1b2c3d-0001-0000-0000-000000000007'  -- Masan
WHERE ma_vach = '8934567000704';  -- Cornetto (đại diện)

COMMENT ON TABLE nha_cung_cap IS
    'Danh sách nhà cung cấp hàng hoá. Là nguồn tham chiếu cho `phieu_nhap` '
    '(nhập kho) và `san_pham.id_nha_cung_cap` (NCC mặc định của sản phẩm). '
    'Quan hệ N-N với `danh_muc` qua bảng trung gian `nha_cung_cap_danh_muc` — '
    'mỗi NCC có thể cung cấp nhiều nhóm hàng (vd: Pepsico cung cấp cả nước '
    'giải khát + snack).';

COMMENT ON COLUMN nha_cung_cap.ma_so_thue IS
    'Mã số thuế VAT theo quy định VN. UNIQUE vì mỗi DN chỉ có 1 MST. Format: '
    '10 chữ số (DN chính) hoặc 10 chữ số + "-XXX" (chi nhánh, vd: '
    '"0300845912-001"). CHECK regex ^[0-9]{10}(-[0-9]{3})?$. NULL nếu '
    'NCC là cá nhân/hộ KD không có MST.';

COMMENT ON COLUMN nha_cung_cap.email IS
    'Email liên hệ. CHECK regex cơ bản — validate sâu (MX record, '
    'catch-all, bounce test) ở tầng backend.';

COMMENT ON COLUMN nha_cung_cap.dieu_khoan_thanh_toan IS
    'Điều khoản thanh toán ảnh hưởng hạn nợ. 5 giá trị: Thanh toán ngay '
    '(0 ngày), Công nợ 15/30/45/60 ngày. Trigger `trg_ncc_dong_bo_ngay_no` '
    'tự động sync `so_ngay_duoc_no` từ field này — tránh nhập tay lệch.';

COMMENT ON COLUMN nha_cung_cap.so_ngay_duoc_no IS
    'Số ngày được phép nợ — DERIVED từ `dieu_khoan_thanh_toan`. Lưu riêng để '
    'tính hạn thanh toán nhanh (vd: han_thanh_toan = ngay_nhap + so_ngay_duoc_no). '
    '0 = thanh toán ngay. Trigger tự đồng bộ khi UPDATE dieu_khoan_thanh_toan.';

COMMENT ON COLUMN nha_cung_cap.tong_cong_no IS
    'Tổng công nợ chưa thanh toán (VND). DENORMALIZED — cập nhật bằng trigger '
    'khi INSERT phieu_nhap (cộng tong_tien) hoặc khi duyệt thanh toán công nợ '
    '(trừ). Dashboard lấy trực tiếp để sort "NCC nợ nhiều nhất" không cần SUM().';

COMMENT ON COLUMN nha_cung_cap.tong_don_hang IS
    'Tổng số phiếu nhập đã tạo với NCC này. DENORMALIZED — cập nhật bằng trigger '
    'khi INSERT phieu_nhap (+1). StatCard dùng để hiển thị nhanh.';

COMMENT ON TABLE nha_cung_cap_danh_muc IS
    'Quan hệ N-N: NCC ↔ Danh mục hàng hoá. Tách thành bảng riêng (thay vì '
    'lưu array trong nha_cung_cap) để: (1) FK chuẩn với danh_muc, '
    '(2) query "NCC nào cung cấp danh mục X" nhanh với index, '
    '(3) ON DELETE CASCADE tự dọn khi xoá NCC hoặc danh mục. '
    'Composite PK (id_nha_cung_cap, id_danh_muc) chống trùng.';
