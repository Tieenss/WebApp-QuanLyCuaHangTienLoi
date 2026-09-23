import { useEffect, type FC } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { fetchCategories } from '@/store/slices/categorySlice';
import { fetchSuppliers } from '@/store/slices/supplierSlice';
import { fetchBranches } from '@/store/slices/branchSlice';
import { fetchStock } from '@/store/slices/stockSlice';
import { fetchEmployees } from '@/store/slices/employeeSlice';
import { fetchProducts } from '@/store/slices/productSlice';
import { fetchAttendance } from '@/store/slices/attendanceSlice';
import { syncPosBranch } from '@/store/slices/posSlice';
import { USER_ROLE } from '@/types';

/**
 * Load dữ liệu dùng chung (master data) 1 lần khi app khởi động.
 * Tránh mỗi trang phải tự dispatch fetch tránh duplicate.
 *
 * Tối ưu: dùng authUser?.id (primitive) thay vì authUser (object) làm dependency
 * để tránh re-run khi object bị re-create (e.g. sau token refresh).
 * Guard: chỉ fetch nếu store chưa có dữ liệu.
 */
export const AppBootstrap: FC = () => {
  const dispatch = useAppDispatch();
  const authUserId = useAppSelector((state) => state.auth.user?.id);
  const authUserRole = useAppSelector((state) => state.auth.user?.role);
  const authUserBranchId = useAppSelector((state) => state.auth.user?.branchId);

  // Guards: đọc số lượng dữ liệu đã có trong store
  const categoryCount = useAppSelector((state) => state.category?.categories?.length ?? 0);
  const supplierCount = useAppSelector((state) => state.supplier?.suppliers?.length ?? 0);
  const branchCount = useAppSelector((state) => state.branch?.branches?.length ?? 0);
  const employeeCount = useAppSelector((state) => state.employee?.employees?.length ?? 0);
  const productCount = useAppSelector((state) => state.product?.products?.length ?? 0);
  const stockCount = useAppSelector((state) => state.stock?.balances?.length ?? 0);

  useEffect(() => {
    if (!authUserId) return;

    // Chỉ fetch nếu chưa có dữ liệu (guard chống fetch lại)
    if (categoryCount === 0) dispatch(fetchCategories());
    if (supplierCount === 0) dispatch(fetchSuppliers());
    if (branchCount === 0) dispatch(fetchBranches());
    if (employeeCount === 0) dispatch(fetchEmployees());
    if (productCount === 0) dispatch(fetchProducts());

    // Thu ngân tải tồn kho qua endpoint theo chi nhánh tại màn POS; không
    // gọi endpoint quản trị kho/toàn bộ thẻ kho.
    const canLoadManagementStock = authUserRole === USER_ROLE.Admin
      || authUserRole === USER_ROLE.StoreManager
      || authUserRole === USER_ROLE.WarehouseKeeper;
    if (canLoadManagementStock && stockCount === 0) {
      dispatch(fetchStock());
    }

    dispatch(fetchAttendance({}));
    if (authUserBranchId) dispatch(syncPosBranch(authUserBranchId));

  // Dùng authUserId (primitive string/number) thay vì authUser (object reference)
  // để tránh re-run effect mỗi khi object bị re-create sau token refresh
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, authUserId]);

  return null;
};

export default AppBootstrap;

