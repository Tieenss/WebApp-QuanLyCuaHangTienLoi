-- Sửa ràng buộc cũ: các vai trò không phải Thu ngân bỏ qua tầng xác nhận giờ,
-- nên không thể bắt buộc id_nguoi_xac_nhan cho mọi trạng thái DA_XAC_NHAN.
-- Việc kiểm tra vai trò và chuyển trạng thái được thực hiện bởi API backend.
ALTER TABLE bang_luong
    DROP CONSTRAINT IF EXISTS chk_trang_thai_xac_nhan;

ALTER TABLE bang_luong
    ADD CONSTRAINT chk_bang_luong_thanh_toan_co_nguoi_duyet
    CHECK (trang_thai <> 'DA_THANH_TOAN' OR id_nguoi_duyet_chi IS NOT NULL);
