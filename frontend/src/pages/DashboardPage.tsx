import React from 'react';
import { Row, Col, Typography, Segmented, Space, Card, Tag } from 'antd';
import { ClockCircleOutlined, ShopOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import { setTimeRange } from '../store/slices/dashboardSlice';
import type { TimeRange } from '../types/dashboardTypes';
import { mockStatCards } from '../features/dashboard/mockData';import { StatCard } from '../features/dashboard/components/StatCard';
import { RevenueOverview } from '../features/dashboard/components/RevenueOverview';
import { TopProductsTable } from '../features/dashboard/components/TopProductsTable';
import { RecentOrders } from '../features/dashboard/components/RecentOrders';
import { InventoryAlerts } from '../features/dashboard/components/InventoryAlerts';
import { QuickActions } from '../features/dashboard/components/QuickActions';
import './DashboardPage.css';

const { Title, Text } = Typography;

export const DashboardPage: React.FC = () => {
    const dispatch = useDispatch();
    const { timeRange, selectedBranchName } = useSelector(
        (state: RootState) => state.dashboard
    );

    return (
        <div className="page-stack">
            {/* Top Banner Header */}
            <Card bodyStyle={{ padding: '20px 24px' }} className="page-banner-card">
                <div className="page-banner-inner">
                    <div>
                        <Space size={8}>
                            <Tag color="error" className="live-tag">
                                LIVE ERP
                            </Tag>
                            <Text type="secondary" className="branch-label">
                                <ShopOutlined /> {selectedBranchName}
                            </Text>
                        </Space>
                        <Title level={2} className="page-title">
                            Bảng Quản Trị ERP Cửa Hàng Tiện Lợi
                        </Title>
                    </div>

                    <Space size={12}>
                        <ClockCircleOutlined className="clock-icon" />
                        <Segmented
                            options={[
                                { label: 'Hôm Nay', value: 'today' },
                                { label: '7 Ngày Qua', value: '7days' },
                                { label: '30 Ngày Qua', value: '30days' },
                                { label: 'Tháng Này', value: 'thisMonth' },
                            ]}
                            value={timeRange}
                            onChange={(value) => dispatch(setTimeRange(value as TimeRange))}
                        />
                    </Space>
                </div>
            </Card>

            {/* Row 1: KPI Stat Cards */}
            <Row gutter={[16, 16]}>
                {mockStatCards.map((stat) => (
                    <Col xs={24} sm={12} xl={6} key={stat.id}>
                        <StatCard data={stat} />
                    </Col>
                ))}
            </Row>

            {/* Row 2: Revenue Overview & Quick Actions */}
            <Row gutter={[24, 24]}>
                <Col xs={24} xl={16}>
                    <RevenueOverview />
                </Col>
                <Col xs={24} xl={8}>
                    <QuickActions />
                </Col>
            </Row>

            {/* Row 3: Top Products & Inventory Alerts */}
            <Row gutter={[24, 24]}>
                <Col xs={24} xl={16}>
                    <TopProductsTable />
                </Col>
                <Col xs={24} xl={8}>
                    <InventoryAlerts />
                </Col>
            </Row>

            {/* Row 4: Recent POS Transactions */}
            <Row gutter={[24, 24]}>
                <Col span={24}>
                    <RecentOrders />
                </Col>
            </Row>
        </div>
    );
};
