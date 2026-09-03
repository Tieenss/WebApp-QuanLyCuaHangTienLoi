import { useEffect, type FC } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { fetchCategories } from '@/store/slices/categorySlice';
import { fetchSuppliers } from '@/store/slices/supplierSlice';
import { fetchBranches } from '@/store/slices/branchSlice';
import { fetchStock } from '@/store/slices/stockSlice';
import { fetchEmployees } from '@/store/slices/employeeSlice';
import { fetchProducts } from '@/store/slices/productSlice';
import { fetchAttendance } from '@/store/slices/attendanceSlice';

/**
 * Load dữ liệu dùng chung (master data) 1 lần khi app khởi động.
 * Tránh mỗi trang phải tự dispatch fetch tránh duplicate.
 */
export const AppBootstrap: FC = () => {
  const dispatch = useAppDispatch();
  const authUser = useAppSelector((state) => state.auth.user);

  useEffect(() => {
    // Master data
    dispatch(fetchCategories());
    dispatch(fetchSuppliers());
    dispatch(fetchBranches());
    dispatch(fetchEmployees());
    dispatch(fetchProducts());
    // Chỉ load data nhạy cảm khi đã đăng nhập
    if (authUser) {
      dispatch(fetchStock());
      dispatch(fetchAttendance());
    }
  }, [dispatch, authUser]);

  return null;
};

export default AppBootstrap;