-- Don ket qua test E2E cua phieu xuat kho ngay 09/09 (khong thuoc du lieu seed).
BEGIN;

-- 1. Tra ton kho Coca da dich chuyen trong test PX-20260909-005 (-40 kho tong / +40 store).
UPDATE ton_kho SET so_luong_ton = 1200, gia_tri_ton = 1200 * gia_von_trung_binh
    WHERE id_san_pham = 'f6a7b8c9-0001-0000-0000-000000000010'
      AND id_chi_nhanh = 'a1b2c3d4-0001-0000-0000-000000000001';
UPDATE ton_kho SET so_luong_ton = 90, gia_tri_ton = 90 * gia_von_trung_binh
    WHERE id_san_pham = 'f6a7b8c9-0001-0000-0000-000000000010'
      AND id_chi_nhanh = 'a1b2c3d4-0001-0000-0000-000000000101';

-- 2. Xoa the_kho cua 2 phieu test (trigger immutable tam thoi tat).
ALTER TABLE the_kho DISABLE TRIGGER trg_the_kho_immutable;
DELETE FROM the_kho
    WHERE ma_chung_tu IN ('PX-20260909-004', 'PX-20260909-005',
                          'PX-20260909-001', 'PX-20260909-002', 'PX-20260909-003')
      AND loai_giao_dich IN ('TRANSFER_IN', 'TRANSFER_OUT');
ALTER TABLE the_kho ENABLE TRIGGER trg_the_kho_immutable;

-- 3. Xoa dong chi tiet + header cua phieu co ghi_chu E2E.
DELETE FROM chi_tiet_phieu_xuat
    WHERE id_phieu_xuat IN (SELECT id FROM phieu_xuat_kho WHERE ghi_chu LIKE 'E2E%');
DELETE FROM phieu_xuat_kho WHERE ghi_chu LIKE 'E2E%';

COMMIT;
