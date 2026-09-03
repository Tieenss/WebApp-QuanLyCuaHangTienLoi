-- Migration: thêm cột ten_quan_ly cho bảng chi_nhanh
ALTER TABLE chi_nhanh
    ADD COLUMN IF NOT EXISTS ten_quan_ly VARCHAR(255);

COMMENT ON COLUMN chi_nhanh.ten_quan_ly IS
    'Tên quản lý chi nhánh (snapshot, có thể khác với hoTen của NV hiện tại nếu QL đã đổi).';