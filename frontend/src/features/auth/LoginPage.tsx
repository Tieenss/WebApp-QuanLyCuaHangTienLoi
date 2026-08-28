import { useEffect, useState, type FC } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Divider,
  Form,
  Input,
  Space,
  Tag,
  Typography,
} from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { APP_FULL_NAME } from '@/config/brand';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearAuthError, loginSucceeded } from '@/store/slices/authSlice';
import { USER_ROLE_DESCRIPTION, USER_ROLE_LABEL, type LoginFormValues } from '@/types';
import { mockAccounts } from '@/mockData/accounts';
import './LoginPage.css';

const { Title, Text, Paragraph } = Typography;

/**
 * Module 0 — Trang Đăng nhập.
 *
 * Chỉ chứa phần form; khung 2 cột và panel thương hiệu do `AuthLayout` dựng,
 * việc chặn người đã đăng nhập cũng nằm ở layout đó.
 *
 * Có sẵn 3 tài khoản demo tương ứng 3 vai trò; bấm vào là tự điền form để
 * người xem thử được phân quyền ngay mà không cần tra tài liệu.
 */
export const LoginPage: FC = () => {
  const [form] = Form.useForm<LoginFormValues>();
  const dispatch = useAppDispatch();

  const error = useAppSelector((state) => state.auth.error);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Xoá lỗi cũ khi mở lại trang để không hiện thông báo của lần trước.
  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  const handleSubmit = (values: LoginFormValues): void => {
    setIsSubmitting(true);
    // Giả lập độ trễ mạng để trạng thái loading của nút hiển thị rõ.
    window.setTimeout(() => {
      dispatch(loginSucceeded(values));
      setIsSubmitting(false);
    }, 450);
  };

  /** Điền nhanh thông tin một tài khoản demo vào form. */
  const fillDemoAccount = (username: string, password: string): void => {
    form.setFieldsValue({ username, password, remember: true });
    dispatch(clearAuthError());
  };

  return (
    <div className="login-page">
      <Title level={3} className="login-title">
        Đăng nhập hệ thống
      </Title>
      <Paragraph type="secondary" className="login-subtitle">
        {APP_FULL_NAME}
      </Paragraph>

      {error !== null && (
        <Alert
          type="error"
          showIcon
          message={error}
          className="login-alert"
          closable
          onClose={() => dispatch(clearAuthError())}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        size="large"
        initialValues={{ remember: true }}
        onFinish={handleSubmit}
        requiredMark={false}
      >
        <Form.Item
          name="username"
          label="Tên đăng nhập"
          rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập.' }]}
        >
          <Input
            prefix={<UserOutlined className="login-input-icon" />}
            placeholder="admin / manager / cashier"
            autoComplete="username"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label="Mật khẩu"
          rules={[{ required: true, message: 'Vui lòng nhập mật khẩu.' }]}
        >
          <Input.Password
            prefix={<LockOutlined className="login-input-icon" />}
            placeholder="Nhập mật khẩu"
            autoComplete="current-password"
          />
        </Form.Item>

        <Form.Item name="remember" valuePropName="checked">
          <Checkbox>Ghi nhớ phiên đăng nhập trên máy này</Checkbox>
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          block
          size="large"
          loading={isSubmitting}
          className="login-submit-btn"
        >
          Đăng nhập
        </Button>
      </Form>

      <Divider plain className="login-divider">
        <Text type="secondary" className="login-divider-text">
          Tài khoản trải nghiệm theo vai trò
        </Text>
      </Divider>

      <Space direction="vertical" size={8} className="login-demo-list">
        {mockAccounts.map((account) => (
          <button
            type="button"
            key={account.id}
            className="demo-account-row"
            onClick={() => fillDemoAccount(account.username, account.password)}
          >
            <span className="demo-account-info">
              <Text strong className="demo-account-role">
                {USER_ROLE_LABEL[account.role]}
              </Text>
              <Text type="secondary" className="demo-account-desc">
                {USER_ROLE_DESCRIPTION[account.role]}
              </Text>
            </span>
            <Tag color="red" className="demo-account-tag">
              {account.username}
            </Tag>
          </button>
        ))}
      </Space>

      <Card size="small" className="login-hint-card">
        <Text type="secondary" className="login-hint-text">
          Mật khẩu dùng chung cho cả 3 tài khoản demo:{' '}
          <Text code copyable>
            circlek@123
          </Text>
        </Text>
      </Card>
    </div>
  );
};
