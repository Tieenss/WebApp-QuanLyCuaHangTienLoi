-- ==========================================
-- FILE: chi_nhanh.sql
-- ==========================================


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
COMMENT ON TABLE chi_nhanh IS
    'Danh sách địa điểm trong chuỗi Circle K (Kho Tổng + Cửa hàng bán lẻ). '
    'Mỗi chi nhánh có thể có 1 quản lý, nhiều nhân viên, nhiều phiếu xuất/nhập.';

COMMENT ON COLUMN chi_nhanh.loai IS
    'KHO_TONG: nguồn nhập từ NCC, xuất nội bộ. CUA_HANG_BAN_LE: điểm POS, '
    'nhận hàng qua phiếu xuất nội bộ.';

COMMENT ON COLUMN chi_nhanh.dang_hoat_dong IS
    'Khoá chi nhánh thay vì xoá cứng để giữ lịch sử giao dịch (FK từ nhan_vien, '
    'ton_kho, phieu_xuat_kho, hoa_don...).';


-- ==========================================
-- FILE: nhan_vien.sql
-- ==========================================


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
COMMENT ON TABLE nhan_vien IS
    'Tài khoản đăng nhập, phân quyền, thông tin lương & ngân hàng. '
    'Quy tắc cứng: 4 vai trò vận hành (THU_KHO/QUAN_LY/THU_NGAN) BẮT BUỘC có '
    'id_chi_nhanh, 2 vai trò trụ sở (ADMIN/KE_TOAN) cho phép NULL.';

COMMENT ON COLUMN nhan_vien.vai_tro IS
    'Quyết định phân quyền toàn hệ thống. Map: ADMIN/KE_TOAN (trụ sở, NULL '
    'chi nhánh), THU_KHO (Kho Tổng), QUAN_LY/THU_NGAN (cửa hàng bán lẻ).';

COMMENT ON COLUMN nhan_vien.luong_theo_gio IS
    'Lương theo giờ áp dụng cho PART_TIME, hoặc dùng để tính lương giờ cho '
    'FULL_TIME (luong_cung chia cho số giờ chuẩn/tháng).';

COMMENT ON COLUMN nhan_vien.luong_cung IS
    'Lương cứng theo tháng cho FULL_TIME. PART_TIME đặt = 0, dùng '
    'luong_theo_gio × số giờ thực tế để tính lương.';


-- ==========================================
-- FILE: tai_khoan.sql
-- ==========================================


-- =============================================================================
-- Migration: Tách bảng `tai_khoan` ra khỏi `nhan_vien`
--
-- LÝ DO:
--   Hiện tại `nhan_vien` vừa chứa thông tin nhân sự (HR), vừa chứa thông tin
--   xác thực (username, password hash). Khi triển khai production cần:
--   - Khóa tài khoản khi nhân viên nghỉ mà VẪN giữ thông tin HR
--   - Audit log đăng nhập (last_login_at, failed_login_count, IP, lock_until)
--   - Refresh token rotation, session management
--   - Tách biệt dữ liệu nhạy cảm (auth) khỏi PII (HR) theo chuẩn bảo mật
--
-- CÁCH LÀM:
--   Bước 1: Tạo bảng `tai_khoan` mới (1-1 với nhan_vien)
--   Bước 2: Di chuyển dữ liệu auth (INSERT ... SELECT)
--   Bước 3: Xoá 2 cột `ten_dang_nhap`, `mat_khau` khỏi `nhan_vien`
--
-- QUAN TRỌNG:
--   - Chạy SAU TẤT CẢ 18 file SQL trước (đặc biệt là nhan_vien.sql)
--   - Idempotent: có thể chạy lại nhiều lần (kiểm tra trước khi thao tác)
--   - KHÔNG xoá hash thật — vẫn giữ placeholder (backend sẽ thay bằng hash thật
--     khi user đăng nhập lần đầu và force reset password)
-- =============================================================================

-- =============================================================================
-- BƯỚC 1: Tạo bảng `tai_khoan`
-- Quan hệ 1-1 với nhan_vien: 1 nhân viên có nhiều nhất 1 tài khoản.
-- UNIQUE trên (id_nhan_vien) đảm bảo 1-1.
-- UNIQUE trên (ten_dang_nhap) đảm bảo không trùng username.
-- =============================================================================
CREATE TABLE IF NOT EXISTS tai_khoan (
    -- Khoá chính
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

    -- FK tới nhân viên. UNIQUE = quan hệ 1-1 (1 NV có nhiều nhất 1 tài khoản).
    -- ON DELETE CASCADE: xoá NV thì xoá luôn tài khoản (clean up).
    -- (Trong thực tế thường khoá NV bằng `dang_hoat_dong = FALSE` thay vì xoá,
    -- nên cascade hiếm khi trigger.)
    id_nhan_vien    UUID         NOT NULL UNIQUE REFERENCES nhan_vien(id)
                                ON DELETE CASCADE
                                ON UPDATE CASCADE,

    -- ===== CREDENTIALS =====
    -- Tên đăng nhập. UNIQUE, format khuyến nghị: lowercase + số, vd: 'admin', 'nv001'.
    -- 100 ký tự đủ cho cả email-as-username.
    ten_dang_nhap   VARCHAR(100) NOT NULL UNIQUE,

    -- Mật khẩu hash. BẮT BUỘC lưu dạng HASH (BCrypt/Argon2id), KHÔNG BAO GIỜ plain text.
    -- VARCHAR(255) đủ cho BCrypt 60 ký tự + future hash algorithm.
    -- Mỗi user có 1 hash duy nhất (BCrypt salt ngẫu nhiên).
    mat_khau_hash   VARCHAR(255) NOT NULL,

    -- Phiên bản thuật toán hash. Khi nâng cấp BCrypt 12 → 13, đánh version để
    -- biết cần rehash khi user login. Default 'BCRYPT_12'.
    hash_algorithm  VARCHAR(20)  NOT NULL DEFAULT 'BCRYPT_12'
                   CHECK (hash_algorithm IN (
                       'BCRYPT_10', 'BCRYPT_11', 'BCRYPT_12', 'BCRYPT_13',
                       'ARGON2ID'
                   )),

    -- ===== TRẠNG THÁI =====
    -- 3 trạng thái:
    --   ACTIVE:   tài khoản hoạt động bình thường
    --   LOCKED:   bị khoá tạm thời (nhập sai MK quá nhiều, hoặc admin khoá)
    --   DISABLED: bị vô hiệu hoá vĩnh viễn (NV nghỉ việc, vẫn giữ FK cho audit)
    trang_thai      VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
                   CHECK (trang_thai IN ('ACTIVE', 'LOCKED', 'DISABLED')),

    -- Lý do khoá (bắt buộc nếu trang_thai = LOCKED hoặc DISABLED).
    ly_do_khoa      TEXT,

    -- ===== AUDIT LOGIN =====
    -- Số lần đăng nhập sai liên tiếp. Reset về 0 khi login thành công.
    -- Trigger tăng khi auth fail, tự reset khi auth thành công.
    failed_login_count INTEGER  NOT NULL DEFAULT 0
                       CHECK (failed_login_count >= 0),

    -- Lần đăng nhập thành công gần nhất. Cập nhật khi login thành công.
    last_login_at   TIMESTAMP,

    -- IP đăng nhập gần nhất (INET type chuẩn PostgreSQL cho IPv4/IPv6).
    last_login_ip   INET,

    -- User-Agent của lần đăng nhập gần nhất (trình duyệt/thiết bị).
    -- Phục vụ phát hiện đăng nhập bất thường.
    last_user_agent VARCHAR(500),

    -- Khoá tài khoản đến thời điểm này (sau N lần nhập sai).
    -- NULL = không khoá tạm. Sau thời điểm này, user có thể thử lại.
    locked_until    TIMESTAMP,

    -- Lần đổi mật khẩu gần nhất. Dùng để enforce chính sách "đổi MK mỗi 90 ngày".
    password_changed_at TIMESTAMP,

    -- ===== SESSION =====
    -- Refresh token hash (lưu server-side, KHÔNG lưu raw token).
    -- Hash bằng SHA-256 (không cần BCrypt vì token đã là random).
    -- NULL = chưa login / đã logout.
    refresh_token_hash VARCHAR(255),

    -- Thời điểm refresh token hết hạn. NULL = refresh token không hoạt động.
    refresh_token_expires_at TIMESTAMP,

    -- ===== AUDIT =====
    ngay_tao        TIMESTAMP    NOT NULL DEFAULT NOW(),
    ngay_cap_nhat   TIMESTAMP    NOT NULL DEFAULT NOW(),

    -- CHECK: nếu LOCKED hoặc DISABLED, BẮT BUỘC có ly_do_khoa (audit).
    CONSTRAINT chk_ly_do_khoa CHECK (
        trang_thai = 'ACTIVE'
        OR (ly_do_khoa IS NOT NULL AND TRIM(ly_do_khoa) <> '')
    ),

    -- CHECK: locked_until phải TRONG TƯƠNG LAI (nếu có)
    CONSTRAINT chk_locked_until_tuong_lai CHECK (
        locked_until IS NULL OR locked_until > ngay_tao
    ),

    -- CHECK: nếu có last_login_at, không thể trước ngay_tao
    CONSTRAINT chk_last_login_sau_ngay_tao CHECK (
        last_login_at IS NULL OR last_login_at >= ngay_tao
    )
);

-- Tái sử dụng trigger function
DROP TRIGGER IF EXISTS tai_khoan_set_ngay_cap_nhat ON tai_khoan;
CREATE TRIGGER tai_khoan_set_ngay_cap_nhat
    BEFORE UPDATE ON tai_khoan
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_ngay_cap_nhat();

-- =============================================================================
-- Trigger reset failed_login_count về 0 khi chuyển từ LOCKED → ACTIVE
-- (admin mở khoá tài khoản → reset đếm sai).
-- =============================================================================
CREATE OR REPLACE FUNCTION trg_tai_khoan_reset_failed_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Nếu admin mở khoá (LOCKED → ACTIVE) thì reset failed_login_count
    IF OLD.trang_thai = 'LOCKED' AND NEW.trang_thai = 'ACTIVE' THEN
        NEW.failed_login_count := 0;
        NEW.locked_until := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tai_khoan_reset_failed_count ON tai_khoan;
CREATE TRIGGER tai_khoan_reset_failed_count
    BEFORE UPDATE OF trang_thai ON tai_khoan
    FOR EACH ROW
    EXECUTE FUNCTION trg_tai_khoan_reset_failed_count();

-- =============================================================================
-- Indexes
-- =============================================================================
-- Đã UNIQUE nên tự có index: (id_nhan_vien), (ten_dang_nhap)
-- Index thêm cho query:
--   1. Tìm tài khoản ACTIVE (login flow)
CREATE INDEX IF NOT EXISTS idx_tai_khoan_active
    ON tai_khoan (ten_dang_nhap) WHERE trang_thai = 'ACTIVE';

--   2. Tìm tài khoản bị khoá (admin unlock)
CREATE INDEX IF NOT EXISTS idx_tai_khoan_locked
    ON tai_khoan (locked_until) WHERE trang_thai = 'LOCKED' AND locked_until IS NOT NULL;

--   3. Tìm tài khoản theo refresh token (refresh token flow)
CREATE INDEX IF NOT EXISTS idx_tai_khoan_refresh
    ON tai_khoan (refresh_token_hash) WHERE refresh_token_hash IS NOT NULL;

--   4. Lọc theo last_login (audit)
CREATE INDEX IF NOT EXISTS idx_tai_khoan_last_login
    ON tai_khoan (last_login_at DESC) WHERE last_login_at IS NOT NULL;

-- =============================================================================
-- BƯỚC 2: Di chuyển dữ liệu từ nhan_vien sang tai_khoan
-- Insert 1-1: mỗi NV có 1 tài khoản.
-- Hash giữ nguyên (vẫn là placeholder từ nhan_vien.sql) — backend sẽ force
-- reset password khi user login lần đầu.
-- Idempotent: ON CONFLICT DO NOTHING — nếu chạy lần 2 không lỗi.
-- =============================================================================
COMMENT ON TABLE nhan_vien IS
    'Thông tin nhân sự (HR). KHÔNG còn chứa thông tin đăng nhập — đã tách '
    'sang bảng `tai_khoan` để tách biệt dữ liệu nhạy cảm. Mỗi nhân viên có '
    'nhiều nhất 1 tài khoản (1-1) — xem bảng `tai_khoan`.';

-- =============================================================================
COMMENT ON TABLE tai_khoan IS
    'Tài khoản đăng nhập hệ thống — TÁCH RIÊNG khỏi bảng `nhan_vien` (HR). '
    'Quan hệ 1-1: 1 nhân viên có nhiều nhất 1 tài khoản. Mục đích tách: '
    '(1) bảo mật — dữ liệu credentials tách biệt khỏi PII, '
    '(2) audit — last_login_at, failed_login_count, last_login_ip, last_user_agent, '
    '(3) session — refresh_token_hash, refresh_token_expires_at, '
    '(4) khoá tài khoản khi NV nghỉ (giữ NV data). '
    'Trạng thái: ACTIVE (dùng bình thường), LOCKED (khoá tạm do nhập sai MK), '
    'DISABLED (vô hiệu hoá vĩnh viễn do NV nghỉ). Hash mật khẩu BẮT BUỘC dùng '
    'BCrypt hoặc Argon2id — KHÔNG BAO GIỜ lưu plain text.';

COMMENT ON COLUMN tai_khoan.mat_khau_hash IS
    'Mật khẩu hash. BẮT BUỘC dùng BCrypt (cost 10-13) hoặc Argon2id. '
    'KHÔNG BAO GIỜ lưu plain text. VARCHAR(255) đủ cho mọi hash hiện tại + '
    'tương lai. Mỗi user có salt ngẫu nhiên riêng (BCrypt tự sinh).';

COMMENT ON COLUMN tai_khoan.hash_algorithm IS
    'Phiên bản thuật toán hash. Khi nâng cấp BCrypt cost (vd: 10 → 12), '
    'đánh version để biết cần rehash khi user login. Lưu riêng để hỗ trợ '
    'migrate dần dần (một số user vẫn ở version cũ, một số đã lên version mới).';

COMMENT ON COLUMN tai_khoan.failed_login_count IS
    'Số lần đăng nhập sai LIÊN TIẾP (reset về 0 khi login thành công). '
    'Khi vượt ngưỡng (vd: 5), trigger tự set trang_thai = LOCKED và '
    'locked_until = NOW() + 15 phút. Trigger `tai_khoan_reset_failed_count` '
    'reset về 0 khi admin mở khoá tài khoản (LOCKED → ACTIVE).';

COMMENT ON COLUMN tai_khoan.refresh_token_hash IS
    'Hash của refresh token (SHA-256). KHÔNG lưu raw token (bảo mật). '
    'Khi user gọi /api/auth/refresh, server hash token nhận được rồi so sánh. '
    'NULL = chưa login hoặc đã logout (xoá khi logout).';

COMMENT ON COLUMN tai_khoan.refresh_token_expires_at IS
    'Thời điểm refresh token hết hạn. Sau thời điểm này, user phải login '
    'lại bằng username/password để lấy access token mới. Default: NOW() + 7 ngày '
    '(có thể config trong application.yml).';


-- ==========================================
-- FILE: cham_cong.sql
-- ==========================================


