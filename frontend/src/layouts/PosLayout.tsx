import { useMemo, type FC } from 'react';
import { Avatar, Button, Dropdown, Layout, Select, Tag, Typography } from 'antd';
import type { MenuProps } from 'antd';
import {
  AppstoreOutlined,
  IdcardOutlined,
  LogoutOutlined,
  ShopOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout, setActiveBranch } from '@/store/slices/authSlice';
import { setPosBranch } from '@/store/slices/posSlice';
import {
  SHIFT_CODE,
  SHIFT_SHORT_LABEL,
  USER_ROLE,
  USER_ROLE_LABEL,
  type ShiftCode,
  type UserRole,
} from '@/types';
import logo from '@/assets/logo.png';
import './PosLayout.css';

const { Header, Content } = Layout;

/** Ca làm việc tương ứng giờ hiện tại. */
const currentShift = (): ShiftCode => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 14) return SHIFT_CODE.Morning;
  if (hour >= 14 && hour < 22) return SHIFT_CODE.Afternoon;
  return SHIFT_CODE.Night;
};

/**
 * Khung giao diện không gian bán hàng (POS).
 *
 * Vì sao POS cần layout riêng thay vì dùng chung `AdminLayout`:
 * 1. Thu ngân chỉ được phép vào đúng `/pos`, nên sidebar 13 module là thứ họ
 *    không bao giờ dùng nhưng vẫn ăn 256px chiều ngang của lưới sản phẩm.
 * 2. Breadcrumb và footer vô nghĩa ở quầy — thao tác tại đây là quét, bấm,
 *    thu tiền, không phải điều hướng.
 * 3. Topbar POS cần thông tin khác hẳn admin: ca bán hàng, số hoá đơn đã lập
 *    trong phiên, quầy đang bán. Không cần ô tìm kiếm toàn cục hay badge tồn kho.
 *
 * Quản lý và Admin chuỗi vẫn vào được `/pos`, nên có nút quay lại khu quản trị.
 */
export const PosLayout: FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const user = useAppSelector((state) => state.auth.user);
  const branchId = useAppSelector((state) => state.pos.branchId);
  const sessionOrderCount = useAppSelector((state) => state.pos.sessionOrderCount);
  const branches = useAppSelector((state) => state.branch.branches);

  const role: UserRole = user?.role ?? USER_ROLE.Cashier;
  /** Thu ngân không có quyền vào bất kỳ trang quản trị nào. */
  const isCashier = role === USER_ROLE.Cashier;

  /**
   * Quầy bán được: chỉ cửa hàng đang hoạt động (kho tổng không có POS), và
   * thu hẹp theo chi nhánh người dùng được phân công. Mảng rỗng = không giới hạn.
   *
   * Thu ngân / quản lý chi nhánh chỉ thấy đúng chi nhánh của mình — không
   * chọn được quầy khác. Vai trò trụ sở (branchId null) mới thấy toàn bộ.
   */
  const branchOptions = useMemo(() => {
    const allowed = user?.allowedBranchIds ?? [];
    const activeStores = branches.filter((b: { status: string }) => b.status === 'Active');
    const selectable =
      allowed.length === 0
        ? activeStores
        : activeStores.filter((branch: { id: string }) => allowed.includes(branch.id));

    const ownBranch = user?.branchId ?? null;
    const visible =
      ownBranch === null
        ? selectable
        : selectable.filter((branch: { id: string }) => branch.id === ownBranch);

    return visible.map((branch: { id: string; code: string; name: string }) => ({
      value: branch.id,
      label: `${branch.code} — ${branch.name}`,
    }));
  }, [user?.allowedBranchIds, user?.branchId, branches]);

  /**
   * Thu ngân bị khoá theo chi nhánh được phân công nên Select chỉ để hiển thị;
   * chỉ vai trò trụ sở (không có branchId) mới đổi được quầy.
   */
  const canSwitchBranch = (user?.branchId ?? null) === null;

  /** Đổi quầy bán: đồng bộ luôn chi nhánh đang xem của khu quản trị. */
  const handleBranchChange = (value: string): void => {
    dispatch(setPosBranch(value));
    dispatch(setActiveBranch(value));
  };

  /** Menu tài khoản: hồ sơ, đăng xuất. */
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'account',
      icon: <IdcardOutlined />,
      label: 'Tài khoản của tôi',
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      danger: true,
    },
  ];

  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'logout') {
      dispatch(logout());
      navigate('/login', { replace: true });
      return;
    }

    if (key === 'account') {
      navigate('/account');
      return;
    }
  };

  return (
    <Layout className="pos-shell">
      <Header className="pos-topbar">
        <div className="pos-topbar-left">
          <div className="pos-brand">
            <img src={logo} alt="Circle K" className="pos-brand-logo" />
            <div className="pos-brand-text">
              <span className="pos-brand-name">CIRCLE K</span>
              <span className="pos-brand-tagline">Quầy bán hàng</span>
            </div>
          </div>

          <Select
            className="pos-branch-select"
            value={branchId || undefined}
            placeholder="Chưa gán chi nhánh"
            options={branchOptions}
            onChange={handleBranchChange}
            disabled={!canSwitchBranch || branchOptions.length === 0}
            prefix={<ShopOutlined className="pos-branch-icon" />}
            showSearch={canSwitchBranch}
            optionFilterProp="label"
          />
        </div>

        <div className="pos-topbar-right">
          <Tag className="pos-chip pos-chip-shift">
            Ca {SHIFT_SHORT_LABEL[currentShift()]}
          </Tag>

          <Tag className="pos-chip pos-chip-session">
            Đã bán trong phiên:{' '}
            <Typography.Text className="pos-chip-count">
              {sessionOrderCount}
            </Typography.Text>
          </Tag>

          {/* Thu ngân không có quyền vào khu quản trị nên ẩn nút này. */}
          {!isCashier && (
            <Button
              type="text"
              className="pos-admin-btn"
              icon={<AppstoreOutlined />}
              onClick={() => navigate('/dashboard')}
            >
              <span className="pos-admin-btn-text">Khu quản trị</span>
            </Button>
          )}

          <Dropdown
            menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
            placement="bottomRight"
            arrow
          >
            <div className="pos-user-chip">
              <Avatar className="pos-user-avatar" size={30}>
                {user?.avatarText ?? 'CK'}
              </Avatar>
              <div className="pos-user-meta">
                <span className="pos-user-name">{user?.fullName ?? 'Khách'}</span>
                <span className="pos-user-role">{USER_ROLE_LABEL[role]}</span>
              </div>
              <SwapOutlined className="pos-user-chip-swap" />
            </div>
          </Dropdown>
        </div>
      </Header>

      <Content className="pos-content">
        <Outlet />
      </Content>
    </Layout>
  );
};
