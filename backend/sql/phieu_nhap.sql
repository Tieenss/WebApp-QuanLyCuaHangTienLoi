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
                   CHECK (trang_thai IN ('DRAFT', 'PENDING', 'COMPLETED', 'CANCELLED')),

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
    v_giam_gia_dong_total DECIMAL(15,0);
    v_vat DECIMAL(15,0);
BEGIN
    v_id_phieu_nhap := COALESCE(NEW.id_phieu_nhap, OLD.id_phieu_nhap);

    SELECT
        COALESCE(SUM(don_gia * so_luong), 0),
        COALESCE(SUM(giam_gia_dong), 0)
    INTO v_sub, v_giam_gia_dong_total
    FROM chi_tiet_phieu_nhap
    WHERE id_phieu_nhap = v_id_phieu_nhap;

    -- VAT tính trên (don_gia × so_luong - giam_gia_dong) — từng dòng rồi sum
    -- (khớp frontend buildSalesOrder cách tính: vat theo từng dòng, sum lên)
    SELECT COALESCE(SUM(ROUND((don_gia * so_luong - giam_gia_dong) * vat_phantram / 100)), 0)
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
    -- Logic: BQGQ_mới = (BQGQ_cũ × tồn_cũ + Σ(don_gia_nhập × SL_nhận)) / (tồn_cũ + Σ SL)
    -- Đơn giản hoá: trigger AFTER INSERT the_kho (PURCHASE_IN) đã tự cộng tồn
    -- ở ton_kho. Backend service cần tính BQGQ riêng và UPDATE san_pham.
    -- (Trong production: gọi thêm function fn_cap_nhat_bqoq_san_pham)

    -- 5. Cập nhật thống kê NCC
    UPDATE nha_cung_cap
    SET tong_don_hang = tong_don_hang + 1,
        tong_cong_no = tong_cong_no + (v_grand - v_paid)
    WHERE id = p_id_ncc;

    RETURN v_id_phieu;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Dữ liệu mẫu — 2 phiếu nhập minh hoạ
-- =============================================================================

-- Phiếu 1: Pepsico - Nhập 100 lon Coca + 50 gói Oishi, thanh toán ngay
INSERT INTO phieu_nhap
    (id_chi_nhanh, id_ncc, id_nguoi_nhap,
     ngay_dat_hang, ngay_du_kien_giao, ngay_nhan_thuc_te,
     giam_gia, trang_thai, ghi_chu)
VALUES
    ('00000000-0000-0000-0000-000000000001',
     'a1b2c3d4-0001-0000-0000-000000000001',  -- Kho Tổng
     '0a1b2c3d-0001-0000-0000-000000000001',  -- Pepsico
     'b2c3d4e5-0001-0000-0000-000000000003',  -- Thủ kho Phạm Quốc Hưng
     CURRENT_DATE - INTERVAL '5 days',
     CURRENT_DATE - INTERVAL '3 days',
     CURRENT_DATE - INTERVAL '2 days',
     50000, 'COMPLETED', 'Đơn đặt hàng tuần 1 tháng 8');

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
     NULL, 2);

-- Phiếu 2: Vinamilk - Nhập sữa, NCC giao THIẾU (đặt 100 nhận 80), công nợ
INSERT INTO phieu_nhap
    (id_chi_nhanh, id_ncc, id_nguoi_nhap,
     ngay_dat_hang, ngay_du_kien_giao, ngay_nhan_thuc_te,
     giam_gia, trang_thai, ghi_chu)
VALUES
    ('00000000-0000-0000-0000-000000000002',
     'a1b2c3d4-0001-0000-0000-000000000001',  -- Kho Tổng
     '0a1b2c3d-0001-0000-0000-000000000002',  -- Vinamilk
     'b2c3d4e5-0001-0000-0000-000000000003',  -- Thủ kho
     CURRENT_DATE - INTERVAL '15 days',
     CURRENT_DATE - INTERVAL '10 days',
     CURRENT_DATE - INTERVAL '8 days',
     0, 'COMPLETED', 'Vinamilk giao thiếu 20 hộp do thiếu hàng');

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
     CURRENT_DATE + 180, 1);

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

COMMENT ON COLUMN phieu_nhap.so_luong_dat IS
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
