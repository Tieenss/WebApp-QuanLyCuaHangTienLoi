import type { FC } from 'react';
import { Typography } from 'antd';
import { CheckCircleOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { APP_VERSION } from '@/config/brand';
import { getLandingPath } from '@/config/modules';
import { useAppSelector } from '@/store/hooks';
import logo from '@/assets/logo.png';
import './AuthLayout.css';

const { Text } = Typography;

/** Điểm nhấn năng lực hệ thống, hiển thị ở panel thương hiệu. */
const HIGHLIGHTS: readonly string[] = [
  'Bán hàng POS quét mã vạch, thanh toán đa phương thức',
  'Tồn kho và thẻ kho theo từng chi nhánh, kho tổng',
  'Nhập kho từ NCC, luân chuyển nội bộ, kiểm kê cân bằng',
  'Chấm công theo ca và bảng lương dự kiến',
  'Sổ quỹ thu chi tiền mặt và chuyển khoản',
  'Báo cáo doanh thu, lợi nhuận, hàng bán chạy, hao hụt',
];

/**
 * Khung giao diện cho khu vực xác thực (Đăng nhập, và sau này là Quên mật khẩu
 * / Đặt lại mật khẩu).
 *
 * Hai việc layout này đảm nhiệm:
 * 1. Dựng khung 2 cột (panel thương hiệu + vùng form) để mọi trang auth có
 *    cùng nhịp thị giác — trang con chỉ cần render phần form của mình.
 * 2. Chặn ngược chiều với `ProtectedRoute`: người đã đăng nhập không có việc gì
 *    ở đây nữa, nên đẩy thẳng về trang chính theo vai trò. Trước đây logic này
 *    nằm trong `LoginPage`, đặt ở layout thì mọi trang auth thêm về sau đều
 *    được bảo vệ mà không phải lặp lại.
 */
export const AuthLayout: FC = () => {
  const location = useLocation();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  if (isAuthenticated && user !== null) {
    // `from` do ProtectedRoute gắn vào khi chặn một URL cần quyền: đăng nhập
    // xong thì trả người dùng về đúng chỗ họ định tới.
    const state = location.state as { from?: string } | null;
    return <Navigate to={state?.from ?? getLandingPath(user.role)} replace />;
  }

  return (
    <div className="auth-layout">
      <aside className="auth-brand-panel">
        <div className="auth-brand-content">
          <span className="auth-brand-badge">
            <SafetyCertificateOutlined /> ERP MVP {APP_VERSION}
          </span>

          <h2 className="auth-brand-title">
            Hệ thống ERP quản lý
            <br />
            chuỗi cửa hàng tiện lợi
          </h2>

          <p className="auth-brand-desc">
            Quản trị tập trung 14 phân hệ nghiệp vụ cho toàn bộ chuỗi Circle K: từ
            quầy bán hàng, kho hàng, nhân sự cho tới tài chính và báo cáo quản trị.
          </p>

          <div className="auth-feature-list">
            {HIGHLIGHTS.map((item) => (
              <div className="auth-feature-item" key={item}>
                <CheckCircleOutlined />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <Text className="auth-copyright">
          © {new Date().getFullYear()} Circle K Việt Nam — Dữ liệu mô phỏng phục vụ
          trình diễn.
        </Text>
      </aside>

      <main className="auth-form-panel">
        <div className="auth-form-inner">
          <img src={logo} alt="Circle K" className="auth-logo" />
          <Outlet />
        </div>
      </main>
    </div>
  );
};
