import type { FC } from 'react';
import { Button, Card, Result } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import { getLandingPath } from '@/config/modules';
import { USER_ROLE } from '@/types';

/** Trang 404 cho các URL không khớp module nào. */
export const NotFoundPage: FC = () => {
  const navigate = useNavigate();
  const role = useAppSelector((state) => state.auth.user?.role) ?? USER_ROLE.Cashier;

  return (
    <Card>
      <Result
        status="404"
        title="Không tìm thấy trang"
        subTitle="Đường dẫn bạn truy cập không tồn tại hoặc đã được thay đổi."
        extra={
          <Button type="primary" onClick={() => navigate(getLandingPath(role))}>
            Về trang chính
          </Button>
        }
      />
    </Card>
  );
};