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
INSERT INTO tai_khoan (
    id_nhan_vien, ten_dang_nhap, mat_khau_hash, hash_algorithm,
    trang_thai, last_login_at
)
SELECT
    id,
    ten_dang_nhap,
    mat_khau,
    'BCRYPT_12',  -- default algorithm
    -- Mapping trạng thái: NV ACTIVE → TK ACTIVE; NV INACTIVE → TK DISABLED
    CASE WHEN dang_hoat_dong = TRUE THEN 'ACTIVE' ELSE 'DISABLED' END,
    -- Random last_login_at trong 7 ngày qua (cho dữ liệu mẫu)
    NOW() - (random() * INTERVAL '7 days')
FROM nhan_vien
WHERE ten_dang_nhap IS NOT NULL  -- bỏ qua NV không có tài khoản (nếu có)
ON CONFLICT (id_nhan_vien) DO NOTHING;

-- =============================================================================
-- BƯỚC 3: Xoá 2 cột auth khỏi nhan_vien
-- Lưu ý: cần CASCADE nếu có VIEW/constraint phụ thuộc vào cột này.
-- =============================================================================
ALTER TABLE nhan_vien DROP CONSTRAINT IF EXISTS nhan_vien_ten_dang_nhap_key;
ALTER TABLE nhan_vien DROP CONSTRAINT IF EXISTS nhan_vien_mat_khau_check;

ALTER TABLE nhan_vien
    DROP COLUMN IF EXISTS ten_dang_nhap,
    DROP COLUMN IF EXISTS mat_khau;

-- =============================================================================
-- Cập nhật comment cho nhan_vien (loại bỏ phần liên quan đến auth)
-- =============================================================================
COMMENT ON TABLE nhan_vien IS
    'Thông tin nhân sự (HR). KHÔNG còn chứa thông tin đăng nhập — đã tách '
    'sang bảng `tai_khoan` để tách biệt dữ liệu nhạy cảm. Mỗi nhân viên có '
    'nhiều nhất 1 tài khoản (1-1) — xem bảng `tai_khoan`.';

-- =============================================================================
-- Dữ liệu mẫu cho 2 tài khoản có trạng thái đặc biệt (test UI unlock)
-- =============================================================================
-- Khoá tạm 1 tài khoản (test case "nhập sai 5 lần")
UPDATE tai_khoan
SET trang_thai = 'LOCKED',
    locked_until = NOW() + INTERVAL '15 minutes',
    failed_login_count = 5,
    ly_do_khoa = 'Nhập sai mật khẩu 5 lần liên tiếp'
WHERE ten_dang_nhap = 'thungan_bv_2';

-- Đánh dấu 1 tài khoản DISABLED (NV đã nghỉ việc)
UPDATE tai_khoan
SET trang_thai = 'DISABLED',
    ly_do_khoa = 'Nhân viên nghỉ việc từ 2025-12-01'
WHERE ten_dang_nhap = 'thukho';

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
