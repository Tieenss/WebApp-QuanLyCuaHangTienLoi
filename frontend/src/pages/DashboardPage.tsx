import React from 'react';
import { Row, Col, Typography, Segmented, Space, Card, Tag } from 'antd';
import { ClockCircleOutlined, ShopOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import { setTimeRange } from '../store/slices/dashboardSlice';
import type { TimeRange } from '../types/dashboardTypes';
import { mockStatCards } from '../features/dashboard/mockData';
import { StatCard } from '../features/dashboard/companents/StatCard';
import { RevenueOverview } from '../features/dashboard/companents/RevenueOverview';
import { TopProductsTable } from '../features/dashboard/companents/TopProductsTable';
import { RecentOrders } from '../features/dashboard/companents/RecentOrders';
import { InventoryAlerts } from '../features/dashboard/companents/InventoryAlerts';
import { QuickActions } from '../features/dashboard/companents/QuickActions';

const { Title, Text } = Typography;

export const DashboardPage: React.FC = () => {
    const dispatch = useDispatch();
    const { timeRange, selectedBranchName } = useSelector(
        (state: RootState) => state.dashboard
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Top Banner Header */}
            <Card bodyStyle={{ padding: '20px 24px' }} style={{ borderLeft: '5px solid #E31837' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <Space size={8}>
                            <Tag color="error" style={{ fontWeight: 700, backgroundColor: '#E31837', color: '#FFF' }}>
                                LIVE ERP
                            </Tag>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                                <ShopOutlined /> {selectedBranchName}
                            </Text>
                        </Space>
                        <Title level={2} style={{ margin: '4px 0 0 0', fontWeight: 800, color: '#111827' }}>
                            Bảng Quản Trị ERP Cửa Hàng Tiện Lợi
                        </Title>
                    </div>

                    <Space size={12}>
                        <ClockCircleOutlined style={{ color: '#6B7280' }} />
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
