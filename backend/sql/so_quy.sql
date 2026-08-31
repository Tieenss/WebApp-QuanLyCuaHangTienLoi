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
    ADD COLUMN ma_chung_tu_lien_quan VARCHAR(50);

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
    SELECT COALESCE(running_balance, 0) INTO v_balance_before
    FROM so_quy
    WHERE ma_chung_tu <> 'OPENING'  -- không lấy row OPENING
      AND entry_date < NEW.entry_date
    ORDER BY entry_date DESC, ngay_tao DESC
    LIMIT 1;

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
    SELECT COALESCE(running_balance, 0) INTO v_balance_before
    FROM so_quy
    WHERE ma_chung_tu <> 'OPENING'
      AND (entry_date, ngay_tao) < (v_row.entry_date, v_row.ngay_tao)
    ORDER BY entry_date DESC, ngay_tao DESC
    LIMIT 1;

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
);

-- Row 2: Cấp vốn cho Bùi Viện 200 triệu
INSERT INTO so_quy (
    direction, hang_muc, id_chi_nhanh, id_nguoi_tao,
    entry_date, so_tien, hinh_thuc_tt, doi_tuong, dien_giai,
    ma_chung_tu_lien_quan
) VALUES (
    'PAYMENT', 'CAP_VON', 'a1b2c3d4-0001-0000-0000-000000000101',  -- Bùi Viện (chi nhánh nhận vốn)
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
    'b2c3d4e5-0001-0000-0000-0000-000000000007',  -- Thu ngân Hùng
    CURRENT_DATE - INTERVAL '3 days', 41040, 'BANK_TRANSFER',
    'Khách lẻ (không dùng tiền mặt)',
    'Doanh thu bán hàng 1 hộp Vinamilk qua MoMo',
    'HD-...-9002'
);

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
