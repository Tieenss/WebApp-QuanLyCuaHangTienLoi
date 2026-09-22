import { useEffect, type FC } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPosAvailability } from '@/store/slices/posSlice';
import { ProductPicker } from './components/ProductPicker';
import { CartPanel } from './components/CartPanel';
import { CheckoutSuccessModal } from './components/CheckoutSuccessModal';
import './PosPage.css';

/**
 * Module 2 — Bán hàng (POS).
 *
 * Bố cục 2 cột: lưới sản phẩm bên trái, giỏ hàng dính (sticky) bên phải để
 * thu ngân không phải cuộn khi thêm hàng.
 *
 * Trang không có PageHeader: thông tin ca bán hàng, số hoá đơn đã lập và ô
 * chọn quầy đã nằm trên topbar của `PosLayout`, nhắc lại ở đây chỉ lấy mất
 * chiều cao của lưới sản phẩm.
 */
export const PosPage: FC = () => {
  const dispatch = useAppDispatch();
  // POS có thể đổi quầy với tài khoản được cấp quyền, nên luôn tải tồn theo
  // quầy đang bán thay vì chi nhánh gắn cố định trong hồ sơ đăng nhập.
  const branchId = useAppSelector((state) => state.pos.branchId);

  useEffect(() => {
    if (branchId) dispatch(fetchPosAvailability(branchId));
  }, [branchId, dispatch]);

  return (
    <>
      <div className="pos-layout">
        <ProductPicker />
        <CartPanel />
      </div>

      <CheckoutSuccessModal />
    </>
  );
};
