import { useEffect, type FC } from 'react';
import {
  Alert,
  Button,
  Form,
  Input,
  Checkbox,
  Typography,
} from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { APP_FULL_NAME } from '@/config/brand';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearAuthError, loginAsync } from '@/store/slices/authSlice';
import type { LoginFormValues } from '@/types';
import './LoginPage.css';

const { Title, Paragraph } = Typography;

export const LoginPage: FC = () => {
  const [form] = Form.useForm<LoginFormValues>();
  const dispatch = useAppDispatch();

  const error = useAppSelector((state) => state.auth.error);
  const isSubmitting = useAppSelector((state) => state.auth.isSubmitting);

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  const handleSubmit = (values: LoginFormValues): void => {
    dispatch(loginAsync(values));
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
            placeholder="Nhập tên đăng nhập"
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
    </div>
  );
};
