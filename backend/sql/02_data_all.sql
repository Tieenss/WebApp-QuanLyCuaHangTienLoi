-- ==========================================
-- FILE: chi_nhanh.sql
-- ==========================================


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


-- ==========================================
-- FILE: nhan_vien.sql
-- ==========================================


-- Dữ liệu mẫu — đồng bộ với `frontend/src/mockData/accounts.ts` (9 user demo)
-- Mật khẩu dạng PLAIN TEXT chỉ để demo, hash thật sẽ do backend tạo khi INSERT.
-- Trong production: KHÔNG được lưu plain password. Script này chỉ dùng
-- để khởi tạo DB dev, sau khi login thật phải đổi mật khẩu ngay.
-- =============================================================================
INSERT INTO nhan_vien
    (id, id_chi_nhanh, ma_nhan_vien, ho_ten,
     so_dien_thoai, email, vai_tro, vi_tri, loai_hop_dong, ca_mac_dinh,
     luong_theo_gio, luong_cung, so_tai_khoan, ten_ngan_hang, ngay_vao_lam,
     dang_hoat_dong)
VALUES
    -- Quản trị + Kế toán (trụ sở, NULL chi nhánh)
    ('b2c3d4e5-0001-0000-0000-000000000001', NULL, 'NV-0001',
     'Nguyễn Minh Tuấn', '0901000001', 'admin@circlek.vn',
     'ADMIN', 'Giám đốc vận hành', 'FULL_TIME', 'MORNING',
     0, 45000000, '0123456789', 'Vietcombank', '2018-01-15', TRUE),

    ('b2c3d4e5-0001-0000-0000-000000000002', NULL, 'NV-0002',
     'Phạm Thị Hồng', '0901000002', 'ketoan@circlek.vn',
     'KE_TOAN', 'Kế toán trưởng', 'FULL_TIME', 'MORNING',
     0, 32000000, '0123456790', 'ACB', '2019-03-20', TRUE),

    -- Thủ kho (Kho Tổng)
    ('b2c3d4e5-0001-0000-0000-000000000003',
     'a1b2c3d4-0001-0000-0000-000000000001', 'NV-0003',
     'Phạm Quốc Hưng', '0901000003', 'thukho@circlek.vn',
     'THU_KHO', 'Trưởng phòng kho', 'FULL_TIME', 'MORNING',
     0, 28000000, '0123456791', 'Techcombank', '2019-03-15', TRUE),

    -- Quản lý chi nhánh
    ('b2c3d4e5-0001-0000-0000-000000000004',
     'a1b2c3d4-0001-0000-0000-000000000101', 'NV-0004',
     'Trần Văn Anh', '0901000004', 'quanly.bvien@circlek.vn',
     'QUAN_LY', 'Quản lý cửa hàng', 'FULL_TIME', 'MORNING',
     0, 22000000, '0123456792', 'MB Bank', '2020-06-01', TRUE),

    ('b2c3d4e5-0001-0000-0000-000000000005',
     'a1b2c3d4-0001-0000-0000-000000000102', 'NV-0005',
     'Bùi Xuân Thành', '0901000005', 'quanly.ntminhkhai@circlek.vn',
     'QUAN_LY', 'Quản lý cửa hàng', 'FULL_TIME', 'AFTERNOON',
     0, 21000000, '0123456793', 'MB Bank', '2020-11-20', TRUE),

    -- Thu ngân (3 ca khác nhau)
    ('b2c3d4e5-0001-0000-0000-000000000006',
     'a1b2c3d4-0001-0000-0000-000000000101', 'NV-0006',
     'Lê Thị Mai', '0901000006', 'mai.le@circlek.vn',
     'THU_NGAN', 'Nhân viên bán hàng', 'FULL_TIME', 'MORNING',
     0, 14000000, '0123456794', 'VPBank', '2021-02-15', TRUE),

    ('b2c3d4e5-0001-0000-0000-000000000007',
     'a1b2c3d4-0001-0000-0000-000000000101', 'NV-0007',
     'Vũ Hoàng Giang', '0901000007', 'giang.vu@circlek.vn',
     'THU_NGAN', 'Nhân viên bán hàng', 'FULL_TIME', 'AFTERNOON',
     0, 14000000, '0123456795', 'VPBank', '2021-05-10', TRUE),

    ('b2c3d4e5-0001-0000-0000-000000000008',
     'a1b2c3d4-0001-0000-0000-000000000102', 'NV-0008',
     'Đinh Quang Hải', '0901000008', 'hai.dinh@circlek.vn',
     'THU_NGAN', 'Nhân viên bán hàng ca đêm', 'PART_TIME', 'NIGHT',
     28000, 0, '0123456796', 'Techcombank', '2022-08-01', TRUE),

    -- Thu ngân của chi nhánh khác
    ('b2c3d4e5-0001-0000-0000-000000000009',
     'a1b2c3d4-0001-0000-0000-000000000201', 'NV-0009',
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


-- ==========================================
-- FILE: tai_khoan.sql
-- ==========================================


-- Dữ liệu mẫu (9 tài khoản ứng với 9 nhân viên demo)
-- =============================================================================
INSERT INTO tai_khoan (
    id_nhan_vien, ten_dang_nhap, mat_khau_hash, hash_algorithm,
    trang_thai, last_login_at, ly_do_khoa
) VALUES
    ('b2c3d4e5-0001-0000-0000-000000000001', 'admin', '$2a$10$DEMO_BCRYPT_HASH_admin_change_in_prod', 'BCRYPT_12', 'ACTIVE', NULL, NULL),
    ('b2c3d4e5-0001-0000-0000-000000000002', 'ketoan', '$2a$10$DEMO_BCRYPT_HASH_ketoan_change_in_prod', 'BCRYPT_12', 'ACTIVE', NULL, NULL),
    ('b2c3d4e5-0001-0000-0000-000000000003', 'thukho', '$2a$10$DEMO_BCRYPT_HASH_thukho_change_in_prod', 'BCRYPT_12', 'ACTIVE', NULL, NULL),
    ('b2c3d4e5-0001-0000-0000-000000000004', 'quanly_bv', '$2a$10$DEMO_BCRYPT_HASH_quanly_bv_change_in_prod', 'BCRYPT_12', 'ACTIVE', NULL, NULL),
    ('b2c3d4e5-0001-0000-0000-000000000005', 'quanly_ntmk', '$2a$10$DEMO_BCRYPT_HASH_quanly_ntmk_change_in_prod', 'BCRYPT_12', 'ACTIVE', NULL, NULL),
    ('b2c3d4e5-0001-0000-0000-000000000006', 'thungan1_bv', '$2a$10$DEMO_BCRYPT_HASH_thungan1_bv_change_in_prod', 'BCRYPT_12', 'ACTIVE', NULL, NULL),
    ('b2c3d4e5-0001-0000-0000-000000000007', 'thungan2_bv', '$2a$10$DEMO_BCRYPT_HASH_thungan2_bv_change_in_prod', 'BCRYPT_12', 'ACTIVE', NULL, NULL),
    ('b2c3d4e5-0001-0000-0000-000000000008', 'thungan1_ntmk', '$2a$10$DEMO_BCRYPT_HASH_thungan1_ntmk_change_in_prod', 'BCRYPT_12', 'ACTIVE', NULL, NULL),
    ('b2c3d4e5-0001-0000-0000-000000000009', 'nghi_viec_test', '$2a$10$DEMO_BCRYPT_HASH_nghiviec_change_in_prod', 'BCRYPT_12', 'DISABLED', NULL, 'Nhân viên đã nghỉ việc từ 2026-01-01')
ON CONFLICT (id_nhan_vien) DO NOTHING;

-- =============================================================================
-- Cập nhật comment cho nhan_vien (loại bỏ phần liên quan đến auth)
-- =============================================================================
-- Dữ liệu mẫu cho 2 tài khoản có trạng thái đặc biệt (test UI unlock)
-- =============================================================================
-- Khoá tạm 1 tài khoản (test case "nhập sai 5 lần")
UPDATE tai_khoan
SET trang_thai = 'LOCKED',
    locked_until = NOW() + INTERVAL '15 minutes',
    failed_login_count = 5,
    ly_do_khoa = 'Nhập sai mật khẩu 5 lần liên tiếp'
WHERE ten_dang_nhap = 'thungan2_bv';

-- Đánh dấu 1 tài khoản DISABLED (NV đã nghỉ việc)
UPDATE tai_khoan
SET trang_thai = 'DISABLED',
    ly_do_khoa = 'Nhân viên nghỉ việc từ 2025-12-01'
WHERE ten_dang_nhap = 'thukho';


-- ==========================================
-- FILE: cham_cong.sql
-- ==========================================


-- Dữ liệu mẫu — đồng bộ với `mockData/employees.ts` (30 ngày gần nhất × 9 NV)
-- Chỉ INSERT 1 record mẫu đại diện để test schema, không sinh đủ 270 records
-- (chạy stored procedure riêng khi cần data lớn).
-- =============================================================================
INSERT INTO cham_cong
    (id, id_nhan_vien, work_date, ca_lam_viec,
     check_in_at, check_out_at, clock_in_at, clock_out_at,
     di_tre_phut, overtime_hours, break_hours, tong_gio_lam,
     trang_thai, da_thanh_toan, ghi_chu)
VALUES
    -- Ca sáng hoàn tất (Mai - NV-0006, hôm qua)
    ('c3d4e5f6-0001-0000-0000-000000000001',
     'b2c3d4e5-0001-0000-0000-000000000006',
     CURRENT_DATE - INTERVAL '1 day',
     'MORNING',
     (CURRENT_DATE - INTERVAL '1 day')::TIMESTAMP + TIME '06:00:00',
     (CURRENT_DATE - INTERVAL '1 day')::TIMESTAMP + TIME '14:00:00',
     (CURRENT_DATE - INTERVAL '1 day')::TIMESTAMP + TIME '06:00:00',
     (CURRENT_DATE - INTERVAL '1 day')::TIMESTAMP + TIME '14:00:00',
     0, 0, 1.00, 7.00,
     'PRESENT', TRUE, 'Đúng giờ, nghỉ trưa 1h'),

    -- Ca chiều đi muộn 10 phút (Hùng - NV-0007, hôm qua)
    ('c3d4e5f6-0001-0000-0000-000000000002',
     'b2c3d4e5-0001-0000-0000-000000000007',
     CURRENT_DATE - INTERVAL '1 day',
     'AFTERNOON',
     (CURRENT_DATE - INTERVAL '1 day')::TIMESTAMP + TIME '14:00:00',
     (CURRENT_DATE - INTERVAL '1 day')::TIMESTAMP + TIME '22:00:00',
     (CURRENT_DATE - INTERVAL '1 day')::TIMESTAMP + TIME '14:10:00',
     (CURRENT_DATE - INTERVAL '1 day')::TIMESTAMP + TIME '22:00:00',
     10, 0, 0.50, 7.50,
     'LATE', TRUE, 'Đi muộn 10 phút'),

    -- Ca đêm có OT 2h (Toàn - NV-0008, hôm qua)
    ('c3d4e5f6-0001-0000-0000-000000000003',
     'b2c3d4e5-0001-0000-0000-000000000008',
     CURRENT_DATE - INTERVAL '1 day',
     'NIGHT',
     (CURRENT_DATE - INTERVAL '1 day')::TIMESTAMP + TIME '22:00:00',
     CURRENT_DATE::TIMESTAMP + TIME '06:00:00',
     (CURRENT_DATE - INTERVAL '1 day')::TIMESTAMP + TIME '22:00:00',
     CURRENT_DATE::TIMESTAMP + TIME '08:00:00',
     0, 2.00, 0.50, 9.50,
     'PRESENT', TRUE, 'Làm thêm 2h (kiểm kê đột xuất)'),

    -- Ca sáng hôm nay - CHƯA CHECK-OUT (Mai - NV-0006)
    ('c3d4e5f6-0001-0000-0000-000000000004',
     'b2c3d4e5-0001-0000-0000-000000000006',
     CURRENT_DATE,
     'MORNING',
     CURRENT_DATE::TIMESTAMP + TIME '06:00:00',
     CURRENT_DATE::TIMESTAMP + TIME '14:00:00',
     NULL,  -- chưa check-out thực tế thì 2 cột này NULL theo schema
     NULL,  -- chưa check-out
     2, 0, 0.50, NULL,  -- chưa tính được tổng giờ
     'PRESENT', FALSE, 'Đã check-in, chờ check-out'),

    -- Nghỉ phép (Linh - NV-0009, hôm qua)
    ('c3d4e5f6-0001-0000-0000-000000000005',
     'b2c3d4e5-0001-0000-0000-000000000009',
     CURRENT_DATE - INTERVAL '1 day',
     'MORNING',
     (CURRENT_DATE - INTERVAL '1 day')::TIMESTAMP + TIME '06:00:00',
     (CURRENT_DATE - INTERVAL '1 day')::TIMESTAMP + TIME '14:00:00',
     NULL, NULL,  -- nghỉ phép nên không chấm công
     NULL, 0.00, 0.00, 0.00,
     'LEAVE', FALSE, 'Nghỉ phép năm (đã duyệt)'),

    -- Vắng không phép (thu ngân khác)
    ('c3d4e5f6-0001-0000-0000-000000000006',
     'b2c3d4e5-0001-0000-0000-000000000007',
     CURRENT_DATE - INTERVAL '2 day',
     'MORNING',
     (CURRENT_DATE - INTERVAL '2 day')::TIMESTAMP + TIME '06:00:00',
     (CURRENT_DATE - INTERVAL '2 day')::TIMESTAMP + TIME '14:00:00',
     NULL, NULL,
     NULL, 0.00, 0.00, 0.00,
     'ABSENT', FALSE, 'Vắng không thông báo')
ON CONFLICT (id_nhan_vien, work_date, ca_lam_viec) DO NOTHING;

-- =============================================================================
-- (Tuỳ chọn) FUNCTION tính tong_gio_lam tự động khi check-out.
-- Backend service có thể gọi hàm này thay vì tính tay ở tầng app.
-- =============================================================================

-- ==========================================
-- FILE: bang_luong.sql
-- ==========================================


-- Dữ liệu mẫu — đồng bộ với `mockData/employees.ts` (9 NV × tháng hiện tại)
-- Tháng hiện tại format MM-YYYY theo múi giờ server.
-- =============================================================================
INSERT INTO bang_luong
    (id, id_nhan_vien, id_chi_nhanh, loai_hop_dong, thang_nam,
     tong_gio_lam, overtime_hours, tong_so_ca,
     gio_dieu_chinh, ly_do_dieu_chinh,
     luong_theo_gio, luong_cung,
     luong_cung_thuc_te, tien_cong_theo_gio, tien_ot, thuong, khau_tru,
     tong_tien_luong, trang_thai,
     id_nguoi_xac_nhan, ngay_xac_nhan,
     id_nguoi_duyet_chi, ngay_duyet_chi,
     id_nguoi_thanh_toan, ngay_thanh_toan, ma_phieu_chi)
VALUES
    -- 1. Thu ngân Mai (NV-0006) - đã thanh toán, đi qua 2 tầng duyệt
    ('d4e5f6a7-0001-0000-0000-000000000001',
     'b2c3d4e5-0001-0000-0000-000000000006',
     'a1b2c3d4-0001-0000-0000-000000000101',
     'FULL_TIME',
     TO_CHAR(CURRENT_DATE, 'MM-YYYY'),
     168.0, 4.0, 24,  -- 24 ca × 7h = 168h, trong đó 4h OT
     NULL, NULL,
     0, 14000000,  -- lương cứng 14tr, không theo giờ
     14000000, 0, 0, 500000, 0,  -- lương cứng + thưởng 500k
     14500000,
     'DA_THANH_TOAN',
     'b2c3d4e5-0001-0000-0000-000000000004',
     DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '2 days',
     'b2c3d4e5-0001-0000-0000-000000000002',
     DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '5 days',
     'b2c3d4e5-0001-0000-0000-000000000002',
     DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '10 days',
     'PC-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-001'),

    -- 2. Thu ngân Hùng (NV-0007) - đã thanh toán, có điều chỉnh giờ
    ('d4e5f6a7-0001-0000-0000-000000000002',
     'b2c3d4e5-0001-0000-0000-000000000007',
     'a1b2c3d4-0001-0000-0000-000000000101',
     'FULL_TIME',
     TO_CHAR(CURRENT_DATE, 'MM-YYYY'),
     160.0, 0.0, 24,
     152.0, 'NV báo quên chấm công 2 ca cuối tuần, đã đối chiếu lịch làm',
     0, 14000000,
     13300000, 0, 0, 0, 0,
     13300000,
     'DA_THANH_TOAN',
     'b2c3d4e5-0001-0000-0000-000000000004',
     DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '2 days',
     'b2c3d4e5-0001-0000-0000-000000000002',
     DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '5 days',
     'b2c3d4e5-0001-0000-0000-000000000002',
     DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '10 days',
     'PC-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-002'),

    -- 3. Thu ngân Toàn (NV-0008) - PART_TIME ca đêm, đã thanh toán
    ('d4e5f6a7-0001-0000-0000-000000000003',
     'b2c3d4e5-0001-0000-0000-000000000008',
     'a1b2c3d4-0001-0000-0000-000000000101',
     'PART_TIME',
     TO_CHAR(CURRENT_DATE, 'MM-YYYY'),
     168.0, 12.0, 24,  -- 168h làm việc, trong đó 12h OT
     NULL, NULL,
     28000, 0,  -- 28k/giờ × 1.3 hệ số ca đêm
     0, 6165600, 1176000, 0, 0,  -- 168h × 28000 × 1.3 = 6.1tr + 12h × 28000 × 1.5 = 504k + OT 1.3 hệ số
     7341600,
     'DA_THANH_TOAN',
     'b2c3d4e5-0001-0000-0000-000000000004',
     DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '2 days',
     'b2c3d4e5-0001-0000-0000-000000000002',
     DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '5 days',
     'b2c3d4e5-0001-0000-0000-000000000002',
     DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '10 days',
     'PC-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-003'),

    -- 4. Quản lý Trần Văn Anh (NV-0004) - đã duyệt chi, chờ thanh toán
    ('d4e5f6a7-0001-0000-0000-000000000004',
     'b2c3d4e5-0001-0000-0000-000000000004',
     'a1b2c3d4-0001-0000-0000-000000000101',
     'FULL_TIME',
     TO_CHAR(CURRENT_DATE, 'MM-YYYY'),
     176.0, 0.0, 22,  -- quản lý làm 22 ngày
     NULL, NULL,
     0, 22000000,
     22000000, 0, 0, 1000000, 0,
     23000000,
     'DA_XAC_NHAN',
     'b2c3d4e5-0001-0000-0000-000000000002', DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '2 days',  -- Cần có id người xác nhận để pass constraint
     'b2c3d4e5-0001-0000-0000-000000000002',
     DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '3 days',
     NULL, NULL, NULL),

    -- 5. Thủ kho Hưng (NV-0003) - đã xác nhận giờ, chờ Kế toán duyệt
    ('d4e5f6a7-0001-0000-0000-000000000005',
     'b2c3d4e5-0001-0000-0000-000000000003',
     'a1b2c3d4-0001-0000-0000-000000000001',  -- Kho Tổng
     'FULL_TIME',
     TO_CHAR(CURRENT_DATE, 'MM-YYYY'),
     176.0, 8.0, 22,
     NULL, NULL,
     0, 28000000,
     28000000, 0, 0, 1500000, 0,
     29500000,
     'CHO_XAC_NHAN',  -- chờ Kế toán duyệt chi
     NULL, NULL,  -- thủ kho không qua tầng 1
     NULL, NULL, NULL, NULL, NULL),

    -- 6. Thu ngân Linh (NV-0009) - chi nhánh Hoàn Kiếm, mới chốt
    ('d4e5f6a7-0001-0000-0000-000000000006',
     'b2c3d4e5-0001-0000-0000-000000000009',
     'a1b2c3d4-0001-0000-0000-000000000201',
     'FULL_TIME',
     TO_CHAR(CURRENT_DATE, 'MM-YYYY'),
     168.0, 0.0, 24,
     NULL, NULL,
     0, 13500000,
     13500000, 0, 0, 0, 100000,  -- trừ 100k vì đi muộn
     13400000,
     'CHO_XAC_NHAN',
     NULL, NULL,
     NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (id_nhan_vien, thang_nam) DO NOTHING;

-- =============================================================================
-- Function tiện ích — tạo nhanh bảng lương cho 1 NV trong tháng từ chấm công.
-- Backend service có thể gọi sau khi chạy job tổng hợp cuối tháng.
-- Công thức khớp với `buildPayrollFromRecords()` trong mockData.
-- =============================================================================

-- ==========================================
-- FILE: danh_muc.sql
-- ==========================================


-- Dữ liệu mẫu — đồng bộ với `mockData/categories.ts` (8 nhóm cấp 1)
-- Đây là seed data, sau khi có bảng `san_pham` thì trigger sẽ cập nhật
-- `product_count` tự động.
-- =============================================================================
INSERT INTO danh_muc
    (id, ma_danh_muc, ten_danh_muc, parent_id, mo_ta,
     icon_emoji, mau_hex, thu_tu_hien_thi, product_count, dang_hoat_dong)
VALUES
    -- Nhóm 1: Đồ ăn nóng
    ('e5f6a7b8-0001-0000-0000-000000000001', 'DM-01',
     'Đồ ăn nóng', NULL,
     'Bánh bao, hot dog, mì trộn, xúc xích – chế biến tại quầy.',
     '🌭', '#E31837', 1, 6, TRUE),

    -- Nhóm 2: Nước giải khát
    ('e5f6a7b8-0001-0000-0000-000000000002', 'DM-02',
     'Nước giải khát', NULL,
     'Nước ngọt, trà, nước suối, nước tăng lực đóng chai/lon.',
     '🥤', '#0EA5E9', 2, 7, TRUE),

    -- Nhóm 3: Thức uống pha chế
    ('e5f6a7b8-0001-0000-0000-000000000003', 'DM-03',
     'Thức uống pha chế', NULL,
     'Froster, cà phê, trà sữa pha tại quầy.',
     '☕', '#FFC72C', 3, 4, TRUE),

    -- Nhóm 4: Bánh kẹo & Snack
    ('e5f6a7b8-0001-0000-0000-000000000004', 'DM-04',
     'Bánh kẹo & Snack', NULL,
     'Khoai tây chiên, bánh quy, socola, kẹo.',
     '🍫', '#6366F1', 4, 5, TRUE),

    -- Nhóm 5: Sữa & Chế phẩm
    ('e5f6a7b8-0001-0000-0000-000000000005', 'DM-05',
     'Sữa & Chế phẩm', NULL,
     'Sữa tươi, sữa chua, phô mai – bảo quản lạnh.',
     '🥛', '#10B981', 5, 4, TRUE),

    -- Nhóm 6: Mì & Thực phẩm khô
    ('e5f6a7b8-0001-0000-0000-000000000006', 'DM-06',
     'Mì & Thực phẩm khô', NULL,
     'Mì ăn liền, cháo gói, đồ hộp.',
     '🍜', '#F97316', 6, 4, TRUE),

    -- Nhóm 7: Hàng tiêu dùng
    ('e5f6a7b8-0001-0000-0000-000000000007', 'DM-07',
     'Hàng tiêu dùng', NULL,
     'Khăn giấy, pin, dao cạo, đồ dùng cá nhân.',
     '🧴', '#8B5CF6', 7, 4, TRUE),

    -- Nhóm 8: Kem & Đồ đông lạnh
    ('e5f6a7b8-0001-0000-0000-000000000008', 'DM-08',
     'Kem & Đồ đông lạnh', NULL,
     'Kem que, kem hộp, thực phẩm đông lạnh.',
     '🍦', '#14B8A6', 8, 3, TRUE),

    -- Ví dụ danh mục con (cấp 2) — minh hoạ cấu trúc cây
    ('e5f6a7b8-0001-0000-0000-000000000101', 'DM-01-01',
     'Bánh bao', 'e5f6a7b8-0001-0000-0000-000000000001',
     'Bánh bao nhân thịt, nhân đỗ xanh — chế biến tại quầy, hấp nóng mỗi giờ.',
     '🥟', '#E31837', 1, 2, TRUE),

    ('e5f6a7b8-0001-0000-0000-000000000102', 'DM-01-02',
     'Hot dog', 'e5f6a7b8-0001-0000-0000-000000000001',
     'Hot dog xúc xích Đức, kèm tương cà + mù tạt vàng.',
     '🌭', '#E31837', 2, 2, TRUE)
ON CONFLICT (ma_danh_muc) DO NOTHING;


-- ==========================================
-- FILE: san_pham.sql
-- ==========================================


-- Dữ liệu mẫu — đồng bộ với `mockData/products.ts` (35 SKU trong 8 danh mục)
-- Phân bổ:
--   - DM-01 (Đồ ăn nóng): 6 SKU
--   - DM-02 (Nước giải khát): 7 SKU
--   - DM-03 (Thức uống pha chế): 4 SKU
--   - DM-04 (Bánh kẹo & Snack): 5 SKU
--   - DM-05 (Sữa & Chế phẩm): 4 SKU
--   - DM-06 (Mì & Thực phẩm khô): 4 SKU
--   - DM-07 (Hàng tiêu dùng): 4 SKU
--   - DM-08 (Kem & Đồ đông lạnh): 3 SKU
-- Tổng: 37 SKU (gần đúng mockData). Tôi lấy 1-2 đại diện mỗi nhóm để demo
-- schema, không cần seed đủ 37 để tránh file quá dài.
-- =============================================================================
INSERT INTO san_pham
    (id, id_danh_muc, sku, ma_vach, ten_san_pham, don_vi,
     gia_von, gia_ban, vat_phantram, ton_toi_thieu, ton_toi_da,
     de_hong, han_su_dung_ngay, mo_ta, dang_hoat_dong)
VALUES
    -- ===== DM-01: Đồ ăn nóng (6 SKU) =====
    ('f6a7b8c9-0001-0000-0000-000000000001',
     'e5f6a7b8-0001-0000-0000-000000000001',
     'CK-HOTFOOD-01', '8934567000011',
     'Bánh bao nhân thịt', 'PIECE',
     11000, 18000, 8, 25, 80,
     TRUE, 2, 'Bánh bao nhân thịt heo, hấp nóng mỗi giờ.', TRUE),

    ('f6a7b8c9-0001-0000-0000-000000000002',
     'e5f6a7b8-0001-0000-0000-000000000001',
     'CK-HOTFOOD-02', '8934567000028',
     'Hot dog xúc xích Đức', 'PIECE',
     17500, 28000, 8, 30, 90,
     TRUE, 1, 'Hot dog xúc xích Đức, kèm tương cà + mù tạt vàng.', TRUE),

    ('f6a7b8c9-0001-0000-0000-000000000003',
     'e5f6a7b8-0001-0000-0000-000000000001',
     'CK-HOTFOOD-03', '8934567000035',
     'Mì trộn Indomie', 'PIECE',
     13000, 22000, 8, 40, 120,
     TRUE, 2, 'Mì trộn Indomie, chế biến tại quầy với trứng và rau.', TRUE),

    -- ===== DM-02: Nước giải khát (7 SKU) =====
    ('f6a7b8c9-0001-0000-0000-000000000010',
     'e5f6a7b8-0001-0000-0000-000000000002',
     'CK-DRINK-01', '8934567000100',
     'Coca Cola lon 330ml', 'CAN',
     9500, 15000, 8, 50, 200,
     FALSE, 180, 'Coca Cola lon 330ml, có đường, nhập khẩu Thái Lan.', TRUE),

    ('f6a7b8c9-0001-0000-0000-000000000011',
     'e5f6a7b8-0001-0000-0000-000000000002',
     'CK-DRINK-02', '8934567000117',
     'Pepsi lon 330ml', 'CAN',
     9000, 14000, 8, 50, 200,
     FALSE, 180, 'Pepsi lon 330ml, có đường.', TRUE),

    ('f6a7b8c9-0001-0000-0000-000000000012',
     'e5f6a7b8-0001-0000-0000-000000000002',
     'CK-DRINK-03', '8934567000124',
     'Aquafina 500ml', 'BOTTLE',
     5000, 10000, 8, 80, 300,
     FALSE, 540, 'Nước khoáng Aquafina chai 500ml.', TRUE),

    -- ===== DM-03: Thức uống pha chế (4 SKU) =====
    ('f6a7b8c9-0001-0000-0000-000000000020',
     'e5f6a7b8-0001-0000-0000-000000000003',
     'CK-FROSTER-01', '8934567000209',
     'Froster vị dâu', 'CUP',
     0, 25000, 8, 0, 0,  -- pha chế tại quầy, gia_von = 0
     FALSE, 0, 'Froster vị dâu, pha tại quầy bằng máy Froster tự động.', TRUE),

    ('f6a7b8c9-0001-0000-0000-000000000021',
     'e5f6a7b8-0001-0000-0000-000000000003',
     'CK-COFFEE-01', '8934567000216',
     'Cà phê đen đá', 'CUP',
     0, 18000, 8, 0, 0,
     FALSE, 0, 'Cà phê đen pha phin, thêm đá.', TRUE),

    -- ===== DM-04: Bánh kẹo & Snack (5 SKU) =====
    ('f6a7b8c9-0001-0000-0000-000000000030',
     'e5f6a7b8-0001-0000-0000-000000000004',
     'CK-SNACK-01', '8934567000308',
     'Oishi Snack Bí Đỏ 45g', 'PACK',
     6500, 12000, 8, 30, 100,
     FALSE, 270, 'Snack Bí Đỏ Oishi gói 45g, vị mặn ngọt.', TRUE),

    -- ===== DM-05: Sữa & Chế phẩm (4 SKU) =====
    ('f6a7b8c9-0001-0000-0000-000000000040',
     'e5f6a7b8-0001-0000-0000-000000000005',
     'CK-MILK-01', '8934567000407',
     'Vinamilk 100% hộp 1L', 'BOX',
     26000, 38000, 8, 20, 60,
     TRUE, 180, 'Sữa tươi Vinamilk 100% hộp 1L, bảo quản lạnh.', TRUE),

    -- ===== DM-06: Mì & Thực phẩm khô (4 SKU) =====
    ('f6a7b8c9-0001-0000-0000-000000000050',
     'e5f6a7b8-0001-0000-0000-000000000006',
     'CK-NOODLE-01', '8934567000506',
     'Hảo Hảo Tôm chua cay', 'PACK',
     4500, 8500, 8, 60, 200,
     FALSE, 365, 'Mì Hảo Hảo vị tôm chua cay gói 75g.', TRUE),

    -- ===== DM-07: Hàng tiêu dùng (4 SKU) =====
    ('f6a7b8c9-0001-0000-0000-000000000060',
     'e5f6a7b8-0001-0000-0000-000000000007',
     'CK-DAILY-01', '8934567000605',
     'Khăn giấy Tempo 200 tờ', 'PACK',
     18000, 28000, 10, 30, 80,
     FALSE, 1095, 'Khăn giấy Tempo hộp 200 tờ, 2 lớp.', TRUE),

    -- ===== DM-08: Kem & Đồ đông lạnh (3 SKU) =====
    ('f6a7b8c9-0001-0000-0000-000000000070',
     'e5f6a7b8-0001-0000-0000-000000000008',
     'CK-ICECREAM-01', '8934567000704',
     'Cornetto Vani 110ml', 'PIECE',
     8500, 15000, 8, 20, 60,
     TRUE, 365, 'Kem Cornetto vị vani 110ml, bảo quản đông lạnh.', TRUE)
ON CONFLICT (sku) DO NOTHING;

-- =============================================================================
-- (Tuỳ chọn) FK tới nha_cung_cap — BẬT khi đã tạo bảng nhà cung cấp.
-- =============================================================================
-- ALTER TABLE san_pham
--     ADD CONSTRAINT fk_san_pham_ncc
--     FOREIGN KEY (id_nha_cung_cap) REFERENCES nha_cung_cap(id)
--     ON DELETE SET NULL
--     ON UPDATE CASCADE;

-- Function tiện ích: tra cứu nhanh sản phẩm theo mã vạch (POS quét)
-- Thay vì backend xử lý logic phân biệt active/inactive + lấy giá, gọi hàm này.

-- ==========================================
-- FILE: nha_cung_cap.sql
-- ==========================================


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


-- ==========================================
-- FILE: ton_kho.sql
-- ==========================================


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


-- ==========================================
-- FILE: the_kho.sql
-- ==========================================


-- Dữ liệu mẫu — 6 records minh hoạ đủ 5 loại giao dịch
-- (mỗi loại 1 record để test schema + constraint dấu).
-- Sau khi INSERT mẫu, cập nhật ton_kho tương ứng.
-- =============================================================================

-- 1. PURCHASE_IN: Nhập Coca Cola lon 330ml vào Kho Tổng (+100 lon, giá 9.500đ)
INSERT INTO the_kho (ngay_phat_sinh, id_san_pham, id_chi_nhanh, loai_giao_dich,
                     so_luong, don_gia, ton_truoc, ton_sau,
                     ma_chung_tu, nguoi_thuc_hien, han_su_dung, ghi_chu)
VALUES (NOW() - INTERVAL '30 days',
        'f6a7b8c9-0001-0000-0000-000000000010',
        'a1b2c3d4-0001-0000-0000-000000000001',
        'PURCHASE_IN', 100, 9500, 0, 100,
        'PN-20260801-001', 'Phạm Quốc Hưng (NV-0003)',
        CURRENT_DATE + 180, 'Nhập lô đầu tháng');

-- 2. TRANSFER_OUT: Xuất 50 lon Coca từ Kho Tổng sang Bùi Viện
INSERT INTO the_kho (ngay_phat_sinh, id_san_pham, id_chi_nhanh, loai_giao_dich,
                     so_luong, don_gia, ton_truoc, ton_sau,
                     ma_chung_tu, nguoi_thuc_hien, ghi_chu)
VALUES (NOW() - INTERVAL '25 days',
        'f6a7b8c9-0001-0000-0000-000000000010',
        'a1b2c3d4-0001-0000-0000-000000000001',
        'TRANSFER_OUT', -50, 9500, 100, 50,
        'PX-20260806-001', 'Phạm Quốc Hưng (NV-0003)',
        'Cấp hàng cho cửa hàng Bùi Viện');

-- 3. TRANSFER_IN: Cùng 50 lon đó, Bùi Viện nhận
INSERT INTO the_kho (ngay_phat_sinh, id_san_pham, id_chi_nhanh, loai_giao_dich,
                     so_luong, don_gia, ton_truoc, ton_sau,
                     ma_chung_tu, nguoi_thuc_hien, ghi_chu)
VALUES (NOW() - INTERVAL '25 days',
        'f6a7b8c9-0001-0000-0000-000000000010',
        'a1b2c3d4-0001-0000-0000-000000000101',
        'TRANSFER_IN', 50, 9500, 0, 50,
        'PX-20260806-001', 'Phạm Quốc Hưng (NV-0003)',
        'Nhận hàng từ Kho Tổng');

-- 4. SALE_OUT: Bán 10 lon Coca tại Bùi Viện (giá vốn snapshot)
INSERT INTO the_kho (ngay_phat_sinh, id_san_pham, id_chi_nhanh, loai_giao_dich,
                     so_luong, don_gia, ton_truoc, ton_sau,
                     ma_chung_tu, nguoi_thuc_hien, ghi_chu)
VALUES (NOW() - INTERVAL '10 days',
        'f6a7b8c9-0001-0000-0000-000000000010',
        'a1b2c3d4-0001-0000-0000-000000000101',
        'SALE_OUT', -10, 9500, 50, 40,
        'HD-20260821-0005', 'Lê Thị Mai (NV-0006)',
        'Bán hàng POS ca sáng');

-- 5. SALE_RETURN: Khách trả lại 2 lon Coca (hoàn tiền)
INSERT INTO the_kho (ngay_phat_sinh, id_san_pham, id_chi_nhanh, loai_giao_dich,
                     so_luong, don_gia, ton_truoc, ton_sau,
                     ma_chung_tu, nguoi_thuc_hien, ghi_chu)
VALUES (NOW() - INTERVAL '5 days',
        'f6a7b8c9-0001-0000-0000-000000000010',
        'a1b2c3d4-0001-0000-0000-000000000101',
        'SALE_RETURN', 2, 9500, 40, 42,
        'HD-20260826-0010', 'Lê Thị Mai (NV-0006)',
        'Khách trả hàng do lỗi bao bì');

-- 6. ADJUSTMENT: Cân bằng kiểm kê — thừa 3 lon Coca
INSERT INTO the_kho (ngay_phat_sinh, id_san_pham, id_chi_nhanh, loai_giao_dich,
                     so_luong, don_gia, ton_truoc, ton_sau,
                     ma_chung_tu, nguoi_thuc_hien, ghi_chu)
VALUES (NOW() - INTERVAL '1 day',
        'f6a7b8c9-0001-0000-0000-000000000010',
        'a1b2c3d4-0001-0000-0000-000000000101',
        'ADJUSTMENT', 3, 9500, 42, 45,
        'KK-20260830-001', 'Trần Văn Anh (NV-0004)',
        'Kiểm kê cuối tháng: thừa 3 lon do nhập sai hệ thống trước đó');

-- 7. DISPOSAL_OUT: Huỷ 5 lon Coca hết hạn
INSERT INTO the_kho (ngay_phat_sinh, id_san_pham, id_chi_nhanh, loai_giao_dich,
                     so_luong, don_gia, ton_truoc, ton_sau,
                     ma_chung_tu, nguoi_thuc_hien, ghi_chu)
VALUES (NOW() - INTERVAL '2 days',
        'f6a7b8c9-0001-0000-0000-000000000010',
        'a1b2c3d4-0001-0000-0000-000000000101',
        'DISPOSAL_OUT', -5, 9500, 45, 40,
        'HH-20260829-001', 'Trần Văn Anh (NV-0004)',
        'Huỷ 5 lon hết HSD ngày 25/08');

-- Cập nhật ton_kho cho cửa hàng Bùi Viện (tổng từ TRANSFER_IN + SALE_OUT +
-- SALE_RETURN + ADJUSTMENT + DISPOSAL_OUT = 50 - 10 + 2 + 3 - 5 = 40 lon)
-- (Đã có 85 trong ton_kho seed, cộng thêm 5 từ các giao dịch = 90)
UPDATE ton_kho
SET so_luong_ton = 90,
    lan_bien_dong_cuoi = NOW()
WHERE id_san_pham = 'f6a7b8c9-0001-0000-0000-000000000010'
  AND id_chi_nhanh = 'a1b2c3d4-0001-0000-0000-000000000101';


-- ==========================================
-- FILE: so_quy.sql
-- ==========================================


-- Dữ liệu mẫu — 1 row OPENING + 8 phiếu minh hoạ các hạng mục
-- =============================================================================

-- Row 1: Số dư đầu kỳ (OPENING) — đồng bộ frontend mockData 850 triệu
INSERT INTO so_quy (
    ma_chung_tu, direction, hang_muc, id_chi_nhanh, id_nguoi_tao,
    entry_date, so_tien, hinh_thuc_tt, doi_tuong, dien_giai,
    ma_chung_tu_lien_quan, running_balance
) VALUES (
    'OPENING', 'RECEIPT', 'CAP_VON', NULL,
    'b2c3d4e5-0001-0000-0000-000000000001',  -- Admin tạo
    '1970-01-01', 850000000, 'CASH', 'Tổng công ty Circle K Việt Nam',
    'Số dư quỹ đầu kỳ (chuyển từ năm trước)',
    'OPENING', 850000000
) ON CONFLICT (ma_chung_tu) DO NOTHING;

-- Row 2: Cấp vốn cho Bùi Viện 200 triệu
INSERT INTO so_quy (
    direction, hang_muc, id_chi_nhanh, id_nguoi_tao,
    entry_date, so_tien, hinh_thuc_tt, doi_tuong, dien_giai,
    ma_chung_tu_lien_quan
) VALUES (
    'RECEIPT', 'CAP_VON', 'a1b2c3d4-0001-0000-0000-000000000101',  -- Bùi Viện (chi nhánh nhận vốn)
    'b2c3d4e5-0001-0000-0000-000000000001',  -- Admin
    CURRENT_DATE - INTERVAL '20 days', 200000000, 'BANK_TRANSFER',
    'Chi nhánh Bùi Viện', 'Cấp vốn quỹ tháng 1 cho chi nhánh Bùi Viện',
    NULL
);

-- Row 3: Doanh thu bán hàng Bùi Viện ngày 1
INSERT INTO so_quy (
    direction, hang_muc, id_chi_nhanh, id_nguoi_tao,
    entry_date, so_tien, hinh_thuc_tt, doi_tuong, dien_giai,
    ma_chung_tu_lien_quan
) VALUES (
    'RECEIPT', 'BAN_HANG', 'a1b2c3d4-0001-0000-0000-000000000101',
    'b2c3d4e5-0001-0000-0000-000000000006',  -- Thu ngân Mai
    CURRENT_DATE - INTERVAL '15 days', 4580000, 'CASH',
    'Khách lẻ (tiền mặt)', 'Doanh thu bán hàng cuối ngày',
    NULL  -- (sẽ được fill từ hóa đơn cuối ngày)
);

-- Row 4: Chi nhập hàng từ Pepsico
INSERT INTO so_quy (
    direction, hang_muc, id_chi_nhanh, id_nguoi_tao,
    entry_date, so_tien, hinh_thuc_tt, doi_tuong, dien_giai,
    ma_chung_tu_lien_quan
) VALUES (
    'PAYMENT', 'NHAP_HANG', 'a1b2c3d4-0001-0000-0000-000000000001',  -- Kho Tổng (nơi nhập hàng)
    'b2c3d4e5-0001-0000-0000-000000000003',  -- Thủ kho
    CURRENT_DATE - INTERVAL '5 days', 1200000, 'BANK_TRANSFER',
    'Công Ty TNHH Pepsico Việt Nam',
    'Thanh toán nhập hàng phiếu PN-...',
    NULL  -- ma_chung_tu_lien_quan = mã phiếu nhập
);

-- Row 5: Chi trả lương tháng trước
INSERT INTO so_quy (
    direction, hang_muc, id_chi_nhanh, id_nguoi_tao,
    entry_date, so_tien, hinh_thuc_tt, doi_tuong, dien_giai,
    ma_chung_tu_lien_quan
) VALUES (
    'PAYMENT', 'TRA_LUONG', NULL,  -- Quỹ tổng chi trả lương
    'b2c3d4e5-0001-0000-0000-000000000002',  -- Kế toán duyệt
    CURRENT_DATE - INTERVAL '10 days', 125000000, 'BANK_TRANSFER',
    'Nhiều nhân viên',
    'Chi trả lương kỳ tháng trước cho toàn công ty',
    NULL  -- = mã bảng lương
);

-- Row 6: Chi hoàn tiền 1 đơn hàng (khách trả hàng)
INSERT INTO so_quy (
    direction, hang_muc, id_chi_nhanh, id_nguoi_tao,
    entry_date, so_tien, hinh_thuc_tt, doi_tuong, dien_giai,
    ma_chung_tu_lien_quan
) VALUES (
    'PAYMENT', 'KHAC', 'a1b2c3d4-0001-0000-0000-000000000101',  -- Hoàn tại Bùi Viện
    'b2c3d4e5-0001-0000-0000-000000000004',  -- QL Trần Văn Anh
    CURRENT_DATE - INTERVAL '1 day', 32400, 'CASH',
    'Khách hoàn đơn HD-...-9003',
    'Hoàn tiền 2 lon Coca do lỗi bao bì',
    'HD-...-9003'  -- mã hóa đơn
);

-- Row 7: Doanh thu MOMO (không phải tiền mặt) — ghi BANK_TRANSFER cho khớp "tiền về tài khoản"
INSERT INTO so_quy (
    direction, hang_muc, id_chi_nhanh, id_nguoi_tao,
    entry_date, so_tien, hinh_thuc_tt, doi_tuong, dien_giai,
    ma_chung_tu_lien_quan
) VALUES (
    'RECEIPT', 'BAN_HANG', 'a1b2c3d4-0001-0000-0000-000000000101',
    'b2c3d4e5-0001-0000-0000-000000000007',  -- Thu ngân Hùng
    CURRENT_DATE - INTERVAL '3 days', 41040, 'BANK_TRANSFER',
    'Khách lẻ (không dùng tiền mặt)',
    'Doanh thu bán hàng 1 hộp Vinamilk qua MoMo',
    'HD-...-9002'
);


-- ==========================================
-- FILE: phieu_nhap.sql
-- ==========================================


-- Dữ liệu mẫu — 2 phiếu nhập minh hoạ
-- =============================================================================

-- Phiếu 1: Pepsico - Nhập 100 lon Coca + 50 gói Oishi, thanh toán ngay
INSERT INTO phieu_nhap
    (id, id_chi_nhanh, id_ncc, id_nguoi_nhap,
     ngay_dat_hang, ngay_du_kien_giao, ngay_nhan_thuc_te,
     sub_total, giam_gia, trang_thai, ghi_chu)
VALUES
    ('00000000-0000-0000-0000-000000000001',
     'a1b2c3d4-0001-0000-0000-000000000001',  -- Kho Tổng
     '0a1b2c3d-0001-0000-0000-000000000001',  -- Pepsico
     'b2c3d4e5-0001-0000-0000-000000000003',  -- Thủ kho Phạm Quốc Hưng
     CURRENT_DATE - INTERVAL '5 days',
     CURRENT_DATE - INTERVAL '3 days',
     CURRENT_DATE - INTERVAL '2 days',
     50000, 50000, 'COMPLETED', 'Đơn đặt hàng tuần 1 tháng 8')
ON CONFLICT (id) DO NOTHING;

-- Cập nhật ma_phieu sau khi INSERT (để dùng cho lines)
UPDATE phieu_nhap
SET ma_phieu = 'PN-' || TO_CHAR(ngay_dat_hang, 'YYYYMMDD') || '-001'
WHERE id = '00000000-0000-0000-0000-000000000001';

INSERT INTO chi_tiet_phieu_nhap
    (id_phieu_nhap, id_san_pham, so_luong_dat, so_luong_nhan,
     don_gia_nhap, vat_phantram, han_su_dung, thu_tu)
VALUES
    -- 100 lon Coca Cola, đơn giá 9.500đ, VAT 8%
    ('00000000-0000-0000-0000-000000000001',
     'f6a7b8c9-0001-0000-0000-000000000010', 100, 100, 9500, 8,
     CURRENT_DATE + 180, 1),
    -- 50 gói Oishi, đơn giá 6.500đ, VAT 8%
    ('00000000-0000-0000-0000-000000000001',
     'f6a7b8c9-0001-0000-0000-000000000030', 50, 50, 6500, 8,
     NULL, 2)
ON CONFLICT (id_phieu_nhap, id_san_pham) DO NOTHING;

-- Phiếu 2: Vinamilk - Nhập sữa, NCC giao THIẾU (đặt 100 nhận 80), công nợ
INSERT INTO phieu_nhap
    (id, id_chi_nhanh, id_ncc, id_nguoi_nhap,
     ngay_dat_hang, ngay_du_kien_giao, ngay_nhan_thuc_te,
     sub_total, giam_gia, trang_thai, ghi_chu)
VALUES
    ('00000000-0000-0000-0000-000000000002',
     'a1b2c3d4-0001-0000-0000-000000000001',  -- Kho Tổng
     '0a1b2c3d-0001-0000-0000-000000000002',  -- Vinamilk
     'b2c3d4e5-0001-0000-0000-000000000003',  -- Thủ kho
     CURRENT_DATE - INTERVAL '15 days',
     CURRENT_DATE - INTERVAL '10 days',
     CURRENT_DATE - INTERVAL '8 days',
     0, 0, 'COMPLETED', 'Vinamilk giao thiếu 20 hộp do thiếu hàng')
ON CONFLICT (id) DO NOTHING;

UPDATE phieu_nhap
SET ma_phieu = 'PN-' || TO_CHAR(ngay_dat_hang, 'YYYYMMDD') || '-002'
WHERE id = '00000000-0000-0000-0000-000000000002';

INSERT INTO chi_tiet_phieu_nhap
    (id_phieu_nhap, id_san_pham, so_luong_dat, so_luong_nhan,
     don_gia_nhap, vat_phantram, han_su_dung, thu_tu)
VALUES
    -- 100 hộp Vinamilk đặt, NHẬN 80, đơn giá 26.000đ
    ('00000000-0000-0000-0000-000000000002',
     'f6a7b8c9-0001-0000-0000-000000000040', 100, 80, 26000, 8,
     CURRENT_DATE + 180, 1)
ON CONFLICT (id_phieu_nhap, id_san_pham) DO NOTHING;

-- Sau khi INSERT xong, trigger AFTER INSERT line đã tự tính:
--   - sub_total, vat_total, grand_total
--   - cong_no từ grand_total - da_thanh_toan (mặc định 0)
-- Cập nhật thủ công paid_amount cho 2 phiếu
UPDATE phieu_nhap
SET da_thanh_toan = grand_total
WHERE id = '00000000-0000-0000-0000-000000000001';  -- Pepsico: thanh toán ngay

UPDATE phieu_nhap
SET da_thanh_toan = 0
WHERE id = '00000000-0000-0000-0000-000000000002';  -- Vinamilk: công nợ 15 ngày

-- Cập nhật thống kê NCC
UPDATE nha_cung_cap
SET tong_don_hang = tong_don_hang + 1,
    tong_cong_no = tong_cong_no + (
        SELECT grand_total - da_thanh_toan
        FROM phieu_nhap
        WHERE id = '00000000-0000-0000-0000-000000000001'
    )
WHERE id = '0a1b2c3d-0001-0000-0000-000000000001';

UPDATE nha_cung_cap
SET tong_don_hang = tong_don_hang + 1,
    tong_cong_no = tong_cong_no + (
        SELECT grand_total - da_thanh_toan
        FROM phieu_nhap
        WHERE id = '00000000-0000-0000-0000-000000000002'
    )
WHERE id = '0a1b2c3d-0001-0000-0000-000000000002';


-- ==========================================
-- FILE: phieu_xuat_kho.sql
-- ==========================================


-- Dữ liệu mẫu — 2 phiếu minh hoạ
-- =============================================================================

-- Phiếu 1: COMPLETED — Xuất 50 lon Coca + 30 gói Oishi từ Kho Tổng → Bùi Viện
INSERT INTO phieu_xuat_kho
    (id, id_chi_nhanh_xuat, id_chi_nhanh_nhan, id_nguoi_tao,
     ngay_yeu_cau, ngay_xuat_thuc_te, ngay_nhan_thuc_te,
     id_nguoi_duyet, id_nguoi_nhan,
     trang_thai, ghi_chu)
VALUES
    ('00000000-0000-0000-0000-000000000010',
     'a1b2c3d4-0001-0000-0000-000000000001',  -- Kho Tổng (xuất)
     'a1b2c3d4-0001-0000-0000-000000000101',  -- Bùi Viện (nhận)
     'b2c3d4e5-0001-0000-0000-000000000003',  -- Thủ kho tạo
     CURRENT_DATE - INTERVAL '25 days',
     CURRENT_DATE - INTERVAL '25 days',
     CURRENT_DATE - INTERVAL '25 days',
     'b2c3d4e5-0001-0000-0000-000000000003',  -- Thủ kho duyệt
     'b2c3d4e5-0001-0000-0000-000000000004',  -- Quản lý Bùi Viện nhận
     'COMPLETED', 'Cấp hàng cho cửa hàng Bùi Viện đầu tháng')
ON CONFLICT (id) DO NOTHING;

UPDATE phieu_xuat_kho
SET ma_phieu = 'PX-' || TO_CHAR(ngay_yeu_cau, 'YYYYMMDD') || '-001'
WHERE id = '00000000-0000-0000-0000-000000000010';

INSERT INTO chi_tiet_phieu_xuat
    (id_phieu_xuat, id_san_pham, so_luong_yeu_cau, so_luong_xuat, so_luong_nhan,
     don_gia_von, han_su_dung, thu_tu)
VALUES
    -- 50 lon Coca (xuất = nhận = 50)
    ('00000000-0000-0000-0000-000000000010',
     'f6a7b8c9-0001-0000-0000-000000000010', 50, 50, 50,
     9500, CURRENT_DATE + 180, 1),
    -- 30 gói Oishi
    ('00000000-0000-0000-0000-000000000010',
     'f6a7b8c9-0001-0000-0000-000000000030', 30, 30, 30,
     6500, NULL, 2)
ON CONFLICT (id_phieu_xuat, id_san_pham) DO NOTHING;

-- Phiếu 2: PENDING — Quản lý Bùi Viện yêu cầu 20 lon Coca, chờ thủ kho duyệt
INSERT INTO phieu_xuat_kho
    (id, id_chi_nhanh_xuat, id_chi_nhanh_nhan, id_nguoi_tao,
     ngay_yeu_cau, trang_thai, ghi_chu)
VALUES
    ('00000000-0000-0000-0000-000000000011',
     'a1b2c3d4-0001-0000-0000-000000000001',
     'a1b2c3d4-0001-0000-0000-000000000101',
     'b2c3d4e5-0001-0000-0000-000000000004',  -- Quản lý Bùi Viện
     CURRENT_DATE - INTERVAL '1 day', 'PENDING',
     'Cửa hàng sắp hết Coca, yêu cầu cấp thêm')
ON CONFLICT (id) DO NOTHING;

UPDATE phieu_xuat_kho
SET ma_phieu = 'PX-' || TO_CHAR(ngay_yeu_cau, 'YYYYMMDD') || '-002'
WHERE id = '00000000-0000-0000-0000-000000000011';

INSERT INTO chi_tiet_phieu_xuat
    (id_phieu_xuat, id_san_pham, so_luong_yeu_cau, so_luong_xuat, so_luong_nhan,
     don_gia_von, han_su_dung, thu_tu)
VALUES
    ('00000000-0000-0000-0000-000000000011',
     'f6a7b8c9-0001-0000-0000-000000000010', 20, 0, 0,
     9500, CURRENT_DATE + 180, 1)
ON CONFLICT (id_phieu_xuat, id_san_pham) DO NOTHING;


-- ==========================================
-- FILE: phieu_kiem_ke.sql
-- ==========================================


-- Dữ liệu mẫu — 1 phiếu kiểm kê ĐANG thực hiện (DANG_KIEM_KE) + 1 phiếu đã cân bằng
-- =============================================================================

-- Phiếu 1: DANG_KIEM_KE — Thủ kho đang đếm tại Kho Tổng
INSERT INTO phieu_kiem_ke
    (id, id_chi_nhanh, id_nguoi_tao, ngay_kiem_ke, trang_thai, ghi_chu)
VALUES
    ('00000000-0000-0000-0000-000000000020',
     'a1b2c3d4-0001-0000-0000-000000000001',  -- Kho Tổng
     'b2c3d4e5-0001-0000-0000-000000000003',  -- Thủ kho Phạm Quốc Hưng
     CURRENT_DATE, 'DANG_KIEM_KE',
     'Kiểm kê cuối tháng tại Kho Tổng')
ON CONFLICT (id) DO NOTHING;

UPDATE phieu_kiem_ke
SET ma_phieu = 'KK-' || TO_CHAR(ngay_kiem_ke, 'YYYYMMDD') || '-001'
WHERE id = '00000000-0000-0000-0000-000000000020';

INSERT INTO chi_tiet_kiem_ke
    (id_phieu_kiem_ke, id_san_pham, ton_he_thong, ton_thuc_te,
     don_gia_von, ly_do_lech)
VALUES
    -- 1200 lon Coca: đếm thực tế 1198 (hao hụt 2 lon)
    ('00000000-0000-0000-0000-000000000020',
     'f6a7b8c9-0001-0000-0000-000000000010', 1200, 1198, 9500,
     'Hao hụt 2 lon do vỡ trong kho'),
    -- 600 gói Oishi: đếm thực tế 600 (khớp)
    ('00000000-0000-0000-0000-000000000020',
     'f6a7b8c9-0001-0000-0000-000000000030', 600, 600, 6500, NULL),
    -- 800 gói mì Hảo Hảo: đếm thực tế 803 (thừa 3 gói do nhập trước đó sai)
    ('00000000-0000-0000-0000-000000000020',
     'f6a7b8c9-0001-0000-0000-000000000050', 800, 803, 4500,
     'Thừa 3 gói do lệch khi nhập từ phiếu PN-20260801-001')
ON CONFLICT (id_phieu_kiem_ke, id_san_pham) DO NOTHING;

-- Phiếu 2: DA_CAN_BANG — Quản lý Bùi Viện kiểm kê cửa hàng, đã cân bằng
INSERT INTO phieu_kiem_ke
    (id, id_chi_nhanh, id_nguoi_tao, id_nguoi_duyet,
     ngay_kiem_ke, ngay_can_bang, trang_thai, ghi_chu)
VALUES
    ('00000000-0000-0000-0000-000000000021',
     'a1b2c3d4-0001-0000-0000-000000000101',  -- Bùi Viện
     'b2c3d4e5-0001-0000-0000-000000000004',  -- Quản lý Trần Văn Anh (tạo)
     'b2c3d4e5-0001-0000-0000-000000000001',  -- Admin (duyệt)
     CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE - INTERVAL '2 days',
     'DA_CAN_BANG', 'Kiểm kê tuần tại cửa hàng Bùi Viện')
ON CONFLICT (id) DO NOTHING;

UPDATE phieu_kiem_ke
SET ma_phieu = 'KK-' || TO_CHAR(ngay_kiem_ke, 'YYYYMMDD') || '-001'
WHERE id = '00000000-0000-0000-0000-000000000021';

INSERT INTO chi_tiet_kiem_ke
    (id_phieu_kiem_ke, id_san_pham, ton_he_thong, ton_thuc_te,
     don_gia_von, ly_do_lech)
VALUES
    -- 85 lon Coca: đếm 83 (hao hụt 2)
    ('00000000-0000-0000-0000-000000000021',
     'f6a7b8c9-0001-0000-0000-000000000010', 85, 83, 9500,
     'Hao hụt 2 lon do khách làm đổ'),
    -- 120 chai Aquafina: đếm 120 (khớp)
    ('00000000-0000-0000-0000-000000000021',
     'f6a7b8c9-0001-0000-0000-000000000012', 120, 120, 5000, NULL),
    -- 8 hộp Vinamilk: đếm 7 (hao hụt 1)
    ('00000000-0000-0000-0000-000000000021',
     'f6a7b8c9-0001-0000-0000-000000000040', 8, 7, 26000,
     'Hao hụt 1 hộp do HSD trôi')
ON CONFLICT (id_phieu_kiem_ke, id_san_pham) DO NOTHING;


-- ==========================================
-- FILE: hoa_don.sql
-- ==========================================


-- Dữ liệu mẫu — 3 hoá đơn minh hoạ 3 trạng thái + 3 hình thức thanh toán
-- =============================================================================

-- Hoá đơn 1: COMPLETED, CASH, 3 món
INSERT INTO hoa_don
    (id, id_chi_nhanh, id_thu_ngan, ca_lam_viec, ngay_ban,
     hinh_thuc_tt, tien_khach_dua, sdt_thanh_vien,
     giam_gia, ghi_chu)
VALUES
    ('00000000-0000-0000-0000-000000000030',
     'a1b2c3d4-0001-0000-0000-000000000101',  -- Bùi Viện
     'b2c3d4e5-0001-0000-0000-000000000006',  -- Thu ngân Mai (NV-0006)
     'MORNING', CURRENT_DATE - INTERVAL '5 days',
     'CASH', 60000, NULL,
     0, 'Khách mua nước + snack')
ON CONFLICT (id) DO UPDATE SET tien_khach_dua = EXCLUDED.tien_khach_dua;

UPDATE hoa_don
SET ma_hoa_don = 'HD-' || TO_CHAR(ngay_ban, 'YYYYMMDD') || '-9001'
WHERE id = '00000000-0000-0000-0000-000000000030';

INSERT INTO chi_tiet_hoa_don
    (id_hoa_don, id_san_pham, so_luong, don_gia, giam_gia_dong,
     vat_phantram, don_gia_von, thu_tu)
VALUES
    -- 2 lon Coca × 15.000đ, VAT 8% → 30.000 × 1.08 = 32.400đ
    ('00000000-0000-0000-0000-000000000030',
     'f6a7b8c9-0001-0000-0000-000000000010', 2, 15000, 0, 8, 9500, 1),
    -- 1 chai Aquafina × 10.000đ, VAT 8% → 10.800đ
    ('00000000-0000-0000-0000-000000000030',
     'f6a7b8c9-0001-0000-0000-000000000012', 1, 10000, 0, 8, 5000, 2),
    -- 1 gói Oishi × 12.000đ, VAT 8% → 12.960đ
    ('00000000-0000-0000-0000-000000000030',
     'f6a7b8c9-0001-0000-0000-000000000030', 1, 12000, 0, 8, 6500, 3)
ON CONFLICT (id_hoa_don, id_san_pham) DO NOTHING;

-- Cập nhật tien_thoi (50.000 - 56.160 = -6.160 — khách đưa thiếu, thực tế phải cập nhật lại ở backend)
-- Trong thực tế khách phải đưa đủ, tien_thoi >= 0. Sửa lại:
UPDATE hoa_don
SET tien_khach_dua = 60000
WHERE id = '00000000-0000-0000-0000-000000000030';
-- grand_total = 56160, tien_khach_dua = 60000, tien_thoi = 3840 (60.000 - 56.160)

-- Hoá đơn 2: COMPLETED, MOMO, 1 món (không có tien_khach_dua)
INSERT INTO hoa_don
    (id, id_chi_nhanh, id_thu_ngan, ca_lam_viec, ngay_ban,
     hinh_thuc_tt, sdt_thanh_vien, giam_gia)
VALUES
    ('00000000-0000-0000-0000-000000000031',
     'a1b2c3d4-0001-0000-0000-000000000101',
     'b2c3d4e5-0001-0000-0000-000000000007',  -- Thu ngân Hùng (NV-0007)
     'AFTERNOON', CURRENT_DATE - INTERVAL '3 days',
     'MOMO', '0903118224', 0)
ON CONFLICT (id) DO NOTHING;

UPDATE hoa_don
SET ma_hoa_don = 'HD-' || TO_CHAR(ngay_ban, 'YYYYMMDD') || '-9002'
WHERE id = '00000000-0000-0000-0000-000000000031';

INSERT INTO chi_tiet_hoa_don
    (id_hoa_don, id_san_pham, so_luong, don_gia, giam_gia_dong,
     vat_phantram, don_gia_von, thu_tu)
VALUES
    -- 1 hộp Vinamilk × 38.000đ, VAT 8% → 41.040đ (KHÁCH THÀNH VIÊN)
    ('00000000-0000-0000-0000-000000000031',
     'f6a7b8c9-0001-0000-0000-000000000040', 1, 38000, 0, 8, 26000, 1)
ON CONFLICT (id_hoa_don, id_san_pham) DO NOTHING;

-- Hoá đơn 3: REFUNDED, đã hoàn tiền
INSERT INTO hoa_don
    (id, id_chi_nhanh, id_thu_ngan, ca_lam_viec, ngay_ban,
     hinh_thuc_tt, tien_khach_dua, sdt_thanh_vien, giam_gia,
     trang_thai, id_nguoi_hoan, ngay_hoan, ly_do_hoan, ghi_chu)
VALUES
    ('00000000-0000-0000-0000-000000000032',
     'a1b2c3d4-0001-0000-0000-000000000101',
     'b2c3d4e5-0001-0000-0000-000000000006',
     'MORNING', CURRENT_DATE - INTERVAL '2 days',
     'CASH', 35000, NULL, 0,
     'REFUNDED',
     'b2c3d4e5-0001-0000-0000-000000000004',  -- QL Trần Văn Anh duyệt
     CURRENT_DATE - INTERVAL '1 day',
     'Khách trả hàng do lon Coca bị lỗi bao bì, hoàn lại tiền mặt',
     'Đã hoàn 2 lon Coca')
ON CONFLICT (id) DO UPDATE SET tien_khach_dua = EXCLUDED.tien_khach_dua;

UPDATE hoa_don
SET ma_hoa_don = 'HD-' || TO_CHAR(ngay_ban, 'YYYYMMDD') || '-9003'
WHERE id = '00000000-0000-0000-0000-000000000032';

INSERT INTO chi_tiet_hoa_don
    (id_hoa_don, id_san_pham, so_luong, don_gia, giam_gia_dong,
     vat_phantram, don_gia_von, thu_tu)
VALUES
    ('00000000-0000-0000-0000-000000000032',
     'f6a7b8c9-0001-0000-0000-000000000010', 2, 15000, 0, 8, 9500, 1)
ON CONFLICT (id_hoa_don, id_san_pham) DO NOTHING;