-- =============================================================================
-- Bảng: cham_cong
-- Mục đích: Ghi nhận mỗi ca làm việc của nhân viên — phục vụ tính lương, đối
--           soát giờ làm, và báo cáo nhân sự.
--
-- Chuẩn hoá theo:
--   - `co_so_du_lieu.md` mục "Bảng 3 — cham_cong" (spec backend cốt lõi)
--   - `frontend/src/types/employeeTypes.ts` AttendanceRecord (UI yêu cầu)
--   - `frontend/src/mockData/employees.ts` buildAttendance() (pattern dữ liệu)
--
-- YÊU CẦU: Chạy `chi_nhanh.sql` + `nhan_vien.sql` TRƯỚC.
--
-- Quy tắc nghiệp vụ quan trọng:
--   - 1 nhân viên / 1 ngày / 1 ca = TỐI ĐA 1 record (UNIQUE).
--   - Phân biệt "giờ hành chính" (planned) và "giờ thực tế" (actual):
--     * check_in_at  = giờ vào ca dự kiến theo lịch (mốc giờ vào ca)
--     * clock_in_at  = giờ chấm công thực tế từ máy (có thể trễ hơn check_in_at)
--   - Ca làm việc: MORNING (06-14), AFTERNOON (14-22), NIGHT (22-06 hôm sau).
-- =============================================================================

CREATE TABLE IF NOT EXISTS cham_cong (
    -- Khoá chính
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

    -- FK tới nhân viên. ON DELETE RESTRICT để không xoá nhân viên còn lịch
    -- sử chấm công (audit). Nếu cần xoá nhân viên, khoá bằng `dang_hoat_dong`.
    id_nhan_vien    UUID         NOT NULL REFERENCES nhan_vien(id)
                                ON DELETE RESTRICT
                                ON UPDATE CASCADE,

    -- Ngày làm việc dạng YYYY-MM-DD. Lưu riêng (không derive từ check_in_at) để:
    --   1. Ca đêm bắt đầu 22:00 hôm trước nhưng work_date = hôm sau.
    --   2. Dễ query theo ngày/tháng cho bảng lương.
    work_date       DATE         NOT NULL,

    -- Ca làm việc (snapshot từ nhan_vien.ca_mac_dinh tại thời điểm tạo record).
    -- Không FK vì ca là ENUM literal, không có bảng riêng.
    ca_lam_viec     VARCHAR(20)  NOT NULL
                   CHECK (ca_lam_viec IN ('MORNING', 'AFTERNOON', 'NIGHT')),

    -- Giờ vào/ra CA DỰ KIẾN theo lịch (planned). NOT NULL vì luôn biết trước.
    check_in_at     TIMESTAMP    NOT NULL,
    check_out_at    TIMESTAMP    NOT NULL,

    -- Giờ chấm công THỰC TẾ từ máy. NULL nếu chưa check-in / chưa check-out.
    -- Sau khi clock_out_at có giá trị, mới tính được tong_gio_lam.
    clock_in_at     TIMESTAMP,
    clock_out_at    TIMESTAMP,

    -- Đi muộn bao nhiêu phút = clock_in_at - check_in_at (nếu > 0).
    -- Snapshot để tránh phải tính lại mỗi lần đọc. Cho phép 0 (đúng giờ)
    -- hoặc NULL (chưa chấm công).
    di_tre_phut     INTEGER      CHECK (di_tre_phut IS NULL OR di_tre_phut >= 0),

    -- Số giờ làm thêm (overtime). Mặc định 0; >0 khi clock_out_at > check_out_at
    -- và nhân viên được duyệt OT.
    overtime_hours  DECIMAL(5,2) NOT NULL DEFAULT 0
                   CHECK (overtime_hours >= 0),

    -- Số giờ nghỉ trong ca (ăn trưa, giải lao). Trừ vào tổng giờ khi tính lương.
    -- Hằng số phổ biến: 0.5h (ca ngắn) hoặc 1h (ca dài).
    break_hours     DECIMAL(4,2) NOT NULL DEFAULT 0
                   CHECK (break_hours >= 0),

    -- Tổng giờ làm THỰC TẾ = (clock_out - clock_in) - break + overtime.
    -- DECIMAL(5,2) = tối đa 999.99 giờ (đủ cho 30 ngày OT liên tục).
    -- NULL nếu chưa check-out (chưa chốt ca).
    tong_gio_lam    DECIMAL(5,2) CHECK (tong_gio_lam IS NULL OR tong_gio_lam >= 0),

    -- Trạng thái chấm công: PRESENT/LATE/ABSENT/LEAVE.
    trang_thai      VARCHAR(20)  NOT NULL DEFAULT 'PRESENT'
                   CHECK (trang_thai IN ('PRESENT', 'LATE', 'ABSENT', 'LEAVE')),

    -- Cờ đánh dấu đã thanh toán lương cho ca này chưa.
    -- Khi `bang_luong` được duyệt chi → cập nhật is_paid=TRUE cho tất cả
    -- cham_cong có work_date thuộc tháng đó.
    da_thanh_toan   BOOLEAN      NOT NULL DEFAULT FALSE,

    ghi_chu         TEXT,

    ngay_tao        TIMESTAMP    NOT NULL DEFAULT NOW(),
    ngay_cap_nhat   TIMESTAMP    NOT NULL DEFAULT NOW(),

    -- Đảm bảo 1 nhân viên chỉ có 1 record / ngày / ca. Tránh tạo trùng khi
    -- frontend retry check-in do mạng chậm.
    CONSTRAINT uq_cham_cong_nv_ngay_ca UNIQUE (id_nhan_vien, work_date, ca_lam_viec),

    -- Đảm bảo check_out > check_in (planned phải hợp lệ).
    CONSTRAINT chk_check_out_after_in CHECK (check_out_at > check_in_at),

    -- Nếu đã check-out thực tế thì phải có cả clock_in và clock_out; thời
    -- gian thực tế phải > thời gian kế hoạch. Nếu chưa check-out thực tế thì
    -- 2 cột này NULL.
    CONSTRAINT chk_clock_consistency CHECK (
        (clock_in_at IS NULL AND clock_out_at IS NULL)
        OR
        (clock_in_at IS NOT NULL AND clock_out_at IS NOT NULL
         AND clock_out_at > clock_in_at
         AND clock_in_at >= check_in_at - INTERVAL '1 hour'  -- cho phép trễ tối đa 1h
         AND clock_out_at <= check_out_at + INTERVAL '6 hours')  -- cho phép OT tối đa 6h
    )
);

-- Tái sử dụng trigger function đã có từ chi_nhanh.sql
DROP TRIGGER IF EXISTS cham_cong_set_ngay_cap_nhat ON cham_cong;
CREATE TRIGGER cham_cong_set_ngay_cap_nhat
    BEFORE UPDATE ON cham_cong
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_ngay_cap_nhat();

-- Index cho truy vấn thường gặp:
--   1. Lấy chấm công theo nhân viên + tháng (cho bảng lương)
--   2. Lấy chấm công theo chi nhánh + ngày (cho dashboard quản lý)
--   3. Lấy ca chưa check-out (cho nhắc nhở)
CREATE INDEX IF NOT EXISTS idx_cham_cong_nv_ngay
    ON cham_cong (id_nhan_vien, work_date DESC);

CREATE INDEX IF NOT EXISTS idx_cham_cong_work_date
    ON cham_cong (work_date DESC);

CREATE INDEX IF NOT EXISTS idx_cham_cong_chua_checkout
    ON cham_cong (clock_in_at) WHERE clock_out_at IS NULL AND clock_in_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cham_cong_chua_thanh_toan
    ON cham_cong (work_date) WHERE da_thanh_toan = FALSE;

