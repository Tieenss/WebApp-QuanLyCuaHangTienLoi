-- Don 2 phieu E2E pay test hom 09/09 va tra ton Coca ve 1200 nhu seed.
-- LUU Y: xoa header TRUOC de FK ON DELETE CASCADE tu xoa lines; neu xoa lines
-- truoc, trigger fn_cap_nhat_tong_phieu_nhap se cap nhat grand = 0 trong khi
-- da_thanh_toan > 0 -> vi pham CHECK paid <= grand.
BEGIN;
UPDATE ton_kho SET so_luong_ton = 1200, gia_tri_ton = 1200 * gia_von_trung_binh
    WHERE id_san_pham = 'f6a7b8c9-0001-0000-0000-000000000010'
      AND id_chi_nhanh = 'a1b2c3d4-0001-0000-0000-000000000001';

ALTER TABLE the_kho DISABLE TRIGGER trg_the_kho_immutable;
DELETE FROM the_kho WHERE ma_chung_tu IN ('PN-20260909-001', 'PN-20260909-002');
ALTER TABLE the_kho ENABLE TRIGGER trg_the_kho_immutable;

DELETE FROM phieu_nhap WHERE ghi_chu LIKE 'E2E pay%';
COMMIT;
