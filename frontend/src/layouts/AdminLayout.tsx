import { useMemo, type FC } from 'react';
import { Breadcrumb, Layout, Menu, Space, Tag, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ModuleIcon } from '@/components/ModuleIcon';
import { APP_FULL_NAME, APP_NAME, APP_VERSION } from '@/config/brand';
import {
  MODULE_BY_PATH,
  MODULE_GROUP_LABEL,
  MODULE_GROUP_ORDER,
  getModulesForRole,
  type ModuleDefinition,
} from '@/config/modules';
import { useAppSelector } from '@/store/hooks';
import { USER_ROLE, type UserRole } from '@/types';
import { AdminTopbar } from './AdminTopbar';
import logo from '@/assets/logo.png';
import './AdminLayout.css';

const { Sider, Content, Footer } = Layout;
const { Text } = Typography;

/**
 * Khung giao diện khu quản trị: sidebar điều hướng 13 module + vùng nội dung.
 *
 * Topbar được tách sang `AdminTopbar` — nó là một khối chức năng độc lập
 * (chọn chi nhánh, tìm kiếm, thông báo, tài khoản) và không chia sẻ state nào
 * với sidebar ngoài `isSidebarCollapsed`, thứ đã nằm trong Redux.
 *
 * Quầy bán hàng dùng `PosLayout`, khu đăng nhập dùng `AuthLayout` — cả hai
 * không đi qua đây.
 */
export const AdminLayout: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const role: UserRole = useAppSelector(
    (state) => state.auth.user?.role ?? USER_ROLE.Cashier,
  );
  const isSidebarCollapsed = useAppSelector((state) => state.ui.isSidebarCollapsed);

  /** Module mà vai trò hiện tại được phép thấy. */
  const visibleModules = useMemo(() => getModulesForRole(role), [role]);

  /** Menu sidebar, nhóm theo `MODULE_GROUP_ORDER`. */
  const menuItems = useMemo<MenuProps['items']>(() => {
    const grouped = MODULE_GROUP_ORDER.map((groupKey) => {
      const modulesInGroup = visibleModules.filter(
        (module) => module.group === groupKey,
      );
      if (modulesInGroup.length === 0) return null;

      return {
        key: `group-${groupKey}`,
        type: 'group' as const,
        label: MODULE_GROUP_LABEL[groupKey],
        children: modulesInGroup.map((module: ModuleDefinition) => ({
          key: module.path,
          icon: <ModuleIcon name={module.icon} />,
          label: module.label,
        })),
      };
    });

    return grouped.filter((group) => group !== null);
  }, [visibleModules]);

  /** Module tương ứng URL hiện tại, dùng cho breadcrumb. */
  const currentModule = MODULE_BY_PATH[location.pathname];

  const breadcrumbItems = useMemo(() => {
    const items = [
      {
        title: (
          <>
            <HomeOutlined /> <span>{APP_NAME}</span>
          </>
        ),
      },
    ];

    if (currentModule) {
      items.push({
        title: <span>{MODULE_GROUP_LABEL[currentModule.group]}</span>,
      });
      items.push({
        title: <span className="breadcrumb-current">{currentModule.shortLabel}</span>,
      });
    }

    return items;
  }, [currentModule]);

  return (
    <Layout className="app-layout">
      <Sider
        theme="dark"
        trigger={null}
        collapsible
        collapsed={isSidebarCollapsed}
        width={256}
        collapsedWidth={72}
        className="app-sider"
      >
        <div className="brand-block">
          <img src={logo} alt="Circle K" className="brand-logo" />
          {!isSidebarCollapsed && (
            <div>
              <h1 className="brand-name">CIRCLE K</h1>
              <span className="brand-tagline">Convenience ERP</span>
            </div>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          items={menuItems}
          selectedKeys={[location.pathname]}
          onClick={({ key }) => navigate(key)}
          className="sider-menu"
        />

        {!isSidebarCollapsed && (
          <div className="sider-footer">
            {APP_FULL_NAME}
            <br />
            Phiên bản {APP_VERSION}
          </div>
        )}
      </Sider>

      <Layout>
        <AdminTopbar />

        <div className="app-breadcrumb">
          <Space size={12} wrap>
            <Breadcrumb items={breadcrumbItems} />
            {currentModule !== undefined && !currentModule.implemented && (
              <Tag color="gold" className="dev-status-tag">
                Đang phát triển
              </Tag>
            )}
          </Space>
        </div>

        <Content className="app-content">
          <Outlet />
        </Content>

        <Footer className="app-footer">
          <Text type="secondary" className="app-footer-text">
            {APP_FULL_NAME} — © {new Date().getFullYear()} Circle K Việt Nam. Dữ liệu
            trong bản {APP_VERSION} là dữ liệu mô phỏng.
          </Text>
        </Footer>
      </Layout>
    </Layout>
  );
};
