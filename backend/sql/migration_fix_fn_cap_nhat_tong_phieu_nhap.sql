-- Sửa trigger fn_cap_nhat_tong_phieu_nhap: dùng đúng cột của
-- chi_tiet_phieu_nhap (don_gia_nhap, so_luong_nhan, vat_phantram) thay vì
-- tên cột của chi_tiet_hoa_don (don_gia, so_luong, giam_gia_dong) — bản cũ
-- gây lỗi "column don_gia does not exist" khi thêm dòng phiếu nhập.
CREATE OR REPLACE FUNCTION fn_cap_nhat_tong_phieu_nhap()
RETURNS TRIGGER AS $$
DECLARE
    v_id_phieu_nhap UUID;
    v_sub DECIMAL(15,0);
    v_vat DECIMAL(15,0);
BEGIN
    v_id_phieu_nhap := COALESCE(NEW.id_phieu_nhap, OLD.id_phieu_nhap);

    SELECT COALESCE(SUM(don_gia_nhap * so_luong_nhan), 0)
    INTO v_sub
    FROM chi_tiet_phieu_nhap
    WHERE id_phieu_nhap = v_id_phieu_nhap;

    -- VAT tính trên thành tiền từng dòng rồi sum
    SELECT COALESCE(SUM(ROUND(don_gia_nhap * so_luong_nhan * vat_phantram / 100)), 0)
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
