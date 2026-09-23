-- =============================================================================
-- Migration: Bổ sung bảng quản lý Lô hàng (lo_hang) và hỗ trợ nguyên tắc FEFO
-- Chuẩn hoá theo mô hình ERP chuỗi cửa hàng tiện lợi
-- =============================================================================

CREATE TABLE IF NOT EXISTS lo_hang (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ma_lo               VARCHAR(50) NOT NULL,              -- Mã lô (VD: LOT-20260923-001 hoặc LOT-INIT-...)
    id_san_pham         UUID NOT NULL REFERENCES san_pham(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    id_chi_nhanh        UUID NOT NULL REFERENCES chi_nhanh(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    so_luong_ton        INTEGER NOT NULL DEFAULT 0 CHECK (so_luong_ton >= 0),
    han_su_dung         DATE,                               -- Hạn sử dụng của riêng lô này
    ngay_san_xuat       DATE,                               -- Ngày sản xuất (nếu có)
    gia_von             DECIMAL(12,0) NOT NULL DEFAULT 0 CHECK (gia_von >= 0),
    trang_thai          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' 
                        CHECK (trang_thai IN ('ACTIVE', 'EXPIRED', 'DISPOSED')),
    ngay_tao            TIMESTAMP NOT NULL DEFAULT NOW(),
    ngay_cap_nhat       TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_lo_hang_ma_chi_nhanh UNIQUE (ma_lo, id_chi_nhanh)
);

CREATE INDEX IF NOT EXISTS idx_lo_hang_fefo 
ON lo_hang (id_chi_nhanh, id_san_pham, han_su_dung ASC, ngay_tao ASC)
WHERE so_luong_ton > 0 AND trang_thai = 'ACTIVE';

-- Chuyển toàn bộ tồn hiện tại sang thành các Lô ban đầu (Data Backfill)
INSERT INTO lo_hang (ma_lo, id_san_pham, id_chi_nhanh, so_luong_ton, han_su_dung, gia_von, trang_thai)
SELECT 
    'LOT-INIT-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || SUBSTRING(tk.id_san_pham::text, 1, 8),
    tk.id_san_pham,
    tk.id_chi_nhanh,
    tk.so_luong_ton,
    COALESCE(
        tk.han_su_dung_gan_nhat, 
        CASE 
            WHEN sp.han_su_dung_ngay IS NOT NULL AND sp.han_su_dung_ngay >= 0 
            THEN CURRENT_DATE + (sp.han_su_dung_ngay || ' days')::INTERVAL 
            ELSE NULL 
        END
    ),
    tk.gia_von_trung_binh,
    'ACTIVE'
FROM ton_kho tk
JOIN san_pham sp ON sp.id = tk.id_san_pham
WHERE tk.so_luong_ton > 0
ON CONFLICT (ma_lo, id_chi_nhanh) DO NOTHING;

-- Cập nhật HSD cho các lô hàng đã tạo trước đó nhưng đang thiếu HSD (tự động tính theo ngày tạo + han_su_dung_ngay)
UPDATE lo_hang l
SET han_su_dung = l.ngay_tao::date + (sp.han_su_dung_ngay || ' days')::INTERVAL
FROM san_pham sp
WHERE l.id_san_pham = sp.id
  AND l.han_su_dung IS NULL
  AND sp.han_su_dung_ngay IS NOT NULL
  AND sp.han_su_dung_ngay >= 0;

-- Đồng bộ lại hạn sử dụng gần nhất của sản phẩm trong kho (FEFO)
UPDATE ton_kho tk
SET han_su_dung_gan_nhat = sub.min_hsd
FROM (
    SELECT id_san_pham, id_chi_nhanh, MIN(han_su_dung) AS min_hsd
    FROM lo_hang
    WHERE so_luong_ton > 0 AND trang_thai = 'ACTIVE' AND han_su_dung IS NOT NULL
    GROUP BY id_san_pham, id_chi_nhanh
) sub
WHERE tk.id_san_pham = sub.id_san_pham
  AND tk.id_chi_nhanh = sub.id_chi_nhanh;

-- =============================================================================
-- Trigger tự động: Bất cứ khi nào tạo Lô hàng mới (lo_hang) mà HSD bị NULL,
-- Database tự động lấy: Ngày tạo/sản xuất + san_pham.han_su_dung_ngay (kể cả HSD = 0 ngày)
-- =============================================================================
CREATE OR REPLACE FUNCTION trg_fn_auto_set_lo_hang_hsd()
RETURNS TRIGGER AS $$
DECLARE
    v_hsd_ngay INTEGER;
BEGIN
    IF NEW.han_su_dung IS NULL THEN
        SELECT han_su_dung_ngay INTO v_hsd_ngay
        FROM san_pham
        WHERE id = NEW.id_san_pham;

        IF v_hsd_ngay IS NOT NULL AND v_hsd_ngay >= 0 THEN
            NEW.han_su_dung := COALESCE(NEW.ngay_san_xuat, NEW.ngay_tao::date, CURRENT_DATE) + (v_hsd_ngay || ' days')::INTERVAL;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lo_hang_auto_hsd ON lo_hang;
CREATE TRIGGER trg_lo_hang_auto_hsd
BEFORE INSERT ON lo_hang
FOR EACH ROW
EXECUTE FUNCTION trg_fn_auto_set_lo_hang_hsd();

-- Trigger tự động cho chi tiết phiếu nhập (chi_tiet_phieu_nhap)
CREATE OR REPLACE FUNCTION trg_fn_auto_set_chi_tiet_phieu_nhap_hsd()
RETURNS TRIGGER AS $$
DECLARE
    v_hsd_ngay INTEGER;
    v_ngay_nhan DATE;
BEGIN
    IF NEW.han_su_dung IS NULL THEN
        SELECT han_su_dung_ngay INTO v_hsd_ngay
        FROM san_pham
        WHERE id = NEW.id_san_pham;

        IF v_hsd_ngay IS NOT NULL AND v_hsd_ngay >= 0 THEN
            SELECT COALESCE(ngay_nhan_thuc_te, ngay_dat_hang, CURRENT_DATE) INTO v_ngay_nhan
            FROM phieu_nhap
            WHERE id = NEW.id_phieu_nhap;

            NEW.han_su_dung := COALESCE(v_ngay_nhan, CURRENT_DATE) + (v_hsd_ngay || ' days')::INTERVAL;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chi_tiet_phieu_nhap_auto_hsd ON chi_tiet_phieu_nhap;
CREATE TRIGGER trg_chi_tiet_phieu_nhap_auto_hsd
BEFORE INSERT ON chi_tiet_phieu_nhap
FOR EACH ROW
EXECUTE FUNCTION trg_fn_auto_set_chi_tiet_phieu_nhap_hsd();


