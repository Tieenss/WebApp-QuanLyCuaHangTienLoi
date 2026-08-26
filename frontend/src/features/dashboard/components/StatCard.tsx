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
import './StatCard.css';

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
            <div className="stat-card-header">
                <div>
                    <Text type="secondary" className="stat-card-label">
                        {data.title}
                    </Text>
                    <Title level={3} className="stat-card-value">
                        {data.formattedValue}
                    </Title>
                </div>
                <div className={`stat-icon-wrapper stat-icon-${data.iconName}`}>
                    {getIcon()}
                </div>
            </div>

            <div className="stat-card-footer">
                <Space size={4}>
                    <Tag
                        color={data.isPositive ? 'success' : 'error'}
                        className="stat-change-tag"
                    >
                        {data.isPositive ? <RiseOutlined /> : <FallOutlined />} {Math.abs(data.change)}%
                    </Tag>
                    <Text type="secondary" className="stat-timeframe">
                        {data.timeframe}
                    </Text>
                </Space>
            </div>
        </Card>
    );
};
