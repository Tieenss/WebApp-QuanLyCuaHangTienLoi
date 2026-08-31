-- =============================================================================
-- Bảng: nhan_vien
-- Mục đích: Tài khoản đăng nhập, phân quyền, thông tin lương & ngân hàng.
--           Là trung tâm của toàn bộ hệ thống ERP — 5 vai trò theo đặc tả.
--
-- Chuẩn hoá theo:
--   - `co_so_du_lieu.md` mục "Bảng 2 — nhan_vien" (spec backend)
--   - `frontend/src/types/employeeTypes.ts` (Employee interface)
--   - `frontend/src/types/authTypes.ts` (5 vai trò + branchId nullable)
--
-- Nền tảng: PostgreSQL (Neon DB — serverless).
-- YÊU CẦU: Chạy file `chi_nhanh.sql` TRƯỚC vì bảng này có FK tới `chi_nhanh`.
-- =============================================================================

CREATE TABLE IF NOT EXISTS nhan_vien (
    -- Khoá chính
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

    -- FK tới chi nhánh làm việc. Admin + Kế toán làm việc tại trụ sở nên
    -- branchId = NULL (xem authTypes.ts:85). CHECK constraint đảm bảo các
    -- vai trò vận hành (THU_KHO / QUAN_LY / THU_NGAN) BẮT BUỘC có chi nhánh.
    id_chi_nhanh    UUID         REFERENCES chi_nhanh(id)
                                ON DELETE SET NULL
                                ON UPDATE CASCADE,

    -- Mã hiển thị nội bộ (vd: NV-0001, NV-0012) — KHÔNG dùng UUID làm mã vì
    -- cần hiển thị trên bảng lương, chấm công, in phiếu. UNIQUE để tra cứu
    -- nhanh và tránh trùng khi sinh tự động ở backend.
    ma_nhan_vien    VARCHAR(20)  NOT NULL UNIQUE,

    ten_dang_nhap   VARCHAR(100) NOT NULL UNIQUE,

    -- Lưu dạng HASH (BCrypt/Argon2id), TUYỆT ĐỐI không lưu plain text.
    -- VARCHAR(255) là đủ cho BCrypt 60-char + future hash algorithm dài hơn.
    mat_khau        VARCHAR(255) NOT NULL,

    ho_ten          VARCHAR(255) NOT NULL,
    so_dien_thoai   VARCHAR(20),
    email           VARCHAR(255) UNIQUE,

    -- Vai trò quyết định toàn bộ phân quyền trong hệ thống (xem authTypes.ts
    -- USER_ROLE). Map kiểu TypeScript → DB: ADMIN/KE_TOAN/THU_KHO/QUAN_LY/THU_NGAN.
    vai_tro         VARCHAR(20)  NOT NULL
                   CHECK (vai_tro IN ('ADMIN', 'KE_TOAN', 'THU_KHO', 'QUAN_LY', 'THU_NGAN')),

    -- Chức danh công việc (vd: "Trưởng ca", "Nhân viên bán hàng") — UI hiển thị,
    -- không ảnh hưởng phân quyền (phân quyền theo `vai_tro`).
    vi_tri          VARCHAR(100),

    -- Loại hợp đồng: ảnh hưởng cách tính lương (theo giờ / theo tháng).
    -- FULL_TIME có lương cứng `luong_cung`, PART_TIME chỉ có `luong_theo_gio`.
    loai_hop_dong   VARCHAR(20)  NOT NULL DEFAULT 'FULL_TIME'
                   CHECK (loai_hop_dong IN ('FULL_TIME', 'PART_TIME')),

    -- Ca làm việc mặc định — dùng gợi ý khi chấm công, có thể bị override
    -- theo lịch làm việc tuần/ngày cụ thể.
    ca_mac_dinh     VARCHAR(20)  NOT NULL DEFAULT 'MORNING'
                   CHECK (ca_mac_dinh IN ('MORNING', 'AFTERNOON', 'NIGHT')),

    -- DECIMAL(12,0) = tối đa 999,999,999,999 VNĐ (đủ cho mọi mức lương VN).
    luong_theo_gio  DECIMAL(12,0) NOT NULL DEFAULT 0
                   CHECK (luong_theo_gio >= 0),
    luong_cung      DECIMAL(12,0) NOT NULL DEFAULT 0
                   CHECK (luong_cung >= 0),

    -- Thông tin ngân hàng nhận lương (chuẩn NAPAS Việt Nam).
    -- Validation format STK ở tầng backend, DB chỉ giữ string.
    so_tai_khoan    VARCHAR(30),
    ten_ngan_hang   VARCHAR(100),

    ngay_vao_lam    DATE         NOT NULL DEFAULT CURRENT_DATE,

    -- Khoá nhân viên thay vì xoá cứng — giữ lịch sử chấm công / bảng lương.
    -- Map: ACTIVE → TRUE, INACTIVE → FALSE (giống bảng chi_nhanh).
    dang_hoat_dong  BOOLEAN      NOT NULL DEFAULT TRUE,

    ngay_tao        TIMESTAMP    NOT NULL DEFAULT NOW(),
    ngay_cap_nhat   TIMESTAMP    NOT NULL DEFAULT NOW(),

    -- Đảm bảo rule nghiệp vụ: 4 vai trò vận hành BẮT BUỘC có chi nhánh,
    -- 2 vai trò trụ sở (Admin + Kế toán) cho phép NULL.
    CONSTRAINT chk_vai_tro_chi_nhanh CHECK (
        (vai_tro IN ('ADMIN', 'KE_TOAN') AND id_chi_nhanh IS NULL)
        OR
        (vai_tro IN ('THU_KHO', 'QUAN_LY', 'THU_NGAN') AND id_chi_nhanh IS NOT NULL)
    )
);

