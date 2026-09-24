import React from 'react';
import { Navigate } from 'react-router-dom';
import { Result, Typography } from 'antd';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { hasPermission, ROLE_LABEL } from '../config/rbacConfig';
import type { Permission } from '../config/rbacConfig';

const { Text } = Typography;

/**
 * Chặn truy cập khi chưa đăng nhập.
 */
export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const user = useSelector((state: RootState) => state.auth.user);

    if (!user) {
        return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
};

interface RequirePermissionProps {
    permission: Permission;
    children: React.ReactNode;
}

/**
 * Hiển thị trang 403 nếu tài khoản không có quyền.
 */
export const RequirePermission: React.FC<RequirePermissionProps> = ({
    permission,
    children,
}) => {
    const user = useSelector((state: RootState) => state.auth.user);
    const allowed = hasPermission(user, permission);

    if (!allowed) {
        return (
            <Result
                status="403"
                title="403"
                subTitle="Rất tiếc, bạn không có quyền truy cập chức năng này."
                extra={
                    <Text type="secondary">
                        Vai trò hiện tại của bạn: <strong>{user ? ROLE_LABEL[user.role] : '—'}</strong>
                    </Text>
                }
            />
        );
    }
    return <>{children}</>;
};