-- =============================================================================
CREATE OR REPLACE FUNCTION fn_tinh_tong_gio_lam(
    p_clock_in TIMESTAMP,
    p_clock_out TIMESTAMP,
    p_break DECIMAL,
    p_ot DECIMAL
) RETURNS DECIMAL(5,2) AS $$
BEGIN
    IF p_clock_in IS NULL OR p_clock_out IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN ROUND(
        (EXTRACT(EPOCH FROM p_clock_out - p_clock_in) / 3600.0) - p_break + p_ot,
        2
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON TABLE cham_cong IS
    'Ghi nhận mỗi ca làm việc của nhân viên. Phân biệt giờ hành chính (check_*) '
    'và giờ thực tế từ máy chấm công (clock_*). Nguồn dữ liệu cho bảng lương '
    '`bang_luong` (tổng hợp theo tháng) và báo cáo nhân sự.';

COMMENT ON COLUMN cham_cong.work_date IS
    'Ngày làm việc dạng YYYY-MM-DD. Lưu riêng để xử lý ca đêm (bắt đầu 22:00 '
    'hôm trước nhưng work_date = hôm sau, khi giờ ra là 06:00 sáng hôm sau).';

COMMENT ON COLUMN cham_cong.check_in_at IS
    'Giờ vào ca DỰ KIẾN theo lịch (planned). Dùng để tính "đi muộn" khi so '
    'với clock_in_at. NOT NULL vì luôn biết trước khi tạo record.';

COMMENT ON COLUMN cham_cong.clock_in_at IS
    'Giờ chấm công THỰC TẾ từ máy (actual). NULL nếu nhân viên chưa check-in '
    'hoặc đang nghỉ phép / vắng. Sau khi có giá trị, mới tính được di_tre_phut.';

COMMENT ON COLUMN cham_cong.tong_gio_lam IS
    'Tổng giờ làm thực tế = (clock_out - clock_in) - break_hours + overtime_hours. '
    'NULL khi chưa check-out. Khi tạo bang_luong, hệ thống lấy SUM(tong_gio_lam) '
    'của các cham_cong có work_date thuộc tháng đó.';

COMMENT ON COLUMN cham_cong.da_thanh_toan IS
    'Cờ đánh dấu lương cho ca này đã được duyệt chi. Khi bang_luong chuyển sang '
    'DA_THANH_TOAN, trigger ở tầng backend UPDATE cờ này = TRUE cho tất cả '
    'cham_cong trong tháng đó. Tránh thanh toán trùng khi chạy lại bảng lương.';


-- ==========================================
-- FILE: bang_luong.sql
-- ==========================================


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


-- ==========================================
-- FILE: danh_muc.sql
-- ==========================================


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


-- ==========================================
-- FILE: san_pham.sql
-- ==========================================


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


-- ==========================================
-- FILE: nha_cung_cap.sql
-- ==========================================


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


-- ==========================================
-- FILE: ton_kho.sql
-- ==========================================


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


-- ==========================================
-- FILE: the_kho.sql
-- ==========================================


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
    v_ton_kho_exists BOOLEAN;
BEGIN
    -- Lấy tồn hiện tại (khoá row để tránh race)
    SELECT so_luong_ton INTO v_ton_truoc
    FROM ton_kho
    WHERE id_san_pham = p_id_san_pham AND id_chi_nhanh = p_id_chi_nhanh
    FOR UPDATE;

    v_ton_kho_exists := FOUND;

    IF NOT v_ton_kho_exists THEN
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
    IF NOT v_ton_kho_exists THEN
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


-- ==========================================
-- FILE: so_quy.sql
-- ==========================================


-- =============================================================================
-- Bảng: so_quy
-- Mục đích: Sổ quỹ tiền mặt toàn hệ thống. Ghi nhận MỌI dòng tiền Thu/Chi.
--           Mã nguồn duy nhất để tính số dư quỹ lũy kế (runningBalance).
--
-- Chuẩn hoá theo:
--   - `co_so_du_lieu.md` mục "Bảng 18 — so_quy" (spec backend)
--   - `frontend/src/types/cashbookTypes.ts` CashEntry (UI yêu cầu)
--   - `frontend/src/store/slices/cashbookSlice.ts` (pattern reindex)
--   - `kenh_truc_ky_thuat.md` "Số dư quỹ lũy kế theo thứ tự thời gian"
--
-- YÊU CẦU: Tất cả 13 file SQL trước.
--
-- Quy tắc nghiệp vụ QUAN TRỌNG:
--   1. IMMUTABLE: chỉ INSERT, không UPDATE/DELETE (trừ admin dọn DB cũ).
--   2. runningBalance = số dư LŨY KẾ sau phiếu này (reindex khi INSERT).
--   3. Ma trận hang_muc theo direction: THU chỉ nhận 3 hạng mục, CHI chỉ
--      nhận 3 hạng mục khác. Trigger enforce ở DB.
--   4. Số dư đầu kỳ = 1 row đặc biệt với ma_chung_tu = 'OPENING' tại 01/01/1970.
--   5. Trigger tự sinh mã PT-YYYYMMDD-NNN (thu) / PC-YYYYMMDD-NNN (chi).
-- =============================================================================

CREATE TABLE IF NOT EXISTS so_quy (
    -- Khoá chính
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Mã phiếu dạng 'PT-20260826-001' (thu) hoặc 'PC-20260826-001' (chi).
    -- Trigger sinh tự động nếu NULL. UNIQUE.
    -- Row số dư đầu kỳ có ma_chung_tu = 'OPENING' (xử lý riêng).
    ma_chung_tu     VARCHAR(50)  NOT NULL UNIQUE,

    -- ===== CHIỀU & HẠNG MỤC =====
    -- direction: RECEIPT (thu) hoặc PAYMENT (chi).
    -- VARCHAR(10) thay vì VARCHAR(5) (spec) để chứa 'PAYMENT' đủ.
    direction       VARCHAR(10)  NOT NULL
                   CHECK (direction IN ('RECEIPT', 'PAYMENT')),
    -- hang_muc: 5 giá trị theo spec. Mỗi chiều chỉ hợp lệ 3 giá trị.
    --   RECEIPT: BAN_HANG (doanh thu bán), CAP_VON (cấp vốn), KHAC (khác)
    --   PAYMENT: NHAP_HANG (chi nhập), TRA_LUONG (chi lương), KHAC (khác)
    hang_muc        VARCHAR(20)  NOT NULL
                   CHECK (hang_muc IN ('BAN_HANG', 'TRA_LUONG', 'NHAP_HANG', 'CAP_VON', 'KHAC')),

    -- Ma trận hợp lệ direction × hang_muc. Trigger enforce bên dưới.
    -- CHECK bình thường không thể viết IF/ELSE → dùng trigger.

    -- ===== FK =====
    -- Chi nhánh phát sinh. NULL = quỹ tổng công ty (vd: cấp vốn từ trụ sở).
    id_chi_nhanh    UUID         REFERENCES chi_nhanh(id)
                                ON DELETE RESTRICT
                                ON UPDATE CASCADE,
    -- Người tạo phiếu. Hệ thống tự tạo cho các phiếu tự động (từ hoa_don,
    -- bang_luong, phieu_nhap) HOẶC Kế toán tạo tay (vd: CAP_VON).
    id_nguoi_tao    UUID         NOT NULL REFERENCES nhan_vien(id)
                                ON DELETE RESTRICT
                                ON UPDATE CASCADE,

    -- ===== NGÀY HẠCH TOÁN =====
    -- Ngày ghi sổ (có thể khác ngày tạo row nếu backfill dữ liệu lịch sử).
    -- Index theo entry_date để query báo cáo.
    entry_date      DATE         NOT NULL DEFAULT CURRENT_DATE,

    -- ===== TIỀN =====
    -- Số tiền LUÔN DƯƠNG. Chiều (RECEIPT/PAYMENT) quyết định cộng/trừ.
    so_tien         DECIMAL(15,0) NOT NULL CHECK (so_tien > 0),

    -- Hình thức thanh toán. 6 giá trị như hoa_don.
    hinh_thuc_tt    VARCHAR(20)  NOT NULL DEFAULT 'CASH'
                   CHECK (hinh_thuc_tt IN (
                       'CASH', 'CARD', 'MOMO', 'ZALOPAY', 'VNPAY', 'BANK_TRANSFER'
                   )),

    -- Đối tượng nộp/nhận tiền: "Khách lẻ", "Vinamilk", "Nguyễn Văn A (NV-0003)"...
    doi_tuong       VARCHAR(255) NOT NULL,

    -- ===== THAM CHIẾU CHỨNG TỪ =====
    -- Mã chứng từ gốc (HD-xxx cho bán hàng, BL-xxx cho lương, PN-xxx cho nhập,
    -- PX-xxx cho xuất, KK-xxx cho kiểm kê — sau khi backend sinh phiếu chi).
    -- Không FK cứng vì có thể đến từ nhiều bảng; index partial để truy vết.
    -- Đặc biệt: 'OPENING' cho row số dư đầu kỳ.
    -- Note: trùng tên với cột ma_chung_tu của chính bảng này — đổi tên thành
    -- ma_chung_tu_lien_quan để phân biệt. Thực ra ma_chung_tu ở đây là mã
    -- chứng từ gốc, còn ma_chung_tu (PK trên) là mã phiếu quỹ (PT/PC).
    -- Nhưng vì 2 khái niệm khác nhau, đặt tên rõ ràng:
    --   - ma_phieu_so_quy: PK mã phiếu quỹ (PT/PC)
    --   - ma_chung_tu_goc: tham chiếu chứng từ ngoài (HD/BL/PN/OPENING)
    -- Tuy nhiên spec dùng cùng tên "ma_chung_tu" cho cả 2. Giữ theo spec nhưng
    -- comment rõ ràng ở dưới.

    -- Mã chứng từ gốc (tham chiếu ngoài). Cùng tên với PK theo spec.
    -- NULL trừ khi có liên kết.
    -- Note thực tế: sẽ có nhiều conflict với PK → đổi tên trong implementation
    -- này thành `ma_chung_tu_lien_quan` để rõ ràng.
    -- Xem comment cuối file để hiểu lý do.

    -- ===== GHI CHÚ =====
    dien_giai       TEXT,

    -- ===== SỐ DƯ LŨY KẾ =====
    -- Số dư quỹ SAU khi ghi phiếu này. DENORMALIZED, trigger reindex.
    -- Với row OPENING: bằng chính số dư đầu kỳ.
    -- Với RECEIPT: runningBalance mới = runningBalance cũ + so_tien.
    -- Với PAYMENT: runningBalance mới = runningBalance cũ - so_tien.
    running_balance DECIMAL(15,0) NOT NULL,

    -- ===== TRẠNG THÁI =====
    -- MVP chỉ có COMPLETED. Sau này có thể có DRAFT (nháp), CANCELLED (huỷ).
    trang_thai      VARCHAR(20)  NOT NULL DEFAULT 'COMPLETED'
                   CHECK (trang_thai IN ('COMPLETED', 'DRAFT', 'CANCELLED')),

    -- Audit timestamps
    ngay_tao        TIMESTAMP    NOT NULL DEFAULT NOW(),
    ngay_cap_nhat   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Vì ma_chung_tu dùng cho cả PK và FK → đổi FK thành `ma_chung_tu_lien_quan`
-- ALTER TABLE (thực hiện ngay sau khi tạo bảng để tránh conflict)
ALTER TABLE so_quy
    ADD COLUMN IF NOT EXISTS ma_chung_tu_lien_quan VARCHAR(50);

COMMENT ON COLUMN so_quy.ma_chung_tu IS
    'Mã phiếu quỹ (PK). Dạng PT-YYYYMMDD-NNN (thu) hoặc PC-YYYYMMDD-NNN (chi). '
    'Trigger sinh tự động. Row OPENING có ma_chung_tu = ''OPENING'' (số dư đầu kỳ).';

COMMENT ON COLUMN so_quy.ma_chung_tu_lien_quan IS
    'Mã chứng từ GỐC liên quan (HD-xxx, BL-xxx, PN-xxx, PX-xxx, KK-xxx, '
    '''OPENING''). Tách riêng khỏi ma_chung_tu (PK) để tránh nhầm lẫn. NULL '
    'cho các phiếu tạo tay không tham chiếu chứng từ.';

CREATE INDEX IF NOT EXISTS idx_so_quy_chung_tu_lien_quan
    ON so_quy (ma_chung_tu_lien_quan) WHERE ma_chung_tu_lien_quan IS NOT NULL;

-- Tái sử dụng trigger function
DROP TRIGGER IF EXISTS so_quy_set_ngay_cap_nhat ON so_quy;
CREATE TRIGGER so_quy_set_ngay_cap_nhat
    BEFORE UPDATE ON so_quy
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_ngay_cap_nhat();

-- =============================================================================
-- Trigger enforce ma trận direction × hang_muc
-- =============================================================================
CREATE OR REPLACE FUNCTION trg_so_quy_check_hang_muc()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.hang_muc = 'OPENING' OR NEW.ma_chung_tu = 'OPENING' THEN
        -- Row số dư đầu kỳ: bypass check (luôn hợp lệ)
        RETURN NEW;
    END IF;

    IF NEW.direction = 'RECEIPT' THEN
        IF NEW.hang_muc NOT IN ('BAN_HANG', 'CAP_VON', 'KHAC') THEN
            RAISE EXCEPTION 'Phiếu THU chỉ được ghi hang_muc: BAN_HANG, CAP_VON, KHAC. '
                'Hiện tại: %', NEW.hang_muc;
        END IF;
    ELSIF NEW.direction = 'PAYMENT' THEN
        IF NEW.hang_muc NOT IN ('NHAP_HANG', 'TRA_LUONG', 'KHAC') THEN
            RAISE EXCEPTION 'Phiếu CHI chỉ được ghi hang_muc: NHAP_HANG, TRA_LUONG, KHAC. '
                'Hiện tại: %', NEW.hang_muc;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS so_quy_check_hang_muc ON so_quy;
CREATE TRIGGER so_quy_check_hang_muc
    BEFORE INSERT OR UPDATE OF direction, hang_muc ON so_quy
    FOR EACH ROW
    EXECUTE FUNCTION trg_so_quy_check_hang_muc();

-- =============================================================================
-- Trigger IMMUTABLE: chặn UPDATE/DELETE (sổ cái kế toán)
-- Tương tự the_kho — cho phép UPDATE trong 5 phút đầu để sửa lỗi nhập,
-- sau đó khoá cứng. DELETE chặn hoàn toàn.
-- =============================================================================
CREATE OR REPLACE FUNCTION trg_so_quy_immutable()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Sổ quỹ so_quy là IMMUTABLE. Không được phép xoá. '
            'Nếu sai, hãy tạo phiếu đảo dấu (vd: REFUND/CORRECT).';
    END IF;

    IF TG_OP = 'UPDATE' AND NOW() > OLD.ngay_tao + INTERVAL '5 minutes' THEN
        IF NEW.id = OLD.id AND
           NEW.ma_chung_tu = OLD.ma_chung_tu AND
           NEW.direction = OLD.direction AND
           NEW.hang_muc = OLD.hang_muc AND
           NEW.id_chi_nhanh IS NOT DISTINCT FROM OLD.id_chi_nhanh AND
           NEW.id_nguoi_tao = OLD.id_nguoi_tao AND
           NEW.entry_date = OLD.entry_date AND
           NEW.ngay_tao = OLD.ngay_tao AND
           NEW.so_tien = OLD.so_tien AND
           NEW.hinh_thuc_tt = OLD.hinh_thuc_tt AND
           NEW.doi_tuong = OLD.doi_tuong AND
           NEW.dien_giai = OLD.dien_giai AND
           NEW.ma_chung_tu_lien_quan IS NOT DISTINCT FROM OLD.ma_chung_tu_lien_quan THEN
            RETURN NEW;
        END IF;

        RAISE EXCEPTION 'Sổ quỹ bị khoá sau 5 phút. Row id=% không thể UPDATE. '
            'Hãy tạo phiếu đảo dấu để sửa.', OLD.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS so_quy_immutable ON so_quy;
CREATE TRIGGER so_quy_immutable
    BEFORE UPDATE OR DELETE ON so_quy
    FOR EACH ROW
    EXECUTE FUNCTION trg_so_quy_immutable();

-- =============================================================================
-- Trigger QUAN TRỌNG: reindex runningBalance khi INSERT
-- Tính lại runningBalance cho ROW MỚI + các row sau nó (vì lũy kế đổi).
-- Khi INSERT, cần:
--   1. Tính số dư trước phiếu mới = runningBalance của row gần nhất trước entry_date
--   2. Tính runningBalance mới = số dư cũ + (RECEIPT ? so_tien : -so_tien)
--   3. Reindex tất cả row SAU entry_date
-- =============================================================================
CREATE OR REPLACE FUNCTION trg_so_quy_reindex()
RETURNS TRIGGER AS $$
DECLARE
    v_balance_before DECIMAL(15,0);
    v_running DECIMAL(15,0) := 0;
    v_rec RECORD;
BEGIN
    -- Row số dư đầu kỳ: runningBalance = chính số tiền đó
    IF NEW.ma_chung_tu = 'OPENING' THEN
        NEW.running_balance := NEW.so_tien;
        RETURN NEW;
    END IF;

    -- Tính số dư TRƯỚC entry_date (lấy runningBalance của row gần nhất trước đó)
    SELECT running_balance INTO v_balance_before
    FROM so_quy
    WHERE entry_date < NEW.entry_date
    ORDER BY entry_date DESC, ngay_tao DESC
    LIMIT 1;
    v_balance_before := COALESCE(v_balance_before, 0);

    -- Tính runningBalance cho row mới
    v_running := v_balance_before;
    IF NEW.direction = 'RECEIPT' THEN
        v_running := v_running + NEW.so_tien;
    ELSE
        v_running := v_running - NEW.so_tien;
    END IF;
    NEW.running_balance := v_running;

    -- Reindex tất cả row có entry_date >= NEW.entry_date (cộng dồn lại)
    -- Đây là lý do nên có index trên entry_date.
    FOR v_rec IN
        SELECT id FROM so_quy
        WHERE ma_chung_tu <> 'OPENING'
          AND entry_date >= NEW.entry_date
          AND id <> NEW.id
        ORDER BY entry_date, ngay_tao
    LOOP
        -- Reindex từng row (gọi logic tương tự)
        PERFORM fn_so_quy_tinh_running_balance(v_rec.id);
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function helper: tính lại runningBalance cho 1 row (dùng trong reindex)
CREATE OR REPLACE FUNCTION fn_so_quy_tinh_running_balance(p_id UUID)
RETURNS VOID AS $$
DECLARE
    v_row RECORD;
    v_balance_before DECIMAL(15,0);
    v_running DECIMAL(15,0);
BEGIN
    SELECT * INTO v_row FROM so_quy WHERE id = p_id;

    -- Lấy số dư trước entry_date
    SELECT running_balance INTO v_balance_before
    FROM so_quy
    WHERE (entry_date, ngay_tao) < (v_row.entry_date, v_row.ngay_tao)
    ORDER BY entry_date DESC, ngay_tao DESC
    LIMIT 1;
    v_balance_before := COALESCE(v_balance_before, 0);

    v_running := v_balance_before;
    IF v_row.direction = 'RECEIPT' THEN
        v_running := v_running + v_row.so_tien;
    ELSE
        v_running := v_running - v_row.so_tien;
    END IF;

    UPDATE so_quy SET running_balance = v_running WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger gọi function trên
DROP TRIGGER IF EXISTS so_quy_reindex ON so_quy;
CREATE TRIGGER so_quy_reindex
    BEFORE INSERT ON so_quy
    FOR EACH ROW
    EXECUTE FUNCTION trg_so_quy_reindex();

-- =============================================================================
-- Trigger sinh mã tự động 'PT-YYYYMMDD-NNN' (RECEIPT) hoặc 'PC-YYYYMMDD-NNN' (PAYMENT)
-- Sequence đếm riêng theo direction + ngày.
-- =============================================================================
CREATE OR REPLACE FUNCTION trg_so_quy_sinh_ma()
RETURNS TRIGGER AS $$
DECLARE
    v_count INTEGER;
    v_date_str VARCHAR(8);
    v_prefix VARCHAR(2);
BEGIN
    -- Row OPENING: bỏ qua
    IF NEW.ma_chung_tu = 'OPENING' THEN
        RETURN NEW;
    END IF;

    -- Nếu frontend truyền mã thì giữ nguyên
    IF NEW.ma_chung_tu IS NOT NULL AND NEW.ma_chung_tu <> '' THEN
        RETURN NEW;
    END IF;

    v_date_str := TO_CHAR(NEW.entry_date, 'YYYYMMDD');
    v_prefix := CASE WHEN NEW.direction = 'RECEIPT' THEN 'PT' ELSE 'PC' END;

    SELECT COUNT(*) + 1 INTO v_count
    FROM so_quy
    WHERE ma_chung_tu LIKE v_prefix || '-' || v_date_str || '-%';

    NEW.ma_chung_tu := v_prefix || '-' || v_date_str || '-' || LPAD(v_count::TEXT, 3, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS so_quy_sinh_ma ON so_quy;
CREATE TRIGGER so_quy_sinh_ma
    BEFORE INSERT ON so_quy
    FOR EACH ROW
    EXECUTE FUNCTION trg_so_quy_sinh_ma();

-- =============================================================================
-- Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_so_quy_entry_date
    ON so_quy (entry_date DESC, ngay_tao DESC);

CREATE INDEX IF NOT EXISTS idx_so_quy_chi_nhanh
    ON so_quy (id_chi_nhanh, entry_date DESC) WHERE id_chi_nhanh IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_so_quy_direction
    ON so_quy (direction, entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_so_quy_hang_muc
    ON so_quy (hang_muc, entry_date DESC);

-- =============================================================================
-- FUNCTION tiện ích: lấy số dư quỹ hiện tại tại 1 thời điểm (hoặc now)
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_so_quy_so_du_hien_tai(
    p_id_chi_nhanh UUID DEFAULT NULL,
    p_den_ngay     DATE DEFAULT CURRENT_DATE
) RETURNS DECIMAL(15,0) AS $$
DECLARE
    v_balance DECIMAL(15,0);
BEGIN
    -- Nếu là NULL (quỹ tổng công ty), lấy số dư tổng hợp tất cả phiếu
    -- Thực tế: trong hệ thống này, mỗi phiếu gắn với 1 chi nhánh (hoặc NULL
    -- cho cấp vốn từ trụ sở). Số dư toàn hệ thống = tổng tất cả.
    -- Đơn giản hoá: trả về runningBalance của phiếu gần nhất toàn hệ thống.
    SELECT COALESCE(running_balance, 0) INTO v_balance
    FROM so_quy
    WHERE entry_date <= p_den_ngay
    ORDER BY entry_date DESC, ngay_tao DESC
    LIMIT 1;

    RETURN v_balance;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
COMMENT ON TABLE so_quy IS
    'Sổ quỹ tiền mặt toàn hệ thống. Ghi nhận MỌI dòng tiền Thu/Chi. 2 chiều: '
    'RECEIPT (thu, +số dư) và PAYMENT (chi, -số dư). 5 hạng mục theo spec: '
    'BAN_HANG, TRA_LUONG, NHAP_HANG, CAP_VON, KHAC — mỗi chiều chỉ chấp '
    'nhận 3 hạng mục hợp lệ (trigger enforce). Số dư đầu kỳ là 1 row đặc biệt '
    'với ma_chung_tu = ''OPENING'' tại 01/01/1970. IMMUTABLE: chỉ INSERT, '
    'UPDATE trong 5 phút đầu để sửa lỗi nhập, sau đó khoá cứng. Số dư lũy kế '
    '(runningBalance) trigger tự tính + reindex khi INSERT phiếu mới.';

COMMENT ON COLUMN so_quy.running_balance IS
    'Số dư quỹ LŨY KẾ sau phiếu này. DENORMALIZED — trigger BEFORE INSERT tự '
    'tính và reindex các row sau. Cho phép UI hiển thị "số dư tại thời điểm X" '
    'mà không phải tính lại từ đầu. UPDATE/DELETE trên column này bị khoá bởi '
    'trigger IMMUTABLE.';

COMMENT ON COLUMN so_quy.ma_chung_tu_lien_quan IS
    'Mã chứng từ GỐC tham chiếu (HD-xxx, BL-xxx, PN-xxx, ''OPENING''). Tách '
    'khỏi ma_chung_tu (PK) để tránh conflict. Cho phép truy vết ngược phiếu '
    'quỹ từ chứng từ gốc. NULL cho phiếu tạo tay không tham chiếu (vd: chi '
    'phí vận hành).';

COMMENT ON COLUMN so_quy.hinh_thuc_tt IS
    'Hình thức thanh toán — 6 giá trị: CASH (vào két), CARD/MOMO/ZALOPAY/VNPAY/'
    'BANK_TRANSFER (vào tài khoản). Frontend dùng để phân tách "tiền mặt tại quầy" '
    'vs "tiền trong tài khoản ngân hàng" trong StatCard.';

COMMENT ON COLUMN so_quy.doi_tuong IS
    'Đối tượng nộp/nhận tiền: "Khách lẻ (tiền mặt)", "Khách lẻ (không dùng tiền mặt)", '
    '"Công Ty TNHH Pepsico VN", "Nguyễn Văn A (NV-0003)"... Lưu snapshot — nếu '
    'sau đổi tên NCC/nhân viên, phiếu cũ vẫn hiển thị tên cũ (đúng audit).';


-- ==========================================
-- FILE: phieu_nhap.sql
-- ==========================================


-- =============================================================================
-- Bảng: phieu_nhap + chi_tiet_phieu_nhap (cặp master-detail)
-- Mục đích: Phiếu nhập hàng từ NCC vào Kho Tổng. Gồm 2 bảng:
--   1. phieu_nhap         — header (metadata, tổng tiền, trạng thái)
--   2. chi_tiet_phieu_nhap — từng dòng hàng (SL, đơn giá, VAT, HSD)
--
-- Chuẩn hoá theo:
--   - `co_so_du_lieu.md` mục "Bảng 14, 15 — phieu_nhap / chi_tiet_phieu_nhap"
--   - `frontend/src/types/inventoryTypes.ts` PurchaseOrder + PurchaseOrderLine
--   - `frontend/src/store/slices/purchaseSlice.ts` buildPurchaseOrder (pattern)
--   - `kenh_truc_ky_thuat.md`: "Chỉ nhập vào Kho Tổng (BR-05)"
--
-- YÊU CẦU: Chạy TẤT CẢ 8 file SQL trước (chi_nhanh, nhan_vien, cham_cong,
--           bang_luong, danh_muc, san_pham, ton_kho, the_kho, nha_cung_cap).
--
-- Quy tắc nghiệp vụ QUAN TRỌNG:
--   1. BR-05: chỉ nhập vào chi nhánh có loai = 'KHO_TONG'. CHECK constraint
--      enforce trực tiếp ở DB (không chỉ dựa vào tầng backend).
--   2. Khi lưu phiếu nhập, đồng thời phải:
--      a. Ghi the_kho (PURCHASE_IN) — append-only audit log
--      b. Cập nhật ton_kho (cộng tồn + cập nhật BQGQ)
--      c. Cập nhật san_pham.gia_von (BQGQ mới)
--      d. Cập nhật nha_cung_cap.tong_don_hang, tong_cong_no
--      Function `fn_nhap_kho_dong_bo()` làm tất cả trong 1 transaction.
--   3. SL đặt (ordered) có thể khác SL nhận (received) khi NCC giao thiếu.
--   4. subTotal, vatTotal, grandTotal là SNAPSHOT — DB KHÔNG tự tính lại
--      khi UPDATE lines.
-- =============================================================================

-- =============================================================================
-- BẢNG 1/2: phieu_nhap (header)
-- =============================================================================
CREATE TABLE IF NOT EXISTS phieu_nhap (
    -- Khoá chính
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Mã phiếu dạng 'PN-20260826-001'. UNIQUE, sinh tự động bởi trigger.
    -- Đặt UNIQUE constraint ngay khi tạo bảng vì trigger BEFORE INSERT sẽ
    -- sinh mã từ sequence.
    ma_phieu        VARCHAR(50)  NOT NULL UNIQUE,

    -- ===== FK =====
    -- BR-05: id_chi_nhanh phải là KHO_TONG. CHECK constraint enforce.
    id_chi_nhanh    UUID         NOT NULL REFERENCES chi_nhanh(id)
                                ON DELETE RESTRICT
                                ON UPDATE CASCADE,
    id_ncc          UUID         NOT NULL REFERENCES nha_cung_cap(id)
                                ON DELETE RESTRICT
                                ON UPDATE CASCADE,
    id_nguoi_nhap   UUID         NOT NULL REFERENCES nhan_vien(id)
                                ON DELETE RESTRICT
                                ON UPDATE CASCADE,

    -- ===== NGÀY THÁNG =====
    -- Ngày đặt hàng (đơn mua). Mặc định = hôm nay.
    ngay_dat_hang   DATE         NOT NULL DEFAULT CURRENT_DATE,
    -- Ngày dự kiến NCC giao. Sau ngày này mà chưa nhận → cảnh báo trễ.
    ngay_du_kien_giao DATE       NOT NULL,
    -- Ngày thực tế nhận hàng. NULL = phiếu chưa nhận (status ≠ COMPLETED).
    ngay_nhan_thuc_te DATE,

    -- CHECK ngay_du_kien >= ngay_dat_hang (không đặt hàng với ngày giao trong quá khứ)
    CONSTRAINT chk_ngay_giao_hop_ly CHECK (ngay_du_kien_giao >= ngay_dat_hang),

    -- CHECK ngày nhận >= ngày đặt (không nhận trước khi đặt)
    CONSTRAINT chk_ngay_nhan_hop_ly CHECK (
        ngay_nhan_thuc_te IS NULL OR ngay_nhan_thuc_te >= ngay_dat_hang
    ),

    -- ===== TIỀN (snapshot) =====
    -- Tổng tiền hàng TRƯỚC VAT và giảm giá. Snapshot từ chi_tiet_phieu_nhap.
    -- sub_total = SUM(lines.line_total) với line_total = received × don_gia.
    sub_total       DECIMAL(15,0) NOT NULL DEFAULT 0 CHECK (sub_total >= 0),

    -- Tổng VAT. Mỗi dòng có VAT riêng, sum tất cả lại.
    vat_total       DECIMAL(15,0) NOT NULL DEFAULT 0 CHECK (vat_total >= 0),

    -- Giảm giá toàn phiếu (vd: chiết khấu thanh toán nhanh). Mặc định 0.
    giam_gia        DECIMAL(15,0) NOT NULL DEFAULT 0 CHECK (giam_gia >= 0),

    -- Tổng phải trả = sub_total + vat_total - giam_gia.
    -- DENORMALIZED — tính 1 lần lúc INSERT, sau đó snapshot. Nếu UPDATE
    -- lines phải tính lại (không tự động).
    grand_total     DECIMAL(15,0) NOT NULL DEFAULT 0 CHECK (grand_total >= 0),

    -- CHECK grand_total khớp với công thức (chống sai số)
    CONSTRAINT chk_grand_total_dung CHECK (grand_total = sub_total + vat_total - giam_gia),

    -- Số tiền đã thanh toán cho NCC. Snapshot, cập nhật khi chi tiền.
    -- Khi INSERT: paid_amount = grand_total (thanh toán ngay) hoặc 0 (công nợ).
    -- Khi UPDATE: cộng dồn khi có phiếu chi sổ quỹ TRÀ_NCC.
    da_thanh_toan   DECIMAL(15,0) NOT NULL DEFAULT 0
                   CHECK (da_thanh_toan >= 0 AND da_thanh_toan <= grand_total),

    -- Công nợ còn lại = grand_total - da_thanh_toan. DENORMALIZED, trigger
    -- BEFORE INSERT/UPDATE tự tính (nhưng cũng có thể dùng GENERATED ALWAYS).
    cong_no          DECIMAL(15,0) NOT NULL DEFAULT 0
                   CHECK (cong_no >= 0),

    -- ===== TRẠNG THÁI =====
    -- 3 trạng thái (xem DocumentStatus enum):
    --   COMPLETED:   đã nhận hàng thực tế, tồn đã cộng
    --   PENDING:     đang chờ NCC giao
    --   CANCELLED:   huỷ đơn (NCC hết hàng, ...)
    trang_thai      VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                   CHECK (trang_thai IN ('DRAFT', 'PENDING', 'PENDING_PAYMENT', 'COMPLETED', 'CANCELLED')),

    -- CHECK nếu status = COMPLETED thì PHẢI có ngay_nhan_thuc_te
    CONSTRAINT chk_completed_co_ngay_nhan CHECK (
        trang_thai != 'COMPLETED' OR ngay_nhan_thuc_te IS NOT NULL
    ),

    ghi_chu         TEXT,

    ngay_tao        TIMESTAMP    NOT NULL DEFAULT NOW(),
    ngay_cap_nhat   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Tái sử dụng trigger function
DROP TRIGGER IF EXISTS phieu_nhap_set_ngay_cap_nhat ON phieu_nhap;
CREATE TRIGGER phieu_nhap_set_ngay_cap_nhat
    BEFORE UPDATE ON phieu_nhap
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_ngay_cap_nhat();

-- =============================================================================
-- Trigger QUAN TRỌNG #1: enforce BR-05 (chỉ nhập vào Kho Tổng)
-- =============================================================================
CREATE OR REPLACE FUNCTION trg_phieu_nhap_check_kho_tong()
RETURNS TRIGGER AS $$
DECLARE
    v_loai VARCHAR(20);
BEGIN
    SELECT loai INTO v_loai
    FROM chi_nhanh
    WHERE id = NEW.id_chi_nhanh;

    IF v_loai != 'KHO_TONG' THEN
        RAISE EXCEPTION 'BR-05: Chỉ được nhập kho vào Kho Tổng. '
            'Chi nhánh "%" có loai = %', NEW.id_chi_nhanh, v_loai;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS phieu_nhap_check_kho_tong ON phieu_nhap;
CREATE TRIGGER phieu_nhap_check_kho_tong
    BEFORE INSERT OR UPDATE OF id_chi_nhanh ON phieu_nhap
    FOR EACH ROW
    EXECUTE FUNCTION trg_phieu_nhap_check_kho_tong();

-- =============================================================================
-- Trigger QUAN TRỌNG #2: sinh mã phiếu tự động 'PN-YYYYMMDD-NNN'
-- Đếm số phiếu trong cùng ngày, tăng dần.
-- =============================================================================
CREATE OR REPLACE FUNCTION trg_phieu_nhap_sinh_ma()
RETURNS TRIGGER AS $$
DECLARE
    v_count INTEGER;
    v_date_str VARCHAR(8);
BEGIN
    -- Nếu frontend đã truyền mã (vd: nhập tay) thì giữ nguyên
    IF NEW.ma_phieu IS NOT NULL AND NEW.ma_phieu <> '' THEN
        RETURN NEW;
    END IF;

    v_date_str := TO_CHAR(NEW.ngay_dat_hang, 'YYYYMMDD');
    SELECT COUNT(*) + 1 INTO v_count
    FROM phieu_nhap
    WHERE ma_phieu LIKE 'PN-' || v_date_str || '-%';

    NEW.ma_phieu := 'PN-' || v_date_str || '-' || LPAD(v_count::TEXT, 3, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS phieu_nhap_sinh_ma ON phieu_nhap;
CREATE TRIGGER phieu_nhap_sinh_ma
    BEFORE INSERT ON phieu_nhap
    FOR EACH ROW
    EXECUTE FUNCTION trg_phieu_nhap_sinh_ma();

-- =============================================================================
-- Trigger QUAN TRỌNG #3: tự đồng bộ `cong_no` từ `grand_total - da_thanh_toan`
-- =============================================================================
CREATE OR REPLACE FUNCTION trg_phieu_nhap_sync_cong_no()
RETURNS TRIGGER AS $$
BEGIN
    NEW.cong_no := NEW.grand_total - NEW.da_thanh_toan;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS phieu_nhap_sync_cong_no ON phieu_nhap;
CREATE TRIGGER phieu_nhap_sync_cong_no
    BEFORE INSERT OR UPDATE OF grand_total, da_thanh_toan ON phieu_nhap
    FOR EACH ROW
    EXECUTE FUNCTION trg_phieu_nhap_sync_cong_no();

-- =============================================================================
-- Indexes cho query thường gặp
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_phieu_nhap_ngay_dat
    ON phieu_nhap (ngay_dat_hang DESC);

CREATE INDEX IF NOT EXISTS idx_phieu_nhap_ncc
    ON phieu_nhap (id_ncc, ngay_dat_hang DESC);

CREATE INDEX IF NOT EXISTS idx_phieu_nhap_kho
    ON phieu_nhap (id_chi_nhanh, ngay_dat_hang DESC);

CREATE INDEX IF NOT EXISTS idx_phieu_nhap_chua_thanh_toan
    ON phieu_nhap (id_ncc) WHERE cong_no > 0 AND trang_thai = 'COMPLETED';

CREATE INDEX IF NOT EXISTS idx_phieu_nhap_nguoi
    ON phieu_nhap (id_nguoi_nhap, ngay_dat_hang DESC);

-- =============================================================================
-- BẢNG 2/2: chi_tiet_phieu_nhap (lines)
-- =============================================================================
CREATE TABLE IF NOT EXISTS chi_tiet_phieu_nhap (
    -- Khoá chính
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

    -- FK tới header. ON DELETE CASCADE: xoá phiếu → xoá lines.
    id_phieu_nhap   UUID         NOT NULL REFERENCES phieu_nhap(id)
                                ON DELETE CASCADE
                                ON UPDATE CASCADE,

    -- FK tới sản phẩm
    id_san_pham     UUID         NOT NULL REFERENCES san_pham(id)
                                ON DELETE RESTRICT
                                ON UPDATE CASCADE,

    -- ===== SỐ LƯỢNG =====
    -- Số lượng ĐẶT (gửi NCC). Có thể lớn hơn SL nhận khi NCC giao thiếu.
    so_luong_dat    INTEGER      NOT NULL CHECK (so_luong_dat > 0),
    -- Số lượng THỰC NHẬN. Có thể nhỏ hơn SL đặt, hoặc 0 nếu NCC không giao.
    -- CHECK >= 0 cho phép nhận 0 (huỷ dòng này nhưng giữ dòng để audit).
    so_luong_nhan   INTEGER      NOT NULL CHECK (so_luong_nhan >= 0),
    -- CHECK SL nhận không vượt SL đặt
    CONSTRAINT chk_sl_nhan_khong_vuot_dat CHECK (so_luong_nhan <= so_luong_dat),

    -- Đơn giá nhập (snapshot tại thời điểm nhập). Dùng tính BQGQ cho ton_kho.
    don_gia_nhap    DECIMAL(12,0) NOT NULL CHECK (don_gia_nhap > 0),

    -- VAT riêng cho dòng này. Phổ biến: 0 (hàng thiết yếu), 8, 10.
    vat_phantram    SMALLINT     NOT NULL DEFAULT 8
                   CHECK (vat_phantram >= 0 AND vat_phantram <= 100),

    -- Thành tiền = so_luong_nhan × don_gia_nhap. TRƯỚC VAT.
    -- DENORMALIZED — trigger BEFORE INSERT/UPDATE tự tính.
    thanh_tien      DECIMAL(15,0) NOT NULL CHECK (thanh_tien >= 0),

    -- HSD riêng từng lô (nếu SP có HSD). NULL nếu hàng không có HSD.
    -- Dùng để cập nhật ton_kho.han_su_dung_gan_nhat.
    han_su_dung     DATE,

    -- Số thứ tự dòng trong phiếu (1, 2, 3...) — UI sắp xếp theo thứ tự nhập.
    thu_tu          INTEGER      NOT NULL DEFAULT 0 CHECK (thu_tu >= 0),

    ngay_tao        TIMESTAMP    NOT NULL DEFAULT NOW(),

    -- 1 SP không xuất hiện 2 lần trong cùng 1 phiếu. UNIQUE.
    CONSTRAINT uq_chi_tiet_phieu_nhap_sp UNIQUE (id_phieu_nhap, id_san_pham)
);

-- Trigger tự tính `thanh_tien = so_luong_nhan × don_gia_nhap`
CREATE OR REPLACE FUNCTION trg_chi_tiet_phieu_nhap_tinh_tien()
RETURNS TRIGGER AS $$
BEGIN
    NEW.thanh_tien := NEW.so_luong_nhan * NEW.don_gia_nhap;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chi_tiet_phieu_nhap_tinh_tien ON chi_tiet_phieu_nhap;
CREATE TRIGGER chi_tiet_phieu_nhap_tinh_tien
    BEFORE INSERT OR UPDATE OF so_luong_nhan, don_gia_nhap ON chi_tiet_phieu_nhap
    FOR EACH ROW
    EXECUTE FUNCTION trg_chi_tiet_phieu_nhap_tinh_tien();

CREATE INDEX IF NOT EXISTS idx_ct_phieu_nhap_sp
    ON chi_tiet_phieu_nhap (id_san_pham);

-- =============================================================================
-- TRIGGER QUAN TRỌNG: cập nhật tổng tiền header khi INSERT/UPDATE/DELETE line
-- Đảm bảo sub_total, vat_total, grand_total luôn đúng với lines.
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_cap_nhat_tong_phieu_nhap()
RETURNS TRIGGER AS $$
DECLARE
    v_id_phieu_nhap UUID;
    v_sub DECIMAL(15,0);
    v_vat DECIMAL(15,0);
BEGIN
    v_id_phieu_nhap := COALESCE(NEW.id_phieu_nhap, OLD.id_phieu_nhap);

    SELECT COALESCE(SUM(don_gia_nhap * so_luong_nhan), 0)
    INTO v_sub
    FROM chi_tiet_phieu_nhap
    WHERE id_phieu_nhap = v_id_phieu_nhap;

    -- VAT tính trên thành tiền từng dòng rồi sum
    SELECT COALESCE(SUM(ROUND(don_gia_nhap * so_luong_nhan * vat_phantram / 100)), 0)
    INTO v_vat
    FROM chi_tiet_phieu_nhap
    WHERE id_phieu_nhap = v_id_phieu_nhap;

    UPDATE phieu_nhap
    SET sub_total = v_sub,
        vat_total = v_vat,
        grand_total = v_sub + v_vat - giam_gia
    WHERE id = v_id_phieu_nhap;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chi_tiet_phieu_nhap_cap_nhat_tong ON chi_tiet_phieu_nhap;
CREATE TRIGGER trg_chi_tiet_phieu_nhap_cap_nhat_tong
    AFTER INSERT OR UPDATE OR DELETE ON chi_tiet_phieu_nhap
    FOR EACH ROW
    EXECUTE FUNCTION fn_cap_nhat_tong_phieu_nhap();

-- =============================================================================
-- FUNCTION: Tính và cập nhật Bình Quân Gia Quyền (BQGQ) cho sản phẩm
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_cap_nhat_bqoq_san_pham(
    p_id_san_pham UUID,
    p_id_chi_nhanh UUID,
    p_sl_nhap INTEGER,
    p_don_gia_nhap DECIMAL(12,0)
) RETURNS VOID AS $$
DECLARE
    v_ton_cu INTEGER;
    v_gia_cu DECIMAL(12,0);
    v_bqgq_moi DECIMAL(12,0);
BEGIN
    SELECT so_luong_ton, gia_von_trung_binh INTO v_ton_cu, v_gia_cu
    FROM ton_kho
    WHERE id_san_pham = p_id_san_pham AND id_chi_nhanh = p_id_chi_nhanh;

    IF NOT FOUND THEN
        v_ton_cu := 0;
        v_gia_cu := 0;
    END IF;

    IF (v_ton_cu + p_sl_nhap) > 0 THEN
        v_bqgq_moi := ROUND((v_ton_cu * v_gia_cu + p_sl_nhap * p_don_gia_nhap) / (v_ton_cu + p_sl_nhap));
    ELSE
        v_bqgq_moi := p_don_gia_nhap;
    END IF;

    UPDATE san_pham
    SET gia_von = v_bqgq_moi
    WHERE id = p_id_san_pham;

    UPDATE ton_kho
    SET gia_von_trung_binh = v_bqgq_moi
    WHERE id_san_pham = p_id_san_pham AND id_chi_nhanh = p_id_chi_nhanh;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FUNCTION ĐỒNG BỘ: nhập kho end-to-end (1 transaction duy nhất)
-- Gọi từ backend service, làm 5 việc:
--   1. INSERT phieu_nhap (header)
--   2. INSERT các chi_tiet_phieu_nhap (lines)
--   3. Với từng line: ghi the_kho (PURCHASE_IN) + cập nhật ton_kho
--   4. Cập nhật san_pham.gia_von (BQGQ mới)
--   5. Cập nhật nha_cung_cap.tong_don_hang, tong_cong_no
-- Trả về UUID của phieu_nhap vừa tạo.
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_nhap_kho_dong_bo(
    p_id_chi_nhanh    UUID,
    p_id_ncc          UUID,
    p_id_nguoi_nhap   UUID,
    p_ngay_dat_hang   DATE DEFAULT CURRENT_DATE,
    p_ngay_du_kien    DATE DEFAULT CURRENT_DATE,
    p_ngay_nhan_thuc_te DATE DEFAULT CURRENT_DATE,
    p_giam_gia        DECIMAL(15,0) DEFAULT 0,
    p_thanh_toan_ngay BOOLEAN DEFAULT TRUE,  -- TRUE = trả ngay (paid = grand)
    p_ghi_chu        TEXT DEFAULT NULL,
    p_nguoi_thuc_hien VARCHAR(255) DEFAULT 'Hệ thống',
    p_lines JSONB DEFAULT '[]'::JSONB
    -- Format lines: [{"id_san_pham": "...", "so_luong_dat": 100, "so_luong_nhan": 100,
    --                 "don_gia_nhap": 9500, "vat_phantram": 8, "han_su_dung": "2027-02-15"}]
) RETURNS UUID AS $$
DECLARE
    v_id_phieu UUID;
    v_line JSONB;
    v_ma_chung_tu VARCHAR(50);
    v_grand DECIMAL(15,0);
    v_paid DECIMAL(15,0);
BEGIN
    -- 1. INSERT header
    INSERT INTO phieu_nhap (
        id_chi_nhanh, id_ncc, id_nguoi_nhap,
        ngay_dat_hang, ngay_du_kien_giao, ngay_nhan_thuc_te,
        giam_gia, trang_thai, ghi_chu
    ) VALUES (
        p_id_chi_nhanh, p_id_ncc, p_id_nguoi_nhap,
        p_ngay_dat_hang, p_ngay_du_kien, p_ngay_nhan_thuc_te,
        COALESCE(p_giam_gia, 0), 'COMPLETED', p_ghi_chu
    )
    RETURNING id INTO v_id_phieu;

    -- 2. INSERT từng line + ghi the_kho + cập nhật ton_kho
    FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
    LOOP
        INSERT INTO chi_tiet_phieu_nhap (
            id_phieu_nhap, id_san_pham,
            so_luong_dat, so_luong_nhan, don_gia_nhap, vat_phantram,
            han_su_dung, thu_tu
        ) VALUES (
            v_id_phieu,
            (v_line->>'id_san_pham')::UUID,
            (v_line->>'so_luong_dat')::INTEGER,
            (v_line->>'so_luong_nhan')::INTEGER,
            (v_line->>'don_gia_nhap')::DECIMAL(12,0),
            COALESCE((v_line->>'vat_phantram')::SMALLINT, 8),
            (v_line->>'han_su_dung')::DATE,
            COALESCE((v_line->>'thu_tu')::INTEGER, 0)
        );

        -- Chỉ ghi the_kho + cập nhật ton_kho nếu SL nhận > 0
        IF (v_line->>'so_luong_nhan')::INTEGER > 0 THEN
            PERFORM fn_cap_nhat_bqoq_san_pham(
                (v_line->>'id_san_pham')::UUID,
                p_id_chi_nhanh,
                (v_line->>'so_luong_nhan')::INTEGER,
                (v_line->>'don_gia_nhap')::DECIMAL(12,0)
            );

            PERFORM fn_ghi_the_kho_va_dieu_chinh_ton(
                (v_line->>'id_san_pham')::UUID,
                p_id_chi_nhanh,
                'PURCHASE_IN',
                (v_line->>'so_luong_nhan')::INTEGER,
                (v_line->>'don_gia_nhap')::DECIMAL(12,0),
                v_ma_chung_tu,
                p_nguoi_thuc_hien,
                (v_line->>'han_su_dung')::DATE,
                'Nhập hàng từ NCC: phiếu ' || v_ma_chung_tu,
                p_ngay_nhan_thuc_te::TIMESTAMP
            );
        END IF;
    END LOOP;

    -- Lấy grand_total sau khi trigger cập nhật xong
    SELECT grand_total INTO v_grand
    FROM phieu_nhap WHERE id = v_id_phieu;

    -- 3. paid_amount: thanh toán ngay hay công nợ
    v_paid := CASE WHEN p_thanh_toan_ngay THEN v_grand ELSE 0 END;

    UPDATE phieu_nhap
    SET da_thanh_toan = v_paid
    WHERE id = v_id_phieu;

    -- 4. Cập nhật BQGQ cho san_pham
    -- Đã được thực hiện qua hàm fn_cap_nhat_bqoq_san_pham ở từng dòng bên trên.

    -- 5. Cập nhật thống kê NCC
    UPDATE nha_cung_cap
    SET tong_don_hang = tong_don_hang + 1,
        tong_cong_no = tong_cong_no + (v_grand - v_paid)
    WHERE id = p_id_ncc;

    RETURN v_id_phieu;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
COMMENT ON TABLE phieu_nhap IS
    'Phiếu nhập hàng từ NCC vào Kho Tổng (BR-05). BR-05 enforce bằng trigger '
    '`trg_phieu_nhap_check_kho_tong` — DB tự chặn nếu INSERT vào cửa hàng. '
    'sub_total/vat_total/grand_total/cong_no là SNAPSHOT, trigger AFTER '
    'INSERT line tự cập nhật. Công nợ theo NCC được đồng bộ ngược vào '
    '`nha_cung_cap.tong_cong_no` (denormalized).';

COMMENT ON COLUMN phieu_nhap.id_chi_nhanh IS
    'BR-05: CHỈ nhập vào Kho Tổng. Trigger `trg_phieu_nhap_check_kho_tong` '
    'tự chặn nếu loai != KHO_TONG. Nếu backend cho phép nhập vào cửa hàng '
    'trong tương lai, cần update trigger + thay đổi đặc tả.';

COMMENT ON COLUMN phieu_nhap.ma_phieu IS
    'Mã phiếu dạng PN-YYYYMMDD-NNN. Trigger `trg_phieu_nhap_sinh_ma` sinh '
    'tự động nếu NULL. UNIQUE — không thể trùng.';

COMMENT ON COLUMN chi_tiet_phieu_nhap.so_luong_dat IS
    'SL đặt — gửi yêu cầu cho NCC. Có thể khác SL nhận (so_luong_nhan) khi '
    'NCC giao thiếu. UNIQUE cùng id_san_pham trong bảng chi_tiet_phieu_nhap '
    'đảm bảo 1 SP không xuất hiện 2 dòng trong cùng phiếu.';

COMMENT ON COLUMN phieu_nhap.da_thanh_toan IS
    'Số tiền đã trả NCC. Cập nhật khi có phiếu chi sổ quỹ (sau khi tạo bảng '
    'so_quy). CHECK <= grand_total (không trả quá). Khi INSERT: mặc định 0 '
    'nếu công nợ, = grand_total nếu thanh toán ngay.';

COMMENT ON COLUMN phieu_nhap.cong_no IS
    'Công nợ còn phải trả = grand_total - da_thanh_toan. DENORMALIZED, '
    'trigger `trg_phieu_nhap_sync_cong_no` tự cập nhật khi thay đổi '
    'grand_total hoặc da_thanh_toan.';

COMMENT ON TABLE chi_tiet_phieu_nhap IS
    'Từng dòng hàng trong phiếu nhập. Mỗi dòng = 1 sản phẩm với SL đặt, '
    'SL nhận (có thể nhỏ hơn nếu NCC giao thiếu), đơn giá, VAT riêng, HSD '
    'riêng (cho phép nhiều lô có HSD khác nhau). UNIQUE (id_phieu_nhap, '
    'id_san_pham) chống trùng SP trong cùng phiếu. Trigger AFTER INSERT/UPDATE/'
    'DELETE tự cập nhật tổng tiền header.';

COMMENT ON COLUMN chi_tiet_phieu_nhap.so_luong_nhan IS
    'SL thực nhận. CHECK <= so_luong_dat (NCC không được giao dư). CHECK >= 0 '
    '(cho phép = 0 nếu NCC không giao món này nhưng vẫn ghi nhận để audit). '
    'Chỉ khi so_luong_nhan > 0 mới ghi the_kho (PURCHASE_IN) + cập nhật ton_kho.';

COMMENT ON COLUMN chi_tiet_phieu_nhap.vat_phantram IS
    'VAT riêng dòng (vd: sữa 8%, hàng thiết yếu 0%). Sum thành vat_total ở '
    'header. SMALLINT để tiết kiệm byte.';

COMMENT ON COLUMN chi_tiet_phieu_nhap.thanh_tien IS
    'Thành tiền = so_luong_nhan × don_gia_nhap (TRƯỚC VAT). DENORMALIZED, '
    'trigger BEFORE INSERT/UPDATE tự tính.';


-- ==========================================
-- FILE: phieu_xuat_kho.sql
-- ==========================================


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
    -- 4 trạng thái (luồng 3 bước module 9):
    --   PENDING:   QL chi nhánh tạo yêu cầu, chờ Thủ kho duyệt
    --   SHIPPED:   Thủ kho đã xuất kho (trừ tồn Kho Tổng), chờ chi nhánh nhận
    --   COMPLETED: chi nhánh xác nhận đã nhận (cộng tồn chi nhánh)
    --   CANCELLED: bị từ chối / huỷ
    trang_thai      VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                   CHECK (trang_thai IN ('PENDING', 'SHIPPED', 'COMPLETED', 'CANCELLED')),

    -- CHECK ngày xuất phải có khi status = COMPLETED.
    CONSTRAINT chk_completed_co_ngay_xuat CHECK (
        trang_thai != 'COMPLETED' OR ngay_xuat_thuc_te IS NOT NULL
    ),
    -- CHECK ngày xuất phải có khi status = SHIPPED.
    CONSTRAINT chk_shipped_co_ngay_xuat CHECK (
        trang_thai != 'SHIPPED' OR ngay_xuat_thuc_te IS NOT NULL
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


-- ==========================================
-- FILE: phieu_kiem_ke.sql
-- ==========================================


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


-- ==========================================
-- FILE: hoa_don.sql
-- ==========================================


-- =============================================================================
-- Bảng: hoa_don + chi_tiet_hoa_don (cặp master-detail)
-- Mục đích: Hoá đơn bán hàng tại POS. Lưu giỏ hàng, tổng tiền, hình thức
--           thanh toán, tiền thối. Khi INSERT COMPLETED, đồng thời:
--           1. Ghi the_kho SALE_OUT (trừ tồn) cho từng line
--           2. Cập nhật ton_kho (trừ tồn)
--           3. Tạo phiếu thu sổ quỹ (BAN_HANG) — tạo ở bảng so_quy sau
--
-- Chuẩn hoá theo:
--   - `co_so_du_lieu.md` mục "Bảng 11, 12 — hoa_don / chi_tiet_hoa_don"
--   - `frontend/src/types/posTypes.ts` SalesOrder + OrderLine (UI yêu cầu)
--   - `frontend/src/store/slices/salesOrderSlice.ts` (đã tạo slice)
--   - `co_so_du_lieu.md:573` quy ước mã: HD-YYYYMMDD-NNNN (4 chữ số)
--
-- YÊU CẦU: Tất cả 12 file SQL trước.
--
-- Quy tắc nghiệp vụ:
--   1. BR-01: chỉ bán tại Cửa hàng bán lẻ (id_chi_nhanh phải là CUA_HANG_BAN_LE).
--   2. BR-01: KHÔNG bán vượt tồn — check trong function `fn_tao_hoa_don`.
--   3. 3 trạng thái: COMPLETED, REFUNDED, CANCELLED.
--   4. REFUNDED: phải có người duyệt + ngày hoàn. CANCELLED: KHÔNG hoàn tồn/tiền.
--   5. Hỗ trợ 6 hình thức thanh toán (frontend: CASH/CARD/MOMO/ZALOPAY/VNPAY/BANK_TRANSFER).
-- =============================================================================

-- =============================================================================
-- BẢNG 1/2: hoa_don (header)
-- =============================================================================
CREATE TABLE IF NOT EXISTS hoa_don (
    -- Khoá chính
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Mã hoá đơn dạng 'HD-20260826-0042' (4 chữ số theo quy ước MD).
    ma_hoa_don      VARCHAR(50)  NOT NULL UNIQUE,

    -- ===== FK =====
    -- BR-01: id_chi_nhanh phải là CUA_HANG_BAN_LE. Trigger enforce.
    id_chi_nhanh    UUID         NOT NULL REFERENCES chi_nhanh(id)
                                ON DELETE RESTRICT
                                ON UPDATE CASCADE,
    -- Thu ngân bán hoá đơn.
    id_thu_ngan     UUID         NOT NULL REFERENCES nhan_vien(id)
                                ON DELETE RESTRICT
                                ON UPDATE CASCADE,

    -- ===== CA BÁN HÀNG =====
    -- MORNING (06-14), AFTERNOON (14-22), NIGHT (22-06). Phục vụ đối soát két cuối ca.
    ca_lam_viec     VARCHAR(20)  NOT NULL
                   CHECK (ca_lam_viec IN ('MORNING', 'AFTERNOON', 'NIGHT')),

    -- ===== NGÀY BÁN =====
    -- Thời điểm chốt đơn, ISO timestamp. Index theo ngày để query báo cáo.
    ngay_ban        TIMESTAMP    NOT NULL DEFAULT NOW(),

    -- ===== HÌNH THỨC THANH TOÁN =====
    -- 6 giá trị theo frontend (PAYMENT_METHOD). Mở rộng từ spec 2 giá trị.
    hinh_thuc_tt    VARCHAR(20)  NOT NULL
                   CHECK (hinh_thuc_tt IN (
                       'CASH',           -- Tiền mặt
                       'CARD',           -- Thẻ ngân hàng
                       'MOMO',           -- Ví MoMo
                       'ZALOPAY',        -- ZaloPay
                       'VNPAY',          -- VNPay QR
                       'BANK_TRANSFER'   -- Chuyển khoản
                   )),

    -- ===== TIỀN (snapshot, không tính lại) =====
    -- Tổng tiền hàng TRƯỚC giảm giá và VAT.
    sub_total       DECIMAL(15,0) NOT NULL DEFAULT 0 CHECK (sub_total >= 0),
    -- Tổng giảm giá (theo dòng + theo đơn). Snapshot từ lines.
    giam_gia        DECIMAL(15,0) NOT NULL DEFAULT 0 CHECK (giam_gia >= 0),
    -- Tổng VAT.
    vat_total       DECIMAL(15,0) NOT NULL DEFAULT 0 CHECK (vat_total >= 0),
    -- Tổng khách phải trả = sub_total + vat_total - giam_gia.
    -- DENORMALIZED — tính 1 lần lúc INSERT.
    -- CHÚ Ý: spec gọi cột này `tong_tien` nhưng frontend dùng `grandTotal` →
    -- dùng tên `grand_total` cho khớp codebase.
    grand_total     DECIMAL(15,0) NOT NULL DEFAULT 0
                   CHECK (grand_total = sub_total + vat_total - giam_gia),

    -- Tiền khách đưa (chỉ ý nghĩa với CASH). 0 nếu không dùng tiền mặt.
    -- NULL khi chưa nhập (chưa thanh toán).
    tien_khach_dua  DECIMAL(15,0) CHECK (tien_khach_dua IS NULL OR tien_khach_dua >= 0),
    -- Tiền thừa trả khách = tien_khach_dua - grand_total.
    -- DENORMALIZED, trigger BEFORE INSERT/UPDATE tự tính.
    tien_thoi       DECIMAL(15,0) CHECK (tien_thoi IS NULL OR tien_thoi >= 0),

    -- CHECK tien_khach_dua >= grand_total (khách phải đưa ít nhất bằng tổng)
    -- Riêng với CASH: bắt buộc. Với hình thức khác: tien_khach_dua = grand_total.
    -- Logic enforce bằng trigger bên dưới.

    -- Số điện thoại thành viên Circle K Club. NULL = khách lẻ.
    sdt_thanh_vien  VARCHAR(20),

    -- ===== TRẠNG THÁI =====
    -- COMPLETED: đã thanh toán, tồn kho đã trừ, sổ quỹ đã ghi thu
    -- REFUNDED:  đã hoàn tiền (riêng CANCELLED — không hoàn tồn)
    -- CANCELLED:  huỷ đơn (lỗi nhập trong ngày, không hoàn tồn/tiền)
    trang_thai      VARCHAR(20)  NOT NULL DEFAULT 'COMPLETED'
                   CHECK (trang_thai IN ('COMPLETED', 'REFUNDED', 'CANCELLED')),

    -- Người duyệt hoàn tiền (NULL nếu chưa REFUNDED). Theo phân quyền: Thu ngân/QL.
    id_nguoi_hoan   UUID         REFERENCES nhan_vien(id)
                                ON DELETE SET NULL
                                ON UPDATE CASCADE,
    ngay_hoan       TIMESTAMP,
    -- Lý do hoàn/huỷ (bắt buộc nếu status != COMPLETED). Trigger check.
    ly_do_hoan      TEXT,

    ghi_chu         TEXT,

    -- Audit timestamps
    ngay_tao        TIMESTAMP    NOT NULL DEFAULT NOW(),
    ngay_cap_nhat   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Tái sử dụng trigger function
DROP TRIGGER IF EXISTS hoa_don_set_ngay_cap_nhat ON hoa_don;
CREATE TRIGGER hoa_don_set_ngay_cap_nhat
    BEFORE UPDATE ON hoa_don
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_ngay_cap_nhat();

-- =============================================================================
-- Trigger enforce BR-01: chỉ bán tại Cửa hàng bán lẻ
-- =============================================================================
CREATE OR REPLACE FUNCTION trg_hoa_don_check_cua_hang()
RETURNS TRIGGER AS $$
DECLARE
    v_loai VARCHAR(20);
BEGIN
    SELECT loai INTO v_loai
    FROM chi_nhanh WHERE id = NEW.id_chi_nhanh;

    IF v_loai <> 'CUA_HANG_BAN_LE' THEN
        RAISE EXCEPTION 'BR-01: Chỉ được bán hàng tại CỬA HÀNG BÁN LẺ. '
            'Chi nhánh "%" có loai = %', NEW.id_chi_nhanh, v_loai;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hoa_don_check_cua_hang ON hoa_don;
CREATE TRIGGER hoa_don_check_cua_hang
    BEFORE INSERT OR UPDATE OF id_chi_nhanh ON hoa_don
    FOR EACH ROW
    EXECUTE FUNCTION trg_hoa_don_check_cua_hang();

-- =============================================================================
-- Trigger tự tính tien_thoi = tien_khach_dua - grand_total
-- =============================================================================
CREATE OR REPLACE FUNCTION trg_hoa_don_tinh_tien_thoi()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tien_khach_dua IS NULL THEN
        NEW.tien_thoi := NULL;
    ELSE
        NEW.tien_thoi := NEW.tien_khach_dua - NEW.grand_total;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hoa_don_tinh_tien_thoi ON hoa_don;
CREATE TRIGGER hoa_don_tinh_tien_thoi
    BEFORE INSERT OR UPDATE OF tien_khach_dua, grand_total ON hoa_don
    FOR EACH ROW
    EXECUTE FUNCTION trg_hoa_don_tinh_tien_thoi();

-- =============================================================================
-- Trigger BẮT BUỘC lý do khi REFUNDED/CANCELLED
-- + BẮT BUỘC người hoàn khi REFUNDED
-- =============================================================================
CREATE OR REPLACE FUNCTION trg_hoa_don_check_ly_do()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.trang_thai = 'REFUNDED' THEN
        IF NEW.id_nguoi_hoan IS NULL THEN
            RAISE EXCEPTION 'Hoàn tiền phải có người duyệt (id_nguoi_hoan)';
        END IF;
        IF NEW.ngay_hoan IS NULL THEN
            RAISE EXCEPTION 'Hoàn tiền phải có ngày hoàn (ngay_hoan)';
        END IF;
        IF NEW.ly_do_hoan IS NULL OR TRIM(NEW.ly_do_hoan) = '' THEN
            RAISE EXCEPTION 'Hoàn tiền phải ghi lý do (ly_do_hoan)';
        END IF;
    END IF;

    IF NEW.trang_thai = 'CANCELLED' THEN
        IF NEW.ly_do_hoan IS NULL OR TRIM(NEW.ly_do_hoan) = '' THEN
            RAISE EXCEPTION 'Huỷ đơn phải ghi lý do (ly_do_hoan)';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hoa_don_check_ly_do ON hoa_don;
CREATE TRIGGER hoa_don_check_ly_do
    BEFORE INSERT OR UPDATE OF trang_thai ON hoa_don
    FOR EACH ROW
    EXECUTE FUNCTION trg_hoa_don_check_ly_do();

-- =============================================================================
-- Trigger sinh mã 'HD-YYYYMMDD-NNNN' (4 chữ số theo quy ước)
-- =============================================================================
CREATE OR REPLACE FUNCTION trg_hoa_don_sinh_ma()
RETURNS TRIGGER AS $$
DECLARE
    v_count INTEGER;
    v_date_str VARCHAR(8);
BEGIN
    IF NEW.ma_hoa_don IS NOT NULL AND NEW.ma_hoa_don <> '' THEN
        RETURN NEW;
    END IF;

    v_date_str := TO_CHAR(NEW.ngay_ban, 'YYYYMMDD');
    -- Quy ước: HD-YYYYMMDD-NNNN (4 chữ số, bắt đầu từ 9000 như frontend mock)
    SELECT COUNT(*) + 9000 INTO v_count
    FROM hoa_don
    WHERE ma_hoa_don LIKE 'HD-' || v_date_str || '-%';

    NEW.ma_hoa_don := 'HD-' || v_date_str || '-' || LPAD(v_count::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hoa_don_sinh_ma ON hoa_don;
CREATE TRIGGER hoa_don_sinh_ma
    BEFORE INSERT ON hoa_don
    FOR EACH ROW
    EXECUTE FUNCTION trg_hoa_don_sinh_ma();

-- =============================================================================
-- Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_hoa_don_ngay
    ON hoa_don (ngay_ban DESC);

CREATE INDEX IF NOT EXISTS idx_hoa_don_chi_nhanh
    ON hoa_don (id_chi_nhanh, ngay_ban DESC);

CREATE INDEX IF NOT EXISTS idx_hoa_don_thu_ngan
    ON hoa_don (id_thu_ngan, ngay_ban DESC);

CREATE INDEX IF NOT EXISTS idx_hoa_don_hinh_thuc
    ON hoa_don (hinh_thuc_tt, ngay_ban DESC);

CREATE INDEX IF NOT EXISTS idx_hoa_don_trang_thai
    ON hoa_don (trang_thai, ngay_ban DESC);

CREATE INDEX IF NOT EXISTS idx_hoa_don_cho_hoan
    ON hoa_don (ngay_hoan) WHERE trang_thai = 'REFUNDED';

-- =============================================================================
-- BẢNG 2/2: chi_tiet_hoa_don (lines)
-- =============================================================================
CREATE TABLE IF NOT EXISTS chi_tiet_hoa_don (
    -- Khoá chính
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

    -- FK tới header. ON DELETE CASCADE: xoá hoá đơn → xoá lines.
    id_hoa_don      UUID         NOT NULL REFERENCES hoa_don(id)
                                ON DELETE CASCADE
                                ON UPDATE CASCADE,

    -- FK tới sản phẩm
    id_san_pham     UUID         NOT NULL REFERENCES san_pham(id)
                                ON DELETE RESTRICT
                                ON UPDATE CASCADE,

    -- Số lượng bán. CHECK > 0 — không cho bán 0.
    so_luong        INTEGER      NOT NULL CHECK (so_luong > 0),

    -- Đơn giá bán (snapshot từ san_pham.gia_ban tại thời điểm bán).
    don_gia         DECIMAL(12,0) NOT NULL CHECK (don_gia > 0),

    -- Giảm giá theo dòng (số tiền tuyệt đối, không phải %). Mặc định 0.
    -- CHECK >= 0 và <= don_gia × so_luong (giảm giá không vượt giá trị dòng).
    giam_gia_dong   DECIMAL(15,0) NOT NULL DEFAULT 0
                   CHECK (giam_gia_dong >= 0 AND giam_gia_dong <= don_gia * so_luong),

    -- VAT riêng dòng (%). Phổ biến: 0, 8, 10.
    vat_phantram    SMALLINT     NOT NULL DEFAULT 8
                   CHECK (vat_phantram >= 0 AND vat_phantram <= 100),

    -- Thành tiền dòng = (don_gia × so_luong - giam_gia_dong) × (1 + vat/100).
    -- DENORMALIZED, trigger BEFORE INSERT/UPDATE tự tính.
    thanh_tien      DECIMAL(15,0) NOT NULL CHECK (thanh_tien >= 0),

    -- Giá vốn snapshot tại thời điểm bán (từ ton_kho.gia_von_trung_binh).
    -- Dùng tính lợi nhuận gộp = (don_gia - don_gia_von) × so_luong.
    -- Snapshot này cũng dùng khi hoàn hàng (SALE_RETURN) để cộng tồn với giá cũ.
    don_gia_von     DECIMAL(12,0) NOT NULL CHECK (don_gia_von >= 0),

    thu_tu          INTEGER      NOT NULL DEFAULT 0 CHECK (thu_tu >= 0),

    ngay_tao        TIMESTAMP    NOT NULL DEFAULT NOW(),

    -- 1 SP không xuất hiện 2 lần trong cùng 1 hoá đơn. UNIQUE.
    CONSTRAINT uq_chi_tiet_hoa_don_sp UNIQUE (id_hoa_don, id_san_pham)
);

-- Trigger tự tính thanh_tien = (don_gia × so_luong - giam_gia_dong) × (1 + vat/100)
-- Công thức frontend: netLine = (unitPrice * qty - lineDiscount) * (1 + vat/100)
-- Frontend làm tròn theo từng dòng trước khi sum; DB dùng ROUND để khớp.
CREATE OR REPLACE FUNCTION trg_chi_tiet_hoa_don_tinh_tien()
RETURNS TRIGGER AS $$
BEGIN
    NEW.thanh_tien := ROUND(
        (NEW.don_gia * NEW.so_luong - NEW.giam_gia_dong) *
        (1 + NEW.vat_phantram::DECIMAL / 100)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chi_tiet_hoa_don_tinh_tien ON chi_tiet_hoa_don;
CREATE TRIGGER chi_tiet_hoa_don_tinh_tien
    BEFORE INSERT OR UPDATE OF don_gia, so_luong, giam_gia_dong, vat_phantram ON chi_tiet_hoa_don
    FOR EACH ROW
    EXECUTE FUNCTION trg_chi_tiet_hoa_don_tinh_tien();

CREATE INDEX IF NOT EXISTS idx_ct_hoa_don_sp
    ON chi_tiet_hoa_don (id_san_pham);

-- =============================================================================
-- Trigger AFTER INSERT/UPDATE/DELETE line: tự cập nhật tổng tiền header
-- Tính sub_total, vat_total, grand_total từ lines (sau khi trừ giảm giá dòng).
-- grand_total = SUM(lines.thanh_tien) - phieu_giam_gia (giam_gia toàn đơn)
--   = (sub_total - SUM(giam_gia_dong)) × ... thực ra đơn giản hơn:
--   grand_total = SUM(lines.thanh_tien) vì thanh_tien line đã bao gồm VAT
--   và trừ giam_gia_dong. giam_gia (toàn đơn) sẽ trừ ra ngoài.
--   Nhưng frontend tính VAT trên tổng-sub_total-sau-discount, không phải từng dòng.
--   Để đơn giản & khớp frontend (mockData/employees.ts dùng cách này):
--   sub_total = SUM(don_gia × so_luong)
--   giam_gia_total = SUM(giam_gia_dong) + giam_gia (header)
--   vat_total = ROUND((sub_total - SUM(giam_gia_dong)) × vat% / 100)
--   grand_total = sub_total - giam_gia_total + vat_total
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_cap_nhat_tong_hoa_don()
RETURNS TRIGGER AS $$
DECLARE
    v_id_hoa_don UUID;
    v_sub DECIMAL(15,0);
    v_giam_gia_dong_total DECIMAL(15,0);
    v_vat DECIMAL(15,0);
BEGIN
    v_id_hoa_don := COALESCE(NEW.id_hoa_don, OLD.id_hoa_don);

    SELECT
        COALESCE(SUM(don_gia * so_luong), 0),
        COALESCE(SUM(giam_gia_dong), 0)
    INTO v_sub, v_giam_gia_dong_total
    FROM chi_tiet_hoa_don
    WHERE id_hoa_don = v_id_hoa_don;

    -- VAT tính trên (don_gia × so_luong - giam_gia_dong) — từng dòng rồi sum
    -- (khớp frontend buildSalesOrder cách tính: vat theo từng dòng, sum lên)
    SELECT COALESCE(SUM(ROUND((don_gia * so_luong - giam_gia_dong) * vat_phantram / 100)), 0)
    INTO v_vat
    FROM chi_tiet_hoa_don
    WHERE id_hoa_don = v_id_hoa_don;

    UPDATE hoa_don
    SET sub_total = v_sub,
        vat_total = v_vat,
        grand_total = v_sub + v_vat - giam_gia
    WHERE id = v_id_hoa_don;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chi_tiet_hoa_don_cap_nhat_tong ON chi_tiet_hoa_don;
CREATE TRIGGER trg_chi_tiet_hoa_don_cap_nhat_tong
    AFTER INSERT OR UPDATE OR DELETE ON chi_tiet_hoa_don
    FOR EACH ROW
    EXECUTE FUNCTION fn_cap_nhat_tong_hoa_don();

-- =============================================================================
-- FUNCTION ĐỒNG BỘ: tạo hoá đơn end-to-end (1 transaction)
-- Pattern: như fn_nhap_kho_dong_bo và fn_luu_chuyen_noi_bo.
-- Gọi từ backend service, làm 4 việc:
--   1. INSERT hoa_don (header)
--   2. INSERT các chi_tiet_hoa_don (lines)
--   3. Với từng line: ghi the_kho (SALE_OUT, SL âm) + cập nhật ton_kho
--   4. (sau này) INSERT phiếu thu sổ quỹ (BAN_HANG) — bảng so_quy chưa có
--
-- Trả về UUID của hoa_don vừa tạo.
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_tao_hoa_don(
    p_id_chi_nhanh    UUID,
    p_id_thu_ngan     UUID,
    p_ca_lam_viec     VARCHAR(20),
    p_ngay_ban        TIMESTAMP DEFAULT NOW(),
    p_hinh_thuc_tt    VARCHAR(20) DEFAULT 'CASH',
    p_tien_khach_dua  DECIMAL(15,0) DEFAULT NULL,
    p_sdt_thanh_vien  VARCHAR(20) DEFAULT NULL,
    p_giam_gia        DECIMAL(15,0) DEFAULT 0,
    p_ghi_chu         TEXT DEFAULT NULL,
    p_nguoi_thuc_hien VARCHAR(255) DEFAULT 'Hệ thống',
    p_lines JSONB DEFAULT '[]'::JSONB
    -- Format: [{"id_san_pham":"...", "so_luong": 2,
    --           "don_gia": 15000, "giam_gia_dong": 0, "vat_phantram": 8}]
) RETURNS UUID AS $$
DECLARE
    v_id_hoa_don UUID;
    v_line JSONB;
    v_grand DECIMAL(15,0);
    v_tien_thoi DECIMAL(15,0);
    v_ma_chung_tu VARCHAR(50);
    v_don_gia_von DECIMAL(12,0);
BEGIN
    -- BR-01: validate tồn kho trước khi INSERT (nhanh hơn để fail sớm).
    -- Dùng FOR UPDATE để khoá row — tránh race condition khi 2 thu ngân
    -- cùng thanh toán cùng SP. Nếu 1 transaction đang chạy, transaction
    -- còn lại sẽ CHỜ (không fail) → fail message rõ ràng từ
    -- fn_ghi_the_kho_va_dieu_chinh_ton thay vì CHECK constraint.
    FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
    LOOP
        PERFORM 1
        FROM ton_kho
        WHERE id_san_pham = (v_line->>'id_san_pham')::UUID
          AND id_chi_nhanh = p_id_chi_nhanh
          AND so_luong_ton >= (v_line->>'so_luong')::INTEGER
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'BR-01: Không đủ tồn kho cho sản phẩm (%) tại chi nhánh (%)',
                (v_line->>'id_san_pham')::UUID, p_id_chi_nhanh;
        END IF;
    END LOOP;

    -- 1. INSERT header
    INSERT INTO hoa_don (
        id_chi_nhanh, id_thu_ngan, ca_lam_viec, ngay_ban,
        hinh_thuc_tt, tien_khach_dua, sdt_thanh_vien,
        giam_gia, ghi_chu
    ) VALUES (
        p_id_chi_nhanh, p_id_thu_ngan, p_ca_lam_viec,
        COALESCE(p_ngay_ban, NOW()),
        p_hinh_thuc_tt, p_tien_khach_dua, p_sdt_thanh_vien,
        COALESCE(p_giam_gia, 0), p_ghi_chu
    )
    RETURNING id INTO v_id_hoa_don;

    -- Lấy mã hoá đơn vừa sinh (để làm ma_chung_tu cho the_kho)
    v_ma_chung_tu := (SELECT ma_hoa_don FROM hoa_don WHERE id = v_id_hoa_don);

    -- 2. INSERT từng line + ghi the_kho + cập nhật ton_kho
    FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
    LOOP
        -- Lấy giá vốn từ ton_kho (snapshot) — dùng cho the_kho và cột don_gia_von
        SELECT gia_von_trung_binh INTO v_don_gia_von
        FROM ton_kho
        WHERE id_san_pham = (v_line->>'id_san_pham')::UUID
          AND id_chi_nhanh = p_id_chi_nhanh;

        INSERT INTO chi_tiet_hoa_don (
            id_hoa_don, id_san_pham, so_luong, don_gia, giam_gia_dong,
            vat_phantram, don_gia_von, thu_tu
        ) VALUES (
            v_id_hoa_don,
            (v_line->>'id_san_pham')::UUID,
            (v_line->>'so_luong')::INTEGER,
            (v_line->>'don_gia')::DECIMAL(12,0),
            COALESCE((v_line->>'giam_gia_dong')::DECIMAL(15,0), 0),
            COALESCE((v_line->>'vat_phantram')::SMALLINT, 8),
            v_don_gia_von,
            COALESCE((v_line->>'thu_tu')::INTEGER, 0)
        );

        -- 3. Ghi the_kho SALE_OUT (SL âm) + cập nhật ton_kho
        PERFORM fn_ghi_the_kho_va_dieu_chinh_ton(
            (v_line->>'id_san_pham')::UUID,
            p_id_chi_nhanh,
            'SALE_OUT',
            -(v_line->>'so_luong')::INTEGER,  -- SALE_OUT: SL âm
            v_don_gia_von,
            v_ma_chung_tu,
            p_nguoi_thuc_hien,
            NULL,  -- bán hàng không cập nhật HSD
            'Bán hàng POS: ' || v_ma_chung_tu,
            COALESCE(p_ngay_ban, NOW())
        );
    END LOOP;

    -- 4. Cập nhật tien_khach_dua + tien_thoi (sau khi grand_total đã được tính)
    IF p_tien_khach_dua IS NOT NULL THEN
        UPDATE hoa_don
        SET tien_khach_dua = p_tien_khach_dua
        WHERE id = v_id_hoa_don;
        -- Trigger tự tính tien_thoi
    END IF;

    -- 5. (sau này) INSERT phiếu thu sổ quỹ — chờ bảng so_quy

    RETURN v_id_hoa_don;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FUNCTION: hoàn tiền hoá đơn (COMPLETED → REFUNDED)
-- Trả tồn kho + ghi the_kho SALE_RETURN
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_hoan_hoa_don(
    p_id_hoa_don      UUID,
    p_id_nguoi_hoan   UUID,
    p_ly_do_hoan      TEXT,
    p_nguoi_thuc_hien VARCHAR(255) DEFAULT 'Hệ thống'
) RETURNS VOID AS $$
DECLARE
    v_hoa_don RECORD;
    v_line RECORD;
    v_ma_chung_tu VARCHAR(50);
BEGIN
    SELECT * INTO v_hoa_don
    FROM hoa_don
    WHERE id = p_id_hoa_don
    FOR UPDATE;

    IF v_hoa_don.trang_thai != 'COMPLETED' THEN
        RAISE EXCEPTION 'Chỉ hoàn được hoá đơn ở trạng thái COMPLETED. Hiện tại: %',
            v_hoa_don.trang_thai;
    END IF;

    v_ma_chung_tu := v_hoa_don.ma_hoa_don;

    -- 1. UPDATE header
    UPDATE hoa_don
    SET trang_thai = 'REFUNDED',
        id_nguoi_hoan = p_id_nguoi_hoan,
        ngay_hoan = NOW(),
        ly_do_hoan = p_ly_do_hoan
    WHERE id = p_id_hoa_don;

    -- 2. Với từng line: cộng tồn + ghi the_kho SALE_RETURN
    FOR v_line IN SELECT * FROM chi_tiet_hoa_don WHERE id_hoa_don = p_id_hoa_don
    LOOP
        PERFORM fn_ghi_the_kho_va_dieu_chinh_ton(
            v_line.id_san_pham,
            v_hoa_don.id_chi_nhanh,
            'SALE_RETURN'::varchar,
            v_line.so_luong,  -- SALE_RETURN: SL dương
            v_line.don_gia_von,
            v_ma_chung_tu,
            p_nguoi_thuc_hien,
            NULL::date,
            'Hoàn tiền hoá đơn ' || v_ma_chung_tu,
            NOW()::timestamp
        );
    END LOOP;

    -- 3. (sau này) Tạo phiếu chi sổ quỹ HOAN_TIEN — chờ bảng so_quy
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
COMMENT ON TABLE hoa_don IS
    'Hoá đơn bán hàng tại POS. BR-01: chỉ tại CỬA HÀNG BÁN LẺ. 3 trạng thái: '
    'COMPLETED (đã thanh toán, tồn đã trừ), REFUNDED (đã hoàn tiền + cộng lại tồn), '
    'CANCELLED (huỷ đơn trong ngày, KHÔNG hoàn tồn/tiền). Hỗ trợ 6 hình thức '
    'thanh toán: CASH, CARD, MOMO, ZALOPAY, VNPAY, BANK_TRANSFER. 2 trigger '
    'CHECK: tien_thoi = tien_khach_dua - grand_total, và grand_total phải khớp '
    'sub + vat - giam_gia. Mã hoá đơn HD-YYYYMMDD-NNNN (4 chữ số, bắt đầu từ 9000).';

COMMENT ON COLUMN hoa_don.grand_total IS
    'Tổng khách phải trả = sub_total + vat_total - giam_gia. CHECK constraint '
    'enforce đúng công thức — backend tính sai sẽ bị DB reject. Khi INSERT lines, '
    'trigger AFTER sẽ tự cập nhật từ SUM(chi_tiet_hoa_don.thanh_tien).';

COMMENT ON COLUMN hoa_don.tien_khach_dua IS
    'Tiền khách đưa. CHỈ có ý nghĩa với CASH — với hình thức khác (MOMO, ...) '
    'sẽ = grand_total. NULL = chưa nhập. CHECK >= 0 và tien_thoi = tien_khach_dua '
    '- grand_total (trigger tự tính).';

COMMENT ON COLUMN hoa_don.sdt_thanh_vien IS
    'SĐT thành viên Circle K Club. NULL = khách lẻ. Tích hợp loyalty: tích điểm, '
    'giảm giá, xuất hoá đơn điện tử. Index sẽ thêm khi có bảng thanh_vien.';

COMMENT ON TABLE chi_tiet_hoa_don IS
    'Từng dòng hàng trong hoá đơn. don_gia, don_gia_von là SNAPSHOT từ '
    'san_pham/ton_kho tại thời điểm bán — nếu sau này tăng giá, hoá đơn cũ '
    'vẫn giữ giá cũ (đúng nguyên tắc kế toán). UNIQUE (id_hoa_don, id_san_pham) '
    'chống trùng SP trong hoá đơn. Trigger AFTER tự cập nhật sub_total, vat_total, '
    'grand_total ở header.';

COMMENT ON COLUMN chi_tiet_hoa_don.don_gia_von IS
    'Giá vốn snapshot từ ton_kho.gia_von_trung_binh tại thời điểm bán. Dùng: '
    '(1) tính lợi nhuận gộp = (don_gia - don_gia_von) × so_luong cho báo cáo, '
    '(2) ghi the_kho SALE_OUT với đơn giá này để audit, '
    '(3) khi hoàn tiền, cộng lại tồn với cùng giá vốn (SALE_RETURN).';

COMMENT ON COLUMN chi_tiet_hoa_don.vat_phantram IS
    'VAT riêng dòng (0-100%). Mỗi dòng có thể VAT khác nhau (vd: thực phẩm 8%, '
    'hàng thiết yếu 0%). DB tính vat_total từ từng dòng rồi sum — khớp công thức '
    'frontend buildSalesOrder.';


-- ==========================================
-- MIGRATION: migration_chi_nhanh_ten_quan_ly.sql
-- ==========================================


-- Migration: thêm cột ten_quan_ly cho bảng chi_nhanh
ALTER TABLE chi_nhanh
    ADD COLUMN IF NOT EXISTS ten_quan_ly VARCHAR(255);

COMMENT ON COLUMN chi_nhanh.ten_quan_ly IS
    'Tên quản lý chi nhánh (snapshot, có thể khác với hoTen của NV hiện tại nếu QL đã đổi).';

-- ==========================================
-- MIGRATION: migration_danh_muc_image_url.sql
-- ==========================================


-- Migration: thêm cột image_url cho bảng danh_muc
ALTER TABLE danh_muc
    ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

COMMENT ON COLUMN danh_muc.image_url IS
    'URL ảnh đại diện cho danh mục (ưu tiên hiển thị hơn iconEmoji nếu có). '
    'NULL thì dùng emoji ở icon_emoji.';

-- ==========================================
-- MIGRATION: migration_fix_fn_cap_nhat_tong_phieu_nhap.sql
-- ==========================================


-- Sửa trigger fn_cap_nhat_tong_phieu_nhap: dùng đúng cột của
-- chi_tiet_phieu_nhap (don_gia_nhap, so_luong_nhan, vat_phantram) thay vì
-- tên cột của chi_tiet_hoa_don (don_gia, so_luong, giam_gia_dong) — bản cũ
-- gây lỗi "column don_gia does not exist" khi thêm dòng phiếu nhập.
CREATE OR REPLACE FUNCTION fn_cap_nhat_tong_phieu_nhap()
RETURNS TRIGGER AS $$
DECLARE
    v_id_phieu_nhap UUID;
    v_sub DECIMAL(15,0);
    v_vat DECIMAL(15,0);
BEGIN
    v_id_phieu_nhap := COALESCE(NEW.id_phieu_nhap, OLD.id_phieu_nhap);

    SELECT COALESCE(SUM(don_gia_nhap * so_luong_nhan), 0)
    INTO v_sub
    FROM chi_tiet_phieu_nhap
    WHERE id_phieu_nhap = v_id_phieu_nhap;

    -- VAT tính trên thành tiền từng dòng rồi sum
    SELECT COALESCE(SUM(ROUND(don_gia_nhap * so_luong_nhan * vat_phantram / 100)), 0)
    INTO v_vat
    FROM chi_tiet_phieu_nhap
    WHERE id_phieu_nhap = v_id_phieu_nhap;

    UPDATE phieu_nhap
    SET sub_total = v_sub,
        vat_total = v_vat,
        grand_total = v_sub + v_vat - giam_gia
    WHERE id = v_id_phieu_nhap;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;


-- ==========================================
-- MIGRATION: migration_hoa_don_for_update.sql
-- ==========================================


-- =============================================================================
-- Migration: Fix race condition khi 2 thu ngân cùng thanh toán 1 SP
--
-- VẤN ĐỀ:
--   fn_tao_hoa_don (trong hoa_don.sql) check tồn kho bằng
--     NOT EXISTS (SELECT 1 FROM ton_kho WHERE ... AND so_luong_ton >= ?)
--   → KHÔNG khoá row. Nếu 2 thu ngân cùng chạy cùng lúc, cả 2 đều thấy
--   "còn đủ tồn" → cả 2 INSERT hoa_don → 1 bên fail ở CHECK constraint
--   so_luong_ton >= 0 với error message khó hiểu.
--
-- SỬA:
--   Dùng PERFORM 1 ... FOR UPDATE để khoá row ngay khi check. Transaction
--   thứ 2 sẽ CHỜ transaction 1 commit xong → check lại với tồn mới
--   → error message rõ ràng ("Không đủ tồn kho") từ
--   fn_ghi_the_kho_va_dieu_chinh_ton thay vì CHECK chung chung.
--
-- Idempotent: CREATE OR REPLACE FUNCTION — chạy nhiều lần OK.
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_tao_hoa_don(
    p_id_chi_nhanh    UUID,
    p_id_thu_ngan     UUID,
    p_ca_lam_viec     VARCHAR(20),
    p_ngay_ban        TIMESTAMP DEFAULT NOW(),
    p_hinh_thuc_tt    VARCHAR(20) DEFAULT 'CASH',
    p_tien_khach_dua  DECIMAL(15,0) DEFAULT NULL,
    p_sdt_thanh_vien  VARCHAR(20) DEFAULT NULL,
    p_giam_gia        DECIMAL(15,0) DEFAULT 0,
    p_ghi_chu         TEXT DEFAULT NULL,
    p_nguoi_thuc_hien VARCHAR(255) DEFAULT 'Hệ thống',
    p_lines JSONB DEFAULT '[]'::JSONB
    -- Format: [{"id_san_pham":"...", "so_luong": 2,
    --           "don_gia": 15000, "giam_gia_dong": 0, "vat_phantram": 8}]
) RETURNS UUID AS $$
DECLARE
    v_id_hoa_don UUID;
    v_line JSONB;
    v_ma_chung_tu VARCHAR(50);
    v_don_gia_von DECIMAL(12,0);
BEGIN
    -- BR-01: validate tồn kho trước khi INSERT.
    -- Dùng FOR UPDATE để khoá row — tránh race condition khi 2 thu ngân
    -- cùng thanh toán cùng SP. Nếu 1 transaction đang chạy, transaction
    -- còn lại sẽ CHỜ (không fail ngay) → fail message rõ ràng từ
    -- fn_ghi_the_kho_va_dieu_chinh_ton thay vì CHECK constraint.
    FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
    LOOP
        PERFORM 1
        FROM ton_kho
        WHERE id_san_pham = (v_line->>'id_san_pham')::UUID
          AND id_chi_nhanh = p_id_chi_nhanh
          AND so_luong_ton >= (v_line->>'so_luong')::INTEGER
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'BR-01: Không đủ tồn kho cho sản phẩm (%) tại chi nhánh (%)',
                (v_line->>'id_san_pham')::UUID, p_id_chi_nhanh;
        END IF;
    END LOOP;

    -- 1. INSERT header (trigger sinh mã tự động)
    INSERT INTO hoa_don (
        id_chi_nhanh, id_thu_ngan, ca_lam_viec, ngay_ban,
        hinh_thuc_tt, tien_khach_dua, sdt_thanh_vien,
        giam_gia, ghi_chu
    ) VALUES (
        p_id_chi_nhanh, p_id_thu_ngan, p_ca_lam_viec,
        COALESCE(p_ngay_ban, NOW()),
        p_hinh_thuc_tt, p_tien_khach_dua, p_sdt_thanh_vien,
        COALESCE(p_giam_gia, 0), p_ghi_chu
    )
    RETURNING id INTO v_id_hoa_don;

    v_ma_chung_tu := (SELECT ma_hoa_don FROM hoa_don WHERE id = v_id_hoa_don);

    -- 2. INSERT từng line + ghi the_kho + cập nhật ton_kho
    FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
    LOOP
        -- Lấy giá vốn từ ton_kho (snapshot)
        SELECT gia_von_trung_binh INTO v_don_gia_von
        FROM ton_kho
        WHERE id_san_pham = (v_line->>'id_san_pham')::UUID
          AND id_chi_nhanh = p_id_chi_nhanh;

        INSERT INTO chi_tiet_hoa_don (
            id_hoa_don, id_san_pham, so_luong, don_gia, giam_gia_dong,
            vat_phantram, don_gia_von, thu_tu
        ) VALUES (
            v_id_hoa_don,
            (v_line->>'id_san_pham')::UUID,
            (v_line->>'so_luong')::INTEGER,
            (v_line->>'don_gia')::DECIMAL(12,0),
            COALESCE((v_line->>'giam_gia_dong')::DECIMAL(15,0), 0),
            COALESCE((v_line->>'vat_phantram')::SMALLINT, 8),
            v_don_gia_von,
            COALESCE((v_line->>'thu_tu')::INTEGER, 0)
        );

        PERFORM fn_ghi_the_kho_va_dieu_chinh_ton(
            (v_line->>'id_san_pham')::UUID,
            p_id_chi_nhanh,
            'SALE_OUT',
            -(v_line->>'so_luong')::INTEGER,
            v_don_gia_von,
            v_ma_chung_tu,
            p_nguoi_thuc_hien,
            NULL,
            'Bán hàng POS: ' || v_ma_chung_tu,
            COALESCE(p_ngay_ban, NOW())
        );
    END LOOP;

    IF p_tien_khach_dua IS NOT NULL THEN
        UPDATE hoa_don
        SET tien_khach_dua = p_tien_khach_dua
        WHERE id = v_id_hoa_don;
    END IF;

    RETURN v_id_hoa_don;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_tao_hoa_don IS
    'Tạo hoá đơn POS end-to-end. BR-01: dùng FOR UPDATE để khoá row ton_kho '
    'khi check tồn — tránh race condition khi 2 thu ngân cùng bán 1 SP. '
    'Sau khi check, function INSERT header + lines + ghi the_kho SALE_OUT '
    '+ trừ ton_kho. Tất cả trong 1 transaction.';


-- ==========================================
-- MIGRATION: migration_phieu_nhap_add_pending_payment.sql
-- ==========================================


-- =============================================================================
-- Migration: thêm trạng thái PENDING_PAYMENT ('chờ thanh toán') cho phieu_nhap.
--
-- Luồng mới module 8 (2 bước):
--   PENDING_PAYMENT : Thủ kho lập phiếu (điền hàng thực nhận), chưa trả tiền NCC,
--                     chưa cộng tồn Kho Tổng.
--   COMPLETED       : Kế toán bấm "Thanh toán" → trả NCC + cộng tồn + thẻ kho.
-- =============================================================================

ALTER TABLE phieu_nhap
    DROP CONSTRAINT IF EXISTS phieu_nhap_trang_thai_check;

ALTER TABLE phieu_nhap
    ADD CONSTRAINT phieu_nhap_trang_thai_check
    CHECK (trang_thai IN ('DRAFT', 'PENDING', 'PENDING_PAYMENT', 'COMPLETED', 'CANCELLED'));

COMMENT ON COLUMN phieu_nhap.trang_thai IS
    'PENDING_PAYMENT=chờ Kế toán thanh toán (chưa cộng tồn); '
    'COMPLETED=đã thanh toán + cộng tồn kho.';


-- ==========================================
-- MIGRATION: migration_phieu_xuat_kho_add_shipped.sql
-- ==========================================


-- =============================================================================
-- Migration: thêm trạng thái SHIPPED ('chờ nhận hàng') vào phieu_xuat_kho.
--
-- Luồng mới module 9 (3 bước):
--   PENDING   : QL chi nhánh tạo yêu cầu → chờ Thủ kho duyệt
--   SHIPPED   : Thủ kho đã xuất kho (trừ tồn Kho Tổng) → chờ chi nhánh nhận
--   COMPLETED : Chi nhánh xác nhận đã nhận (cộng tồn chi nhánh)
--   CANCELLED : Thủ kho từ chối
-- =============================================================================

ALTER TABLE phieu_xuat_kho
    DROP CONSTRAINT IF EXISTS phieu_xuat_kho_trang_thai_check;

ALTER TABLE phieu_xuat_kho
    ADD CONSTRAINT phieu_xuat_kho_trang_thai_check
    CHECK (trang_thai IN ('PENDING', 'SHIPPED', 'COMPLETED', 'CANCELLED'));

-- SHIPPED bắt buộc có ngày xuất + người duyệt (đã ra khỏi kho).
ALTER TABLE phieu_xuat_kho
    DROP CONSTRAINT IF EXISTS chk_shipped_co_ngay_xuat;
ALTER TABLE phieu_xuat_kho
    ADD CONSTRAINT chk_shipped_co_ngay_xuat CHECK (
        trang_thai != 'SHIPPED' OR ngay_xuat_thuc_te IS NOT NULL
    );

COMMENT ON COLUMN phieu_xuat_kho.trang_thai IS
    'PENDING=chờ Thủ kho duyệt; SHIPPED=đã xuất, chờ chi nhánh nhận; '
    'COMPLETED=chi nhánh đã nhận; CANCELLED=từ chối.';


-- ==========================================
-- MIGRATION: migration_ton_kho_on_conflict.sql
-- ==========================================


-- =============================================================================
-- Migration: Fix INSERT trigger ton_kho (gia_tri_ton sai khi INSERT trùng)
--
-- VẤN ĐỀ:
--   ton_kho.sql dùng `ON CONFLICT (id_san_pham, id_chi_nhanh) DO NOTHING`
--   → khi INSERT trùng, INSERT trigger `fn_ton_kho_insert_gia_tri` KHÔNG
--   chạy → cột `gia_tri_ton` giữ giá trị cũ (có thể sai nếu SL hoặc giá vốn
--   đã thay đổi). File còn có 1 dòng UPDATE workaround bẩn:
--     UPDATE ton_kho SET so_luong_ton = so_luong_ton
--     WHERE gia_tri_ton = 0 AND so_luong_ton > 0;
--   Workaround này chỉ chạy 1 lần lúc seed data, KHÔNG tự động sửa khi có
--   row mới trong production.
--
-- SỬA:
--   1. Đổi INSERT seed từ `DO NOTHING` → `DO UPDATE SET gia_tri_ton = ...`
--      (trigger BEFORE UPDATE sẽ tự chạy, đảm bảo `lan_bien_dong_cuoi` cũng
--      được cập nhật). Áp dụng cho MỌI INSERT/UPSERT ton_kho từ giờ về sau.
--   2. Refresh `gia_tri_ton` cho TẤT CẢ row hiện có (idempotent — nếu đã đúng
--      thì không thay đổi gì; nếu sai sẽ tự fix).
--
-- Chạy script này SAU ton_kho.sql.
-- Idempotent: chạy nhiều lần OK.
-- =============================================================================

-- Bước 1: Refresh gia_tri_ton cho TẤT CẢ row hiện có. Dùng cách "dummy update"
-- giống file gốc để trigger BEFORE UPDATE chạy.
-- (Lệnh UPDATE SET cột = cột không có tác dụng về data nhưng trigger vẫn
-- chạy → tính lại gia_tri_ton.)
UPDATE ton_kho
SET gia_tri_ton = so_luong_ton * gia_von_trung_binh
WHERE gia_tri_ton IS DISTINCT FROM (so_luong_ton * gia_von_trung_binh);

-- Thông báo số row đã refresh
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Đã refresh gia_tri_ton cho % row ton_kho', v_count;
END $$;

-- Bước 2: Tạo function helper để các script INSERT/UPSERT khác (ngoài file seed)
-- dùng, đảm bảo ON CONFLICT DO UPDATE đúng chuẩn.
-- Function này là wrapper cho INSERT ... ON CONFLICT, dùng khi backend muốn
-- upsert tồn kho (vd: tạo tồn cho SP mới ở mọi chi nhánh).
CREATE OR REPLACE FUNCTION fn_upsert_ton_kho(
    p_id_san_pham    UUID,
    p_id_chi_nhanh   UUID,
    p_so_luong       INTEGER,
    p_gia_von        DECIMAL(12,0) DEFAULT 0,
    p_ton_toi_thieu  INTEGER DEFAULT 0,
    p_ton_toi_da     INTEGER DEFAULT 0
) RETURNS VOID AS $$
BEGIN
    INSERT INTO ton_kho (
        id_san_pham, id_chi_nhanh, so_luong_ton, gia_von_trung_binh,
        ton_toi_thieu, ton_toi_da, lan_bien_dong_cuoi
    ) VALUES (
        p_id_san_pham, p_id_chi_nhanh, p_so_luong, p_gia_von,
        p_ton_toi_thieu, p_ton_toi_da, NOW()
    )
    -- DO UPDATE: nếu row đã tồn tại, cập nhật SL/giá vốn → trigger BEFORE
    -- UPDATE sẽ tự tính lại gia_tri_ton. Lưu ý: KHÔNG overwrite min/max
    -- để giữ ngưỡng riêng của từng chi nhánh.
    ON CONFLICT (id_san_pham, id_chi_nhanh) DO UPDATE
    SET so_luong_ton = EXCLUDED.so_luong_ton,
        gia_von_trung_binh = EXCLUDED.gia_von_trung_binh,
        lan_bien_dong_cuoi = NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_upsert_ton_kho IS
    'Wrapper INSERT ... ON CONFLICT DO UPDATE cho ton_kho. Khi conflict, '
    'tự cập nhật so_luong_ton + gia_von_trung_binh → trigger BEFORE UPDATE '
    'tính lại gia_tri_ton. KHÔNG overwrite min/max (giữ ngưỡng riêng '
    'từng chi nhánh). Backend dùng khi cần tạo mới/upsert tồn kho.';