-- Tái sử dụng trigger function đã tạo trong chi_nhanh.sql
-- (Neon cho phép gọi function đã tồn tại)
DROP TRIGGER IF EXISTS nhan_vien_set_ngay_cap_nhat ON nhan_vien;
CREATE TRIGGER nhan_vien_set_ngay_cap_nhat
    BEFORE UPDATE ON nhan_vien
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_ngay_cap_nhat();

-- Index cho truy vấn thường gặp (xem employeeSlice, authSlice, mockData):
--   1. Lấy nhân viên theo chi nhánh:   WHERE id_chi_nhanh = ?
--   2. Lấy nhân viên theo vai trò:    WHERE vai_tro = ?
--   3. Login:                          WHERE ten_dang_nhap = ? (UNIQUE đã tạo index)
--   4. Đăng ký ca mặc định:           WHERE ca_mac_dinh = ? AND dang_hoat_dong
CREATE INDEX IF NOT EXISTS idx_nhan_vien_chi_nhanh
    ON nhan_vien (id_chi_nhanh) WHERE id_chi_nhanh IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nhan_vien_vai_tro
    ON nhan_vien (vai_tro);

CREATE INDEX IF NOT EXISTS idx_nhan_vien_ca_mac_dinh
    ON nhan_vien (ca_mac_dinh, dang_hoat_dong);

-- =============================================================================
-- Dữ liệu mẫu — đồng bộ với `frontend/src/mockData/accounts.ts` (9 user demo)
-- Mật khẩu dạng PLAIN TEXT chỉ để demo, hash thật sẽ do backend tạo khi INSERT.
-- Trong production: KHÔNG được lưu plain password. Script này chỉ dùng
-- để khởi tạo DB dev, sau khi login thật phải đổi mật khẩu ngay.
-- =============================================================================
INSERT INTO nhan_vien
    (id, id_chi_nhanh, ma_nhan_vien, ten_dang_nhap, mat_khau, ho_ten,
     so_dien_thoai, email, vai_tro, vi_tri, loai_hop_dong, ca_mac_dinh,
     luong_theo_gio, luong_cung, so_tai_khoan, ten_ngan_hang, ngay_vao_lam,
     dang_hoat_dong)
