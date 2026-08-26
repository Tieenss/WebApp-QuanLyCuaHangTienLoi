import React from 'react';
import { Row, Col, Card, Typography } from 'antd';
import {
    FileTextOutlined,
    SwapRightOutlined,
    DollarOutlined,
    ClockCircleOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { formatVND, formatNumber } from '../../../utils/formatters';
import './InternalExportStatCards.css';

const { Text, Title } = Typography;

export const InternalExportStatCards: React.FC = () => {
    const { exports } = useSelector((state: RootState) => state.internalExport);

    const totalSlips = exports.length;
    const totalQuantity = exports.reduce(
        (sum, e) => sum + e.items.reduce((s, item) => s + item.quantity, 0),
        0
    );
    const totalValue = exports.reduce((sum, e) => sum + e.totalValue, 0);
    const pendingCount = exports.filter((e) => e.status === 'Chờ duyệt').length;

    const stats = [
        {
            title: 'Tổng Phiếu Xuất',
            value: `${totalSlips} phiếu`,
            subtitle: 'Trong kỳ hiện tại',
            icon: <FileTextOutlined />,
            bgColor: '#FFF0F2',
            iconColor: '#E31837',
        },
        {
            title: 'Tổng Số Lượng Xuất',
            value: formatNumber(totalQuantity),
            subtitle: 'Sản phẩm xuất khỏi kho',
            icon: <SwapRightOutlined />,
            bgColor: '#ECFDF5',
            iconColor: '#10B981',
        },
        {
            title: 'Tổng Giá Trị Xuất',
            value: formatVND(totalValue),
            subtitle: 'Theo giá vốn kho',
            icon: <DollarOutlined />,
            bgColor: '#FEF3C7',
            iconColor: '#D97706',
        },
        {
            title: 'Phiếu Chờ Duyệt',
            value: `${pendingCount} phiếu`,
            subtitle: 'Cần quản lý phê duyệt',
            icon: <ClockCircleOutlined />,
            bgColor: '#FEF2F2',
            iconColor: '#DC2626',
        },
    ];

    return (
        <Row gutter={[16, 16]}>
            {stats.map((stat, idx) => (
                <Col xs={24} sm={12} xl={6} key={idx}>
                    <Card bodyStyle={{ padding: '18px 20px' }} className="stat-card">
                        <div className="stat-card-accent-line" />
                        <div className="export-stat-header">
                            <div>
                                <Text type="secondary" className="export-stat-label">
                                    {stat.title}
                                </Text>
                                <Title level={4} className="export-stat-value">
                                    {stat.value}
                                </Title>
                                <Text type="secondary" className="export-stat-subtitle">
                                    {stat.subtitle}
                                </Text>
                            </div>
                            <div
                                className="export-stat-icon"
                                style={{ backgroundColor: stat.bgColor, color: stat.iconColor }}
                            >
                                {stat.icon}
                            </div>
                        </div>
                    </Card>
                </Col>
            ))}
        </Row>
    );
};
