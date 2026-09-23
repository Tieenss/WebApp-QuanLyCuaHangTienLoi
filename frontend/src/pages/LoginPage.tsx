import React from 'react';
import { Form, Input, Button, Checkbox, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { Navigate, useNavigate } from 'react-router-dom';
import { FireOutlined, SafetyOutlined, ShopOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store';
import { loginAsync } from '../store/slices/authSlice';
import type { LoginFormValues } from '../types';
import logo from '../assets/logo.png';
import './LoginPage.css';

const { Title, Text } = Typography;



export const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch<any>();
    const isAuthenticated = useSelector((state: RootState) => !!state.auth.user);
    const isSubmitting = useSelector((state: RootState) => state.auth.isSubmitting);

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    const handleLogin = async (values: LoginFormValues) => {
        try {
            await dispatch(loginAsync(values)).unwrap();
            message.success(`Đăng nhập thành công!`);
            navigate('/');
        } catch (error: any) {
            message.error(error || 'Đăng nhập thất bại!');
        }
    };

    return (
        <div className="login-page">
            {/* Brand Panel */}
            <div className="login-brand-panel">
                <div className="login-brand-content">
                    <img src={logo} alt="Circle K" className="login-brand-logo" />
                    <h1 className="login-brand-title">CIRCLE K</h1>
                    <span className="login-brand-subtitle">CONVENIENCE ERP SYSTEM</span>

                    <ul className="login-brand-features">
                        <li><ShopOutlined /> Quản lý chuỗi cửa hàng tiện lợi đa chi nhánh</li>
                        <li><FireOutlined /> Bán hàng POS nhanh — đối soát ca tự động</li>
                        <li><SafetyOutlined /> Bảo mật phân quyền theo vai trò nhân viên</li>
                    </ul>

                    <Text className="login-brand-footer">
                        © {new Date().getFullYear()} Circle K Vietnam — Internal Use Only
                    </Text>
                </div>
            </div>

            {/* Form Panel */}
            <div className="login-form-panel">
                <div className="login-form-box">
                    <Text type="secondary" className="login-welcome-label">
                        CHÀO MỪNG TRỞ LẠI
                    </Text>
                    <Title level={2} className="login-heading">
                        Đăng Nhập Hệ Thống
                    </Title>
                    <Text type="secondary" className="login-description">
                        Sử dụng tài khoản nhân viên được cấp bởi quản lý chi nhánh.
                    </Text>

                    <Form<LoginFormValues>
                        layout="vertical"
                        onFinish={handleLogin}
                        initialValues={{ remember: true, role: 'manager' }}
                        autoComplete="off"
                    >
                        <Form.Item
                            name="username"
                            label="Tên Đăng Nhập"
                            rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập!' }]}
                        >
                            <Input
                                prefix={<UserOutlined className="login-input-icon" />}
                                placeholder="VD: nv-anh.tran"
                                size="large"
                            />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            label="Mật Khẩu"
                            rules={[
                                { required: true, message: 'Vui lòng nhập mật khẩu!' },
                                { min: 6, message: 'Mật khẩu tối thiểu 6 ký tự!' },
                            ]}
                        >
                            <Input.Password
                                prefix={<LockOutlined className="login-input-icon" />}
                                placeholder="••••••••"
                                size="large"
                            />
                        </Form.Item>


                        <div className="login-options-row">
                            <Form.Item name="remember" valuePropName="checked" className="login-remember-item">
                                <Checkbox>Ghi nhớ đăng nhập</Checkbox>
                            </Form.Item>
                            <Button type="link" className="login-forgot-btn">
                                Quên mật khẩu?
                            </Button>
                        </div>

                        <Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                size="large"
                                block
                                className="login-submit-btn"
                                loading={isSubmitting}
                            >
                                Đăng Nhập
                            </Button>
                        </Form.Item>
                    </Form>


                </div>
            </div>
        </div>
    );
};
