import { useEffect, useState, type FC } from 'react';
import {
  Alert,
  App as AntdApp,
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Form,
  Input,
  Popconfirm,
  Row,
  Space,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import {
  IdcardOutlined,
  LockOutlined,
  LogoutOutlined,
  MailOutlined,
  PhoneOutlined,
  SaveOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { RecordStatusTag } from '@/components/StatusTag';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  changePassword,
  clearAuthError,
  logout,
  updateProfile,
} from '@/store/slices/authSlice';
import {
  USER_ROLE_DESCRIPTION,
  USER_ROLE_LABEL,
  type ChangePasswordFormValues,
  type ProfileFormValues,
} from '@/types';
import { branchNameById } from '@/mockData/branches';
import './AccountPage.css';

const { Text, Paragraph } = Typography;

/** Độ dài mật khẩu tối thiểu khi đặt lại. */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Trang "Tài khoản của tôi" — hồ sơ cá nhân, đổi mật khẩu, đăng xuất.
 *
 * Gộp trong một trang 2 tab thay vì tách 2 route: cả hai đều thao tác trên
 * cùng một đối tượng (người đang đăng nhập) và đều ngắn, tách ra chỉ làm người
 * dùng phải điều hướng thêm một bước.
 *
 * Mọi vai trò đều vào được — `canAccessPath` trả `true` với path không nằm
 * trong registry module, nên thu ngân cũng tự đổi được mật khẩu.
 */
export const AccountPage: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { message } = AntdApp.useApp();

  const { user, activeBranchId, sessionPassword } = useAppSelector(
    (state) => state.auth,
  );

  const [profileForm] = Form.useForm<ProfileFormValues>();
  const [passwordForm] = Form.useForm<ChangePasswordFormValues>();

  // Menu tài khoản trên topbar có mục "Đổi mật khẩu" trỏ thẳng vào tab thứ hai.
  const requestedTab = (location.state as { tab?: string } | null)?.tab;
  const [activeTab, setActiveTab] = useState(
    requestedTab === 'password' ? 'password' : 'profile',
  );

  // Xoá lỗi còn sót từ lần đăng nhập trước để không hiện thông báo cũ.
  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  if (user === null) return null;

  const handleProfileSubmit = (values: ProfileFormValues): void => {
    dispatch(updateProfile(values));
    message.success('Đã cập nhật hồ sơ cá nhân.');
  };

  const handlePasswordSubmit = (values: ChangePasswordFormValues): void => {
    dispatch(changePassword(values));
    passwordForm.resetFields();
    message.success('Đã đổi mật khẩu. Lần đăng nhập sau hãy dùng mật khẩu mới.');
  };

  const handleLogout = (): void => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  return (
    <>
      <PageHeader
        eyebrow="TÀI KHOẢN"
        title="Tài khoản của tôi"
        description="Xem và cập nhật thông tin cá nhân, đổi mật khẩu đăng nhập."
        extra={
          <Popconfirm
            title="Đăng xuất khỏi hệ thống?"
            description="Phiên làm việc hiện tại sẽ kết thúc."
            okText="Đăng xuất"
            cancelText="Ở lại"
            okButtonProps={{ danger: true }}
            onConfirm={handleLogout}
          >
            <Button danger icon={<LogoutOutlined />}>
              Đăng xuất
            </Button>
          </Popconfirm>
        }
      />

      <Row gutter={[16, 16]}>
        {/* Cột trái: thẻ nhận diện, thông tin do quản trị cấp (chỉ đọc). */}
        <Col xs={24} xl={8}>
          <Card className="account-identity-card">
            <Space direction="vertical" size={14} className="account-identity-inner">
              <Avatar size={72} className="account-avatar">
                {user.avatarText}
              </Avatar>

              <Space direction="vertical" size={2} className="account-name-block">
                <Text strong className="account-fullname">
                  {user.fullName}
                </Text>
                <Tag color="red" className="tag-no-margin">
                  {USER_ROLE_LABEL[user.role]}
                </Tag>
              </Space>

              <Paragraph type="secondary" className="account-role-desc">
                {USER_ROLE_DESCRIPTION[user.role]}
              </Paragraph>

              <Divider className="account-divider" />

              {/* Các trường dưới đây do quản trị cấp, người dùng không tự sửa. */}
              <Descriptions column={1} size="small" className="account-meta">
                <Descriptions.Item label="Mã nhân viên">
                  <span className="mono-code">{user.employeeCode}</span>
                </Descriptions.Item>
                <Descriptions.Item label="Chi nhánh">
                  {branchNameById(user.branchId)}
                </Descriptions.Item>
                <Descriptions.Item label="Đang xem">
                  {branchNameById(activeBranchId)}
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <RecordStatusTag status={user.status} />
                </Descriptions.Item>
              </Descriptions>

              <Text type="secondary" className="account-meta-note">
                Mã nhân viên, vai trò và chi nhánh do Admin chuỗi phân công. Liên hệ
                quản trị nếu cần thay đổi.
              </Text>
            </Space>
          </Card>
        </Col>

        {/* Cột phải: form người dùng tự sửa. */}
        <Col xs={24} xl={16}>
          <Card>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                {
                  key: 'profile',
                  label: (
                    <Space size={6}>
                      <IdcardOutlined />
                      Hồ sơ cá nhân
                    </Space>
                  ),
                  children: (
                    <Form<ProfileFormValues>
                      form={profileForm}
                      layout="vertical"
                      requiredMark={false}
                      initialValues={{
                        fullName: user.fullName,
                        email: user.email,
                        phone: user.phone,
                      }}
                      onFinish={handleProfileSubmit}
                    >
                      <Row gutter={16}>
                        <Col xs={24} md={12}>
                          <Form.Item
                            name="fullName"
                            label="Họ và tên"
                            rules={[
                              { required: true, message: 'Vui lòng nhập họ và tên.' },
                              { min: 3, message: 'Họ và tên quá ngắn.' },
                            ]}
                          >
                            <Input
                              prefix={<UserOutlined className="account-input-icon" />}
                              placeholder="Nguyễn Văn A"
                            />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={12}>
                          <Form.Item
                            name="phone"
                            label="Số điện thoại"
                            rules={[
                              {
                                required: true,
                                message: 'Vui lòng nhập số điện thoại.',
                              },
                              {
                                // Cho phép khoảng trắng vì mock data dùng dạng
                                // "0903 118 224".
                                pattern: /^0\d[\d\s]{7,12}$/,
                                message: 'Số điện thoại không hợp lệ.',
                              },
                            ]}
                          >
                            <Input
                              prefix={<PhoneOutlined className="account-input-icon" />}
                              placeholder="0900 000 000"
                            />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={16}>
                          <Form.Item
                            name="email"
                            label="Email"
                            rules={[
                              { required: true, message: 'Vui lòng nhập email.' },
                              { type: 'email', message: 'Email không hợp lệ.' },
                            ]}
                          >
                            <Input
                              prefix={<MailOutlined className="account-input-icon" />}
                              placeholder="ten@circlek.vn"
                            />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Space>
                        <Button
                          type="primary"
                          htmlType="submit"
                          icon={<SaveOutlined />}
                        >
                          Lưu thay đổi
                        </Button>
                        <Button onClick={() => profileForm.resetFields()}>
                          Hoàn tác
                        </Button>
                      </Space>
                    </Form>
                  ),
                },
                {
                  key: 'password',
                  label: (
                    <Space size={6}>
                      <LockOutlined />
                      Đổi mật khẩu
                    </Space>
                  ),
                  children: (
                    <>
                      {/* Phiên khôi phục từ localStorage không giữ mật khẩu. */}
                      {sessionPassword === null && (
                        <Alert
                          type="warning"
                          showIcon
                          className="account-alert"
                          message="Cần đăng nhập lại"
                          description="Phiên hiện tại được khôi phục từ lần đăng nhập trước nên hệ thống không xác thực được mật khẩu cũ. Vui lòng đăng xuất và đăng nhập lại để đổi mật khẩu."
                        />
                      )}

                      <Form<ChangePasswordFormValues>
                        form={passwordForm}
                        layout="vertical"
                        requiredMark={false}
                        onFinish={handlePasswordSubmit}
                      >
                        <Row gutter={16}>
                          <Col xs={24} md={12}>
                            <Form.Item
                              name="currentPassword"
                              label="Mật khẩu hiện tại"
                              rules={[
                                {
                                  required: true,
                                  message: 'Vui lòng nhập mật khẩu hiện tại.',
                                },
                                {
                                  // Xác thực ngay tại field để lỗi hiện đúng
                                  // chỗ người dùng cần sửa.
                                  validator: (_rule, value: string) =>
                                    value === undefined ||
                                    value === '' ||
                                    value === sessionPassword
                                      ? Promise.resolve()
                                      : Promise.reject(
                                          new Error('Mật khẩu hiện tại không đúng.'),
                                        ),
                                },
                              ]}
                            >
                              <Input.Password
                                prefix={<LockOutlined className="account-input-icon" />}
                                placeholder="Nhập mật khẩu đang dùng"
                                autoComplete="current-password"
                              />
                            </Form.Item>
                          </Col>
                        </Row>

                        <Row gutter={16}>
                          <Col xs={24} md={12}>
                            <Form.Item
                              name="newPassword"
                              label="Mật khẩu mới"
                              dependencies={['currentPassword']}
                              rules={[
                                {
                                  required: true,
                                  message: 'Vui lòng nhập mật khẩu mới.',
                                },
                                {
                                  min: MIN_PASSWORD_LENGTH,
                                  message: `Mật khẩu tối thiểu ${MIN_PASSWORD_LENGTH} ký tự.`,
                                },
                                {
                                  validator: (_rule, value: string) =>
                                    value === undefined || value !== sessionPassword
                                      ? Promise.resolve()
                                      : Promise.reject(
                                          new Error(
                                            'Mật khẩu mới phải khác mật khẩu hiện tại.',
                                          ),
                                        ),
                                },
                              ]}
                            >
                              <Input.Password
                                prefix={<LockOutlined className="account-input-icon" />}
                                placeholder={`Tối thiểu ${MIN_PASSWORD_LENGTH} ký tự`}
                                autoComplete="new-password"
                              />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={12}>
                            <Form.Item
                              name="confirmPassword"
                              label="Nhập lại mật khẩu mới"
                              // Phụ thuộc field trên để antd validate lại khi
                              // người dùng sửa mật khẩu mới.
                              dependencies={['newPassword']}
                              rules={[
                                {
                                  required: true,
                                  message: 'Vui lòng nhập lại mật khẩu mới.',
                                },
                                ({ getFieldValue }) => ({
                                  validator: (_rule, value: string) =>
                                    value === undefined ||
                                    value === getFieldValue('newPassword')
                                      ? Promise.resolve()
                                      : Promise.reject(
                                          new Error('Hai mật khẩu không khớp.'),
                                        ),
                                }),
                              ]}
                            >
                              <Input.Password
                                prefix={<LockOutlined className="account-input-icon" />}
                                placeholder="Nhập lại để xác nhận"
                                autoComplete="new-password"
                              />
                            </Form.Item>
                          </Col>
                        </Row>

                        <Space>
                          <Button
                            type="primary"
                            htmlType="submit"
                            icon={<SaveOutlined />}
                            disabled={sessionPassword === null}
                          >
                            Đổi mật khẩu
                          </Button>
                          <Button onClick={() => passwordForm.resetFields()}>
                            Xoá form
                          </Button>
                        </Space>
                      </Form>
                    </>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
};
