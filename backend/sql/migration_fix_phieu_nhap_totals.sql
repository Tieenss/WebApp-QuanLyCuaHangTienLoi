-- Migration: sửa trigger tính tổng phiếu nhập theo schema hiện tại.
-- Chạy sau phieu_nhap.sql. Không chạy lại toàn bộ file seed.

CREATE OR REPLACE FUNCTION fn_cap_nhat_tong_phieu_nhap()
RETURNS TRIGGER AS $$
DECLARE
    v_id_phieu_nhap UUID;
    v_sub DECIMAL(15,0);
    v_vat DECIMAL(15,0);
BEGIN
    v_id_phieu_nhap := COALESCE(NEW.id_phieu_nhap, OLD.id_phieu_nhap);

    SELECT COALESCE(SUM(thanh_tien), 0)
    INTO v_sub
    FROM chi_tiet_phieu_nhap
    WHERE id_phieu_nhap = v_id_phieu_nhap;

    SELECT COALESCE(SUM(ROUND(thanh_tien * vat_phantram / 100)), 0)
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
