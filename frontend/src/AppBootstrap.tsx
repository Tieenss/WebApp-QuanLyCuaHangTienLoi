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
 */
export const AppBootstrap: FC = () => {
  const dispatch = useAppDispatch();
  const authUser = useAppSelector((state) => state.auth.user);

  useEffect(() => {
    if (authUser) {
      dispatch(fetchCategories());
      dispatch(fetchSuppliers());
      dispatch(fetchBranches());
      dispatch(fetchEmployees());
      dispatch(fetchProducts());
      // Thu ngân tải tồn kho qua endpoint theo chi nhánh tại màn POS; không
      // gọi endpoint quản trị kho/toàn bộ thẻ kho.
      const canLoadManagementStock = authUser.role === USER_ROLE.Admin
        || authUser.role === USER_ROLE.StoreManager
        || authUser.role === USER_ROLE.WarehouseKeeper;
      if (canLoadManagementStock) {
        dispatch(fetchStock());
      }
      dispatch(fetchAttendance({}));
      dispatch(syncPosBranch(authUser.branchId));
    }
  }, [dispatch, authUser]);

  return null;
};

export default AppBootstrap;
