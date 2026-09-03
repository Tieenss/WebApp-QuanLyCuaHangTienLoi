-- Migration: thêm cột image_url cho bảng danh_muc
ALTER TABLE danh_muc
    ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

COMMENT ON COLUMN danh_muc.image_url IS
    'URL ảnh đại diện cho danh mục (ưu tiên hiển thị hơn iconEmoji nếu có). '
    'NULL thì dùng emoji ở icon_emoji.';