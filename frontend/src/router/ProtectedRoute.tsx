import type { FC, ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Result, Button } from 'antd';
import { useAppSelector } from '@/store/hooks';
import { canAccessPath, getLandingPath } from '@/config/modules';

interface ProtectedRouteProps {
  children: ReactElement;
}

/**
 * Chặn truy cập ở 2 lớp:
 * 1. Chưa đăng nhập → chuyển về `/login`, giữ lại URL đích để quay lại sau.
 * 2. Đã đăng nhập nhưng vai trò không có quyền → hiện trang 403 thay vì
 *    redirect âm thầm, để người dùng biết rõ vì sao không vào được.
 */
export const ProtectedRoute: FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  if (!isAuthenticated || user === null) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!canAccessPath(user.role, location.pathname)) {
    return (
      <Result
        status="403"
        title="Không có quyền truy cập"
        subTitle={`Vai trò của bạn không được phép mở chức năng này. Vui lòng liên hệ Admin chuỗi nếu cần cấp thêm quyền.`}
        extra={
          <Button type="primary" href={getLandingPath(user.role)}>
            Về trang chính
          </Button>
        }
      />
    );
  }

  return children;
};