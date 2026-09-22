-- Các vai trò không phải Thu ngân bỏ qua tầng xác nhận giờ. Chuẩn hóa các
-- bảng lương cũ vốn được tạo ở CHO_XAC_NHAN theo logic trước đây.
UPDATE bang_luong bl
SET trang_thai = 'DA_XAC_NHAN'
FROM nhan_vien nv
WHERE nv.id = bl.id_nhan_vien
  AND nv.vai_tro <> 'THU_NGAN'
  AND bl.trang_thai = 'CHO_XAC_NHAN';

-- Mỗi bảng lương chỉ có một phiếu CHI lương. Chặn request đồng thời tạo trùng.
CREATE UNIQUE INDEX IF NOT EXISTS uq_so_quy_chi_luong_bang_luong
    ON so_quy (ma_chung_tu_lien_quan, direction, hang_muc)
    WHERE direction = 'PAYMENT'
      AND hang_muc = 'TRA_LUONG'
      AND ma_chung_tu_lien_quan IS NOT NULL;
