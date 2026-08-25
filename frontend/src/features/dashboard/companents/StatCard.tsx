import React from 'react';
import { Card, Typography, Tag, Space } from 'antd';
import {
    DollarOutlined,
    ShoppingCartOutlined,
    CreditCardOutlined,
    WarningOutlined,
    RiseOutlined,
    FallOutlined,
} from '@ant-design/icons';
import type { StatCardData } from '../../../types/dashboardTypes';

const { Text, Title } = Typography;

interface StatCardProps {
    data: StatCardData;
}

export const StatCard: React.FC<StatCardProps> = ({ data }) => {
    const getIcon = () => {
        switch (data.iconName) {
            case 'revenue':
                return <DollarOutlined />;
            case 'orders':
                return <ShoppingCartOutlined />;
            case 'avgOrder':
                return <CreditCardOutlined />;
            case 'lowStock':
                return <WarningOutlined />;
            default:
                return <DollarOutlined />;
        }
    };

    return (
        <Card className="stat-card" bodyStyle={{ padding: '20px' }}>
            <div className="stat-card-accent-line" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                        {data.title}
                    </Text>
                    <Title level={3} style={{ margin: '8px 0 4px 0', fontWeight: 700, color: '#111827' }}>
                        {data.formattedValue}
                    </Title>
                </div>
                <div className={`stat-icon-wrapper stat-icon-${data.iconName}`}>
                    {getIcon()}
                </div>
            </div>

            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Space size={4}>
                    <Tag
                        color={data.isPositive ? 'success' : 'error'}
                        style={{ fontWeight: 600, border: 'none', padding: '2px 8px' }}
                    >
                        {data.isPositive ? <RiseOutlined /> : <FallOutlined />} {Math.abs(data.change)}%
                    </Tag>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {data.timeframe}
                    </Text>
                </Space>
            </div>
        </Card>
    );
};
