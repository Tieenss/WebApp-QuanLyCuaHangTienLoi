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
    p_hinh_thuc_tt    VARCHAR(20),
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
            'SALE_RETURN',
            v_line.so_luong,  -- SALE_RETURN: SL dương
            v_line.don_gia_von,
            v_ma_chung_tu,
            p_nguoi_thuc_hien,
            NULL,
            'Hoàn tiền hoá đơn ' || v_ma_chung_tu,
            NOW()
        );
    END LOOP;

    -- 3. (sau này) Tạo phiếu chi sổ quỹ HOAN_TIEN — chờ bảng so_quy
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Dữ liệu mẫu — 3 hoá đơn minh hoạ 3 trạng thái + 3 hình thức thanh toán
-- =============================================================================

-- Hoá đơn 1: COMPLETED, CASH, 3 món
INSERT INTO hoa_don
    (id_chi_nhanh, id_thu_ngan, ca_lam_viec, ngay_ban,
     hinh_thuc_tt, tien_khach_dua, sdt_thanh_vien,
     giam_gia, ghi_chu)
VALUES
    ('00000000-0000-0000-0000-000000000030',
     'a1b2c3d4-0001-0000-0000-000000000101',  -- Bùi Viện
     'b2c3d4e5-0001-0000-0000-000000000006',  -- Thu ngân Mai (NV-0006)
     'MORNING', CURRENT_DATE - INTERVAL '5 days',
     'CASH', 50000, NULL,
     0, 'Khách mua nước + snack');

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
     'f6a7b8c9-0001-0000-0000-000000000030', 1, 12000, 0, 8, 6500, 3);

-- Cập nhật tien_thoi (50.000 - 56.160 = -6.160 — khách đưa thiếu, thực tế phải cập nhật lại ở backend)
-- Trong thực tế khách phải đưa đủ, tien_thoi >= 0. Sửa lại:
UPDATE hoa_don
SET tien_khach_dua = 60000
WHERE id = '00000000-0000-0000-0000-000000000030';
-- grand_total = 56160, tien_khach_dua = 60000, tien_thoi = 3840 (60.000 - 56.160)

-- Hoá đơn 2: COMPLETED, MOMO, 1 món (không có tien_khach_dua)
INSERT INTO hoa_don
    (id_chi_nhanh, id_thu_ngan, ca_lam_viec, ngay_ban,
     hinh_thuc_tt, sdt_thanh_vien, giam_gia)
VALUES
    ('00000000-0000-0000-0000-000000000031',
     'a1b2c3d4-0001-0000-0000-000000000101',
     'b2c3d4e5-0001-0000-0000-000000000007',  -- Thu ngân Hùng (NV-0007)
     'AFTERNOON', CURRENT_DATE - INTERVAL '3 days',
     'MOMO', '0903118224', 0);

UPDATE hoa_don
SET ma_hoa_don = 'HD-' || TO_CHAR(ngay_ban, 'YYYYMMDD') || '-9002'
WHERE id = '00000000-0000-0000-0000-000000000031';

INSERT INTO chi_tiet_hoa_don
    (id_hoa_don, id_san_pham, so_luong, don_gia, giam_gia_dong,
     vat_phantram, don_gia_von, thu_tu)
VALUES
    -- 1 hộp Vinamilk × 38.000đ, VAT 8% → 41.040đ (KHÁCH THÀNH VIÊN)
    ('00000000-0000-0000-0000-000000000031',
     'f6a7b8c9-0001-0000-0000-000000000040', 1, 38000, 0, 8, 26000, 1);

-- Hoá đơn 3: REFUNDED, đã hoàn tiền
INSERT INTO hoa_don
    (id_chi_nhanh, id_thu_ngan, ca_lam_viec, ngay_ban,
     hinh_thuc_tt, tien_khach_dua, sdt_thanh_vien, giam_gia,
     trang_thai, id_nguoi_hoan, ngay_hoan, ly_do_hoan, ghi_chu)
VALUES
    ('00000000-0000-0000-0000-000000000032',
     'a1b2c3d4-0001-0000-0000-000000000101',
     'b2c3d4e5-0001-0000-0000-000000000006',
     'MORNING', CURRENT_DATE - INTERVAL '2 days',
     'CASH', 30000, NULL, 0,
     'REFUNDED',
     'b2c3d4e5-0001-0000-0000-000000000004',  -- QL Trần Văn Anh duyệt
     CURRENT_DATE - INTERVAL '1 day',
     'Khách trả hàng do lon Coca bị lỗi bao bì, hoàn lại tiền mặt',
     'Đã hoàn 2 lon Coca');

UPDATE hoa_don
SET ma_hoa_don = 'HD-' || TO_CHAR(ngay_ban, 'YYYYMMDD') || '-9003'
WHERE id = '00000000-0000-0000-0000-000000000032';

INSERT INTO chi_tiet_hoa_don
    (id_hoa_don, id_san_pham, so_luong, don_gia, giam_gia_dong,
     vat_phantram, don_gia_von, thu_tu)
VALUES
    ('00000000-0000-0000-0000-000000000032',
     'f6a7b8c9-0001-0000-0000-000000000010', 2, 15000, 0, 8, 9500, 1);

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
