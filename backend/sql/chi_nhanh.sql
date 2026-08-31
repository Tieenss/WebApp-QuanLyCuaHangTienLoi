-- =============================================================================
-- Bảng: chi_nhanh
-- Mục đích: Lưu danh sách địa điểm trong chuỗi Circle K — bao gồm cả Kho Tổng
--           và Cửa hàng bán lẻ. Phân biệt bằng cột `loai`.
--
-- Chuẩn hoá theo:
--   - `co_so_du_lieu.md` mục "Bảng 1 — chi_nhanh" (spec backend tối giản)
--   - `frontend/src/types/branchTypes.ts` (Branch interface — UI yêu cầu)
--   - `frontend/src/mockData/branches.ts` (dữ liệu mẫu 8 chi nhánh)
--
-- Nền tảng: PostgreSQL (Neon DB — serverless).
-- Chạy trực tiếp trong Neon SQL Editor hoặc psql.
-- =============================================================================

-- Định nghĩa ENUM để CHECK constraint được DB enforce (PostgreSQL native ENUM).
-- Dùng CHECK thay vì ENUM type để dễ ALTER thêm giá trị sau này.
CREATE TABLE IF NOT EXISTS chi_nhanh (
    -- Khoá chính
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Mã hiển thị nội bộ (vd: 'CK-0101', 'CK-DC01') — KHÔNG dùng UUID làm mã
    -- vì cần đọc nhanh khi in phiếu, quét QR nội bộ, đối chiếu Excel.
    -- Format: 'CK-' + 4 chữ số (CK-DC01 cho Kho Tổng theo quy ước mockData).
    ma_chi_nhanh    VARCHAR(20)  NOT NULL UNIQUE,

    ten_chi_nhanh   VARCHAR(255) NOT NULL,

    -- Phân loại theo đặc tả: Kho Tổng là nguồn nhập/xuất nội bộ, Cửa hàng
    -- bán lẻ là điểm POS. BR-05: chỉ Kho Tổng nhập từ NCC.
    loai            VARCHAR(20)  NOT NULL
                   CHECK (loai IN ('KHO_TONG', 'CUA_HANG_BAN_LE')),

    -- Vùng miền dùng cho báo cáo doanh thu theo khu vực (UI hiển thị).
    vung_mien       VARCHAR(10)  NOT NULL DEFAULT 'SOUTH'
                   CHECK (vung_mien IN ('SOUTH', 'NORTH', 'CENTRAL')),

    -- Địa chỉ tách nhỏ để lọc theo tỉnh/quận (vd: lọc cửa hàng Hà Nội).
    tinh_thanh      VARCHAR(100) NOT NULL,
    quan_huyen      VARCHAR(100) NOT NULL,
    -- Địa chỉ cụ thể (số nhà, đường, phường). Trong `co_so_du_lieu.md` gộp
    -- thành 1 cột `dia_chi` — tách nhỏ cho dễ index và search.
    dia_chi_chi_tiet VARCHAR(500),

    so_dien_thoai   VARCHAR(20),

    -- Giờ mở cửa. Cửa hàng tiện lợi thường ghi "24/7", Kho Tổng ghi ca hành
    -- chính (vd: "06:00 - 22:00"). Lưu VARCHAR để không phải validate format
    -- "HH:MM - HH:MM" quá chặt ở tầng DB.
    gio_mo_cua      VARCHAR(50),

    -- Quản lý chi nhánh — tham chiếu sang `nhan_vien` (bảng 2). Chưa có FK vì
    -- tạo `chi_nhanh` trước `nhan_vien` trong script này; nếu DB đã có
    -- `nhan_vien` thì bật FK bằng cách bỏ comment ALTER TABLE bên dưới.
    id_quan_ly      UUID,

    -- Diện tích sàn (m²) — dùng tính doanh thu / m² trên Dashboard.
    dien_tich_m2    NUMERIC(10,2) NOT NULL DEFAULT 0
                   CHECK (dien_tich_m2 >= 0),

    -- Doanh thu tháng gần nhất (VND) — dữ liệu snapshot để xếp hạng chi
    -- nhánh, không cần realtime chính xác. Cập nhật bằng batch job hàng đêm.
    doanh_thu_thang BIGINT       NOT NULL DEFAULT 0
                   CHECK (doanh_thu_thang >= 0),

    ngay_khai_truong DATE,

    -- Trạng thái hoạt động. Đặc tả yêu cầu khoá thay vì xoá cứng.
    -- TRUE = đang hoạt động, FALSE = tạm đóng.
    dang_hoat_dong  BOOLEAN      NOT NULL DEFAULT TRUE,

    -- Audit timestamps
    ngay_tao        TIMESTAMP    NOT NULL DEFAULT NOW(),
    ngay_cap_nhat   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Tự cập nhật `ngay_cap_nhat` khi UPDATE. PostgreSQL chưa có
-- `ON UPDATE CURRENT_TIMESTAMP` như MySQL, phải dùng trigger.
CREATE OR REPLACE FUNCTION trg_set_ngay_cap_nhat()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ngay_cap_nhat = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chi_nhanh_set_ngay_cap_nhat ON chi_nhanh;
CREATE TRIGGER chi_nhanh_set_ngay_cap_nhat
    BEFORE UPDATE ON chi_nhanh
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_ngay_cap_nhat();

-- Index cho các truy vấn thường gặp trong codebase
-- (xem store/slices/branchSlice.ts và mockData/analytics.ts):
--   1. Lọc theo loai + trạng thái:  activeStores filter
--   2. Lọc theo vung_mien:           báo cáo doanh thu theo miền
CREATE INDEX IF NOT EXISTS idx_chi_nhanh_loai_active
    ON chi_nhanh (loai, dang_hoat_dong);

CREATE INDEX IF NOT EXISTS idx_chi_nhanh_vung_mien
    ON chi_nhanh (vung_mien);

CREATE INDEX IF NOT EXISTS idx_chi_nhanh_tinh_thanh
    ON chi_nhanh (tinh_thanh);

-- =============================================================================
-- Dữ liệu mẫu — đồng bộ với `frontend/src/mockData/branches.ts`
-- 1 Kho Tổng + 7 cửa hàng bán lẻ + 1 cửa hàng tạm đóng.
-- INSERT ... ON CONFLICT để chạy lại script nhiều lần không lỗi.
-- =============================================================================
INSERT INTO chi_nhanh
    (id, ma_chi_nhanh, ten_chi_nhanh, loai, vung_mien, tinh_thanh, quan_huyen,
     dia_chi_chi_tiet, so_dien_thoai, gio_mo_cua, dien_tich_m2, doanh_thu_thang,
     ngay_khai_truong, dang_hoat_dong)
VALUES
    -- Kho Tổng Miền Nam
    ('a1b2c3d4-0001-0000-0000-000000000001', 'CK-DC01',
     'Kho Tổng Circle K Miền Nam', 'KHO_TONG', 'SOUTH',
     'TP. Hồ Chí Minh', 'Huyện Bình Chánh',
     'Lô C2-1, KCN Vĩnh Lộc, Đường Nguyễn Thị Tú', '028 3765 1100',
     '06:00 - 22:00', 4200, 0, '2019-03-15', TRUE),

    -- Cửa hàng Miền Nam (5 cửa hàng Sài Gòn)
    ('a1b2c3d4-0001-0000-0000-000000000101', 'CK-0101',
     'Circle K Bùi Viện', 'CUA_HANG_BAN_LE', 'SOUTH',
     'TP. Hồ Chí Minh', 'Quận 1',
     '185 Bùi Viện, Phường Phạm Ngũ Lão', '028 3920 4411',
     '24/7', 132, 1482600000, '2020-06-01', TRUE),
    ('a1b2c3d4-0001-0000-0000-000000000102', 'CK-0102',
     'Circle K Trần Quốc Thảo', 'CUA_HANG_BAN_LE', 'SOUTH',
     'TP. Hồ Chí Minh', 'Quận 3',
     '78 Trần Quốc Thảo, Phường Võ Thị Sáu', '028 3932 7788',
     '24/7', 118, 1146200000, '2020-11-20', TRUE),
    ('a1b2c3d4-0001-0000-0000-000000000103', 'CK-0103',
     'Circle K Thảo Điền', 'CUA_HANG_BAN_LE', 'SOUTH',
     'TP. Hồ Chí Minh', 'TP. Thủ Đức',
     '25 Nguyễn Văn Hưởng, Phường Thảo Điền', '028 3744 2299',
     '24/7', 145, 1318900000, '2021-04-08', TRUE),
    ('a1b2c3d4-0001-0000-0000-000000000104', 'CK-0104',
     'Circle K Phan Xích Long', 'CUA_HANG_BAN_LE', 'SOUTH',
     'TP. Hồ Chí Minh', 'Quận Phú Nhuận',
     '112 Phan Xích Long, Phường 2', '028 3517 6633',
     '24/7', 108, 962400000, '2022-02-14', TRUE),

    -- Cửa hàng Miền Bắc (2 cửa hàng Hà Nội)
    ('a1b2c3d4-0001-0000-0000-000000000201', 'CK-0201',
     'Circle K Hoàn Kiếm', 'CUA_HANG_BAN_LE', 'NORTH',
     'Hà Nội', 'Quận Hoàn Kiếm',
     '42 Hàng Bài, Phường Hàng Bài', '024 3936 5511',
     '24/7', 126, 1205700000, '2021-09-30', TRUE),
    ('a1b2c3d4-0001-0000-0000-000000000202', 'CK-0202',
     'Circle K Cầu Giấy', 'CUA_HANG_BAN_LE', 'NORTH',
     'Hà Nội', 'Quận Cầu Giấy',
     '215 Xuân Thủy, Phường Dịch Vọng Hậu', '024 3767 8822',
     '24/7', 134, 1089300000, '2022-07-11', TRUE),

    -- Cửa hàng Miền Trung
    ('a1b2c3d4-0001-0000-0000-000000000301', 'CK-0301',
     'Circle K Trần Phú Đà Nẵng', 'CUA_HANG_BAN_LE', 'CENTRAL',
     'Đà Nẵng', 'Quận Hải Châu',
     '88 Trần Phú, Phường Hải Châu 1', '0236 3821 4477',
     '06:00 - 24:00', 96, 684500000, '2023-05-19', TRUE),

    -- Cửa hàng tạm đóng (kiểm tra logic khoá thay vì xoá)
    ('a1b2c3d4-0001-0000-0000-000000000105', 'CK-0105',
     'Circle K Nguyễn Trãi (Tạm đóng)', 'CUA_HANG_BAN_LE', 'SOUTH',
     'TP. Hồ Chí Minh', 'Quận 5',
     '456 Nguyễn Trãi, Phường 8', '028 3923 1100',
     '24/7', 102, 0, '2021-01-25', FALSE)
ON CONFLICT (ma_chi_nhanh) DO NOTHING;

-- =============================================================================
-- (Tuỳ chọn) FK tới bảng `nhan_vien` — BẬT khi đã tạo bảng nhân viên.
-- Bỏ comment nếu `nhan_vien` đã tồn tại và bạn muốn ràng buộc tham chiếu.
-- =============================================================================
-- ALTER TABLE chi_nhanh
--     ADD CONSTRAINT fk_chi_nhanh_quan_ly
--     FOREIGN KEY (id_quan_ly) REFERENCES nhan_vien(id)
--     ON DELETE SET NULL
--     ON UPDATE CASCADE;

COMMENT ON TABLE chi_nhanh IS
    'Danh sách địa điểm trong chuỗi Circle K (Kho Tổng + Cửa hàng bán lẻ). '
    'Mỗi chi nhánh có thể có 1 quản lý, nhiều nhân viên, nhiều phiếu xuất/nhập.';

COMMENT ON COLUMN chi_nhanh.loai IS
    'KHO_TONG: nguồn nhập từ NCC, xuất nội bộ. CUA_HANG_BAN_LE: điểm POS, '
    'nhận hàng qua phiếu xuất nội bộ.';

COMMENT ON COLUMN chi_nhanh.dang_hoat_dong IS
    'Khoá chi nhánh thay vì xoá cứng để giữ lịch sử giao dịch (FK từ nhan_vien, '
    'ton_kho, phieu_xuat_kho, hoa_don...).';
