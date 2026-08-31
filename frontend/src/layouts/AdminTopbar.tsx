import { useMemo, type FC } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Dropdown,
  Input,
  Layout,
  Select,
  Tooltip,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  BellOutlined,
  IdcardOutlined,
  LockOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SearchOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getLandingPath } from '@/config/modules';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout, setActiveBranch, switchRole } from '@/store/slices/authSlice';
import {
  clearNotifications,
  setGlobalSearch,
  toggleSidebar,
} from '@/store/slices/uiSlice';
import { setPosBranch } from '@/store/slices/posSlice';
import {
  SYSTEM_WIDE_ROLES,
  USER_ROLE,
  USER_ROLE_LABEL,
  type UserRole,
} from '@/types';
import { lowStockBalances } from '@/store/slices/stockSlice';
import './AdminTopbar.css';

const { Header } = Layout;

/** Giá trị đại diện lựa chọn "toàn chuỗi" trong Select chi nhánh. */
const ALL_BRANCHES = '__ALL__';

/**
 * Thanh công cụ trên cùng của khu quản trị (Utility Surfaces).
 *
 * Tách khỏi `AdminLayout` vì đây là một khối chức năng độc lập: chọn phạm vi
 * chi nhánh, tìm kiếm, thông báo tồn kho, menu tài khoản. `AdminLayout` chỉ còn
 * việc dựng khung sidebar + vùng nội dung.
 */
export const AdminTopbar: FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { user, activeBranchId } = useAppSelector((state) => state.auth);
  const { isSidebarCollapsed, globalSearch } = useAppSelector((state) => state.ui);
  const branches = useAppSelector((state) => state.branch.branches);

  const role: UserRole = user?.role ?? USER_ROLE.Cashier;
  /** Admin và Kế toán xem số liệu tổng hợp nên được chọn "Toàn chuỗi". */
  const isSystemWide = SYSTEM_WIDE_ROLES.includes(role);

  /**
   * Chi nhánh người dùng được chọn.
   * Vai trò trụ sở thấy tất cả và có thêm lựa chọn "Toàn chuỗi".
   */
  const branchOptions = useMemo(() => {
    const allowed = user?.allowedBranchIds ?? [];
    const selectable =
      isSystemWide || allowed.length === 0
        ? branches
        : branches.filter((branch: { id: string }) => allowed.includes(branch.id));

    const options = selectable.map((branch: { id: string; code: string; name: string }) => ({
      value: branch.id,
      label: `${branch.code} — ${branch.name}`,
    }));

    return isSystemWide
      ? [{ value: ALL_BRANCHES, label: 'Toàn chuỗi (tất cả chi nhánh)' }, ...options]
      : options;
  }, [isSystemWide, user?.allowedBranchIds, branches]);

  /** Số mặt hàng dưới ngưỡng tồn tối thiểu — dùng làm badge thông báo. */
  const balances = useAppSelector((state) => state.stock.balances);
  const alertCount = useMemo(
    () => lowStockBalances(balances, activeBranchId).length,
    [balances, activeBranchId],
  );

  /** Menu tài khoản: hồ sơ, đổi mật khẩu, đăng xuất. */
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'account-profile',
      icon: <IdcardOutlined />,
      label: 'Tài khoản của tôi',
    },
    {
      key: 'account-password',
      icon: <LockOutlined />,
      label: 'Đổi mật khẩu',
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

    if (key === 'account-profile') {
      navigate('/account');
      return;
    }

    // Trang tài khoản dùng tab; `state.tab` cho nó biết mở tab nào.
    if (key === 'account-password') {
      navigate('/account', { state: { tab: 'password' } });
      return;
    }

    if (key.startsWith('role-')) {
      const nextRole = key.replace('role-', '') as UserRole;
      dispatch(switchRole(nextRole));
      // Mỗi vai trò có trang chính khác nhau; Dashboard chỉ mở cho Admin/Kế toán.
      navigate(getLandingPath(nextRole));
    }
  };

  /** Đổi chi nhánh: đồng bộ luôn chi nhánh của quầy POS. */
  const handleBranchChange = (value: string): void => {
    const branchId = value === ALL_BRANCHES ? null : value;
    dispatch(setActiveBranch(branchId));
    if (branchId !== null) {
      dispatch(setPosBranch(branchId));
    }
  };

  return (
    <Header className="app-header">
      <div className="header-left">
        <Button
          type="text"
          className="collapse-btn"
          aria-label={isSidebarCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          icon={isSidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => dispatch(toggleSidebar())}
        />

        <Select
          className="branch-select"
          value={activeBranchId ?? ALL_BRANCHES}
          options={branchOptions}
          onChange={handleBranchChange}
          prefix={<ShopOutlined className="branch-select-icon" />}
          // Cửa hàng nhiều nên cần tìm kiếm trong danh sách.
          showSearch
          optionFilterProp="label"
        />
      </div>

      <div className="header-right">
        <Input
          className="header-search"
          allowClear
          placeholder="Tìm sản phẩm, SKU, hoá đơn..."
          prefix={<SearchOutlined className="header-search-icon" />}
          value={globalSearch}
          onChange={(event) => dispatch(setGlobalSearch(event.target.value))}
        />

        <Button
          type="primary"
          className="pos-quick-btn"
          icon={<ShoppingCartOutlined />}
          onClick={() => navigate('/pos')}
        >
          <span>Màn hình POS</span>
        </Button>

        <Tooltip title={`${alertCount} mặt hàng dưới ngưỡng tồn tối thiểu`}>
          <Badge count={alertCount} overflowCount={99}>
            <Button
              type="text"
              shape="circle"
              aria-label="Thông báo tồn kho"
              icon={<BellOutlined className="bell-icon" />}
              onClick={() => dispatch(clearNotifications())}
            />
          </Badge>
        </Tooltip>

        <Dropdown
          menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
          placement="bottomRight"
          arrow
        >
          <div className="user-chip">
            <Avatar className="user-avatar" size={34}>
              {user?.avatarText ?? 'CK'}
            </Avatar>
            <div className="user-meta">
              <span className="user-name">{user?.fullName ?? 'Khách'}</span>
              <span className="user-role">{USER_ROLE_LABEL[role]}</span>
            </div>
            <SwapOutlined className="user-chip-swap" />
          </div>
        </Dropdown>
      </div>
    </Header>
  );
};