VALUES
    -- Quản trị + Kế toán (trụ sở, NULL chi nhánh)
    ('b2c3d4e5-0001-0000-0000-000000000001', NULL, 'NV-0001',
     'admin', '$2a$10$DEMO_BCRYPT_HASH_admin_change_in_prod',
     'Nguyễn Minh Tuấn', '0901000001', 'admin@circlek.vn',
     'ADMIN', 'Giám đốc vận hành', 'FULL_TIME', 'MORNING',
     0, 45000000, '0123456789', 'Vietcombank', '2018-01-15', TRUE),

    ('b2c3d4e5-0001-0000-0000-000000000002', NULL, 'NV-0002',
     'ketoan', '$2a$10$DEMO_BCRYPT_HASH_ketoan_change_in_prod',
     'Phạm Thị Hồng', '0901000002', 'ketoan@circlek.vn',
     'KE_TOAN', 'Kế toán trưởng', 'FULL_TIME', 'MORNING',
     0, 32000000, '0123456790', 'ACB', '2019-03-20', TRUE),

    -- Thủ kho (Kho Tổng)
    ('b2c3d4e5-0001-0000-0000-000000000003',
     'a1b2c3d4-0001-0000-0000-000000000001', 'NV-0003',
     'thukho', '$2a$10$DEMO_BCRYPT_HASH_thukho_change_in_prod',
     'Phạm Quốc Hưng', '0901000003', 'thukho@circlek.vn',
     'THU_KHO', 'Trưởng phòng kho', 'FULL_TIME', 'MORNING',
     0, 28000000, '0123456791', 'Techcombank', '2019-03-15', TRUE),

    -- Quản lý chi nhánh
    ('b2c3d4e5-0001-0000-0000-000000000004',
     'a1b2c3d4-0001-0000-0000-000000000101', 'NV-0004',
     'quanly_bv', '$2a$10$DEMO_BCRYPT_HASH_quanly_bv_change_in_prod',
     'Trần Văn Anh', '0901000004', 'quanly.bvien@circlek.vn',
     'QUAN_LY', 'Quản lý cửa hàng', 'FULL_TIME', 'MORNING',
     0, 22000000, '0123456792', 'MB Bank', '2020-06-01', TRUE),

    ('b2c3d4e5-0001-0000-0000-000000000005',
     'a1b2c3d4-0001-0000-0000-000000000102', 'NV-0005',
     'quanly_tqt', '$2a$10$DEMO_BCRYPT_HASH_quanly_tqt_change_in_prod',
     'Nguyễn Thị Kim Ngân', '0901000005', 'quanly.tqt@circlek.vn',
     'QUAN_LY', 'Quản lý cửa hàng', 'FULL_TIME', 'AFTERNOON',
     0, 21000000, '0123456793', 'MB Bank', '2020-11-20', TRUE),

    -- Thu ngân (3 ca khác nhau)
    ('b2c3d4e5-0001-0000-0000-000000000006',
     'a1b2c3d4-0001-0000-0000-000000000101', 'NV-0006',
     'thungan_bv_1', '$2a$10$DEMO_BCRYPT_HASH_thungan1_change_in_prod',
     'Lê Thị Mai', '0901000006', 'thungan1@circlek.vn',
     'THU_NGAN', 'Nhân viên bán hàng', 'FULL_TIME', 'MORNING',
     0, 14000000, '0123456794', 'VPBank', '2021-02-15', TRUE),

    ('b2c3d4e5-0001-0000-0000-000000000007',
     'a1b2c3d4-0001-0000-0000-000000000101', 'NV-0007',
     'thungan_bv_2', '$2a$10$DEMO_BCRYPT_HASH_thungan2_change_in_prod',
     'Nguyễn Văn Hùng', '0901000007', 'thungan2@circlek.vn',
     'THU_NGAN', 'Nhân viên bán hàng', 'FULL_TIME', 'AFTERNOON',
     0, 14000000, '0123456795', 'VPBank', '2021-05-10', TRUE),

    ('b2c3d4e5-0001-0000-0000-000000000008',
     'a1b2c3d4-0001-0000-0000-000000000101', 'NV-0008',
     'thungan_bv_3', '$2a$10$DEMO_BCRYPT_HASH_thungan3_change_in_prod',
     'Phạm Văn Toàn', '0901000008', 'thungan3@circlek.vn',
     'THU_NGAN', 'Nhân viên bán hàng ca đêm', 'PART_TIME', 'NIGHT',
     28000, 0, '0123456796', 'Techcombank', '2022-08-01', TRUE),

    -- Thu ngân của chi nhánh khác
    ('b2c3d4e5-0001-0000-0000-000000000009',
     'a1b2c3d4-0001-0000-0000-000000000201', 'NV-0009',
     'thungan_hk_1', '$2a$10$DEMO_BCRYPT_HASH_thungan4_change_in_prod',
     'Đặng Thị Linh', '0901000009', 'thungan.hk@circlek.vn',
     'THU_NGAN', 'Nhân viên bán hàng', 'FULL_TIME', 'MORNING',
     0, 13500000, '0123456797', 'MB Bank', '2021-10-05', TRUE)
