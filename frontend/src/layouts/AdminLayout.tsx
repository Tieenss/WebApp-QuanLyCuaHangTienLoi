import React from 'react';
import { Layout, Menu, Input, Badge, Avatar, Dropdown, Select, Button, Typography, Space } from 'antd';
import {
    DashboardOutlined,
    ShoppingCartOutlined,
    AppstoreOutlined,
    InboxOutlined,
    FileTextOutlined,
    UsergroupAddOutlined,
    BarChartOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    BellOutlined,
    SearchOutlined,
    LogoutOutlined,
    ShopOutlined,
    SettingOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import { toggleSidebar, setSelectedBranch, clearNotifications } from '../store/slices/dashboardSlice';
import './AdminLayout.css';
import logo from '../assets/logo.png';

const { Header, Sider, Content, Footer } = Layout;
const { Text } = Typography;

export const AdminLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();

    const { isSidebarCollapsed, selectedBranchId, notificationCount } = useSelector(
        (state: RootState) => state.dashboard
    );

    const menuItems = [
        {
            key: '/',
            icon: <DashboardOutlined className="menu-item-icon" />,
            label: 'Tổng Quan Dashboard',
        },
        {
            key: '/pos',
            icon: <ShoppingCartOutlined className="menu-item-icon" />,
            label: 'Bán Hàng POS',
        },
        {
            key: '/products',
            icon: <AppstoreOutlined className="menu-item-icon" />,
            label: 'Quản Lý Sản Phẩm',
        },
        {
            key: '/inventory',
            icon: <InboxOutlined className="menu-item-icon" />,
            label: 'Quản Lý Tồn Kho',
        },
        {
            key: '/suppliers',
            icon: <ShopOutlined className="menu-item-icon" />,
            label: 'Quản Lý Nhà Cung Cấp',
        },
        {
            key: '/orders',
            icon: <FileTextOutlined className="menu-item-icon" />,
            label: 'Đơn Hàng & Doanh Thu',
        },
        {
            key: '/customers',
            icon: <UsergroupAddOutlined className="menu-item-icon" />,
            label: 'Khách Hàng Thân Thiết',
        },
        {
            key: '/reports',
            icon: <BarChartOutlined className="menu-item-icon" />,
            label: 'Báo Cáo & Thống Kê',
        },
    ];

    const userMenuItems = [
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: 'Thông tin tài khoản',
        },
        {
            key: 'settings',
            icon: <SettingOutlined />,
            label: 'Cấu hình chi nhánh',
        },
        {
            type: 'divider' as const,
        },
        {
            key: 'logout',
            icon: <LogoutOutlined className="logout-icon" />,
            label: <span className="logout-label">Đăng xuất</span>,
        },
    ];

    return (
        <Layout className="admin-layout">
            {/* Sider Sidebar Navigation */}
            <Sider
                trigger={null}
                collapsible
                collapsed={isSidebarCollapsed}
                width={250}
                theme="dark"
                className="admin-sider"
            >
                <div className="brand-logo-container">
                    <img src={logo} alt="Circle K" className="brand-logo-img" />
                    {!isSidebarCollapsed && (
                        <div>
                            <h1 className="brand-title">CIRCLE K</h1>
                            <span className="brand-subtitle">CONVENIENCE ERP</span>
                        </div>
                    )}
                </div>

                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    items={menuItems}
                    onClick={({ key }) => navigate(key)}
                    className="sider-menu"
                />
            </Sider>

            {/* Main Layout Area */}
            <Layout className="main-area">
                {/* Top Header */}
                <Header className="admin-header">
                    <Space size={16}>
                        <Button
                            type="text"
                            icon={isSidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                            onClick={() => dispatch(toggleSidebar())}
                            className="collapse-btn"
                        />

                        <Select
                            defaultValue={selectedBranchId}
                            className="branch-select"
                            prefix={<ShopOutlined className="branch-icon" />}
                            onChange={(value, option: any) =>
                                dispatch(setSelectedBranch({ id: value, name: option.label }))
                            }
                            options={[
                                { value: 'CK-0101', label: 'Circle K - Quận 1 (Bùi Viện)' },
                                { value: 'CK-0102', label: 'Circle K - Quận 3 (Trần Quốc Thảo)' },
                                { value: 'CK-0103', label: 'Circle K - TP.Thủ Đức (Thảo Điền)' },
                                { value: 'CK-0201', label: 'Circle K - Hà Nội (Hoàn Kiếm)' },
                            ]}
                        />
                    </Space>

                    {/* Search bar & User Profile */}
                    <Space size={20}>
                        <Input
                            placeholder="Search product, order, SKU..."
                            prefix={<SearchOutlined className="search-icon" />}
                            className="header-search"
                        />

                        <Button
                            type="primary"
                            icon={<ShoppingCartOutlined />}
                            onClick={() => navigate('/pos')}
                            className="pos-btn"
                        >
                            Màn Hình POS
                        </Button>

                        <Badge count={notificationCount} overflowCount={99}>
                            <Button
                                type="text"
                                shape="circle"
                                icon={<BellOutlined className="bell-icon" />}
                                onClick={() => dispatch(clearNotifications())}
                            />
                        </Badge>

                        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
                            <Space className="user-profile">
                                <Avatar
                                    className="user-avatar"
                                    size="medium"
                                >
                                    AK
                                </Avatar>
                                <div className="user-info">
                                    <Text className="user-name">
                                        Trần Văn Anh
                                    </Text>
                                    <Text type="secondary" className="user-role">
                                        Store Manager
                                    </Text>
                                </div>
                            </Space>
                        </Dropdown>
                    </Space>
                </Header>

                {/* Content Outlet */}
                <Content className="admin-content">
                    <Outlet />
                </Content>

                {/* Footer */}
                <Footer className="admin-footer">
                    Circle K Convenience Store ERP System © {new Date().getFullYear()} — Designed with Circle K Red Identity (`#E31837`)
                </Footer>
            </Layout>
        </Layout>
    );
};