ON CONFLICT (ma_nhan_vien) DO NOTHING;

-- =============================================================================
-- Bật FK ngược từ `chi_nhanh.id_quan_ly` → `nhan_vien.id`
-- Chạy SAU khi cả 2 bảng đã có dữ liệu.
-- =============================================================================
ALTER TABLE chi_nhanh
    DROP CONSTRAINT IF EXISTS fk_chi_nhanh_quan_ly;

ALTER TABLE chi_nhanh
    ADD CONSTRAINT fk_chi_nhanh_quan_ly
    FOREIGN KEY (id_quan_ly) REFERENCES nhan_vien(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- Cập nhật `id_quan_ly` cho các chi nhánh có quản lý
UPDATE chi_nhanh SET id_quan_ly = 'b2c3d4e5-0001-0000-0000-000000000003'
WHERE ma_chi_nhanh = 'CK-DC01';

UPDATE chi_nhanh SET id_quan_ly = 'b2c3d4e5-0001-0000-0000-000000000004'
WHERE ma_chi_nhanh = 'CK-0101';

UPDATE chi_nhanh SET id_quan_ly = 'b2c3d4e5-0001-0000-0000-000000000005'
WHERE ma_chi_nhanh = 'CK-0102';

COMMENT ON TABLE nhan_vien IS
    'Tài khoản đăng nhập, phân quyền, thông tin lương & ngân hàng. '
    'Quy tắc cứng: 4 vai trò vận hành (THU_KHO/QUAN_LY/THU_NGAN) BẮT BUỘC có '
    'id_chi_nhanh, 2 vai trò trụ sở (ADMIN/KE_TOAN) cho phép NULL.';

COMMENT ON COLUMN nhan_vien.mat_khau IS
    'BẮT BUỘC lưu dạng HASH (BCrypt/Argon2id). Tuyệt đối không lưu plain text. '
    'Các giá trị seed trong script này chỉ là placeholder, phải được thay thế '
    'bằng hash thật khi INSERT qua backend service.';

COMMENT ON COLUMN nhan_vien.vai_tro IS
    'Quyết định phân quyền toàn hệ thống. Map: ADMIN/KE_TOAN (trụ sở, NULL '
    'chi nhánh), THU_KHO (Kho Tổng), QUAN_LY/THU_NGAN (cửa hàng bán lẻ).';

COMMENT ON COLUMN nhan_vien.luong_theo_gio IS
    'Lương theo giờ áp dụng cho PART_TIME, hoặc dùng để tính lương giờ cho '
    'FULL_TIME (luong_cung chia cho số giờ chuẩn/tháng).';

COMMENT ON COLUMN nhan_vien.luong_cung IS
    'Lương cứng theo tháng cho FULL_TIME. PART_TIME đặt = 0, dùng '
    'luong_theo_gio × số giờ thực tế để tính lương.';
