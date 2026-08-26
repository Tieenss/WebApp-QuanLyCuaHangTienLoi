import React from 'react';
import { Row, Col, Card, Typography } from 'antd';
import {
    ShopOutlined,
    CheckCircleOutlined,
    DollarOutlined,
    ClockCircleOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { formatVND } from '../../../utils/formatters';
import './SupplierStatCards.css';

const { Text, Title } = Typography;

export const SupplierStatCards: React.FC = () => {
    const { suppliers } = useSelector((state: RootState) => state.supplier);

    const totalSuppliers = suppliers.length;
    const activeSuppliers = suppliers.filter((s) => s.status === 'Active').length;
    const totalDebt = suppliers.reduce((sum, s) => sum + s.totalDebt, 0);
    const dueThisWeek = 84500000; // Simulated due payment

    const stats = [
        {
            title: 'Tổng Nhà Cung Cấp',
            value: `${totalSuppliers} nhà cung cấp`,
            subtitle: 'Đối tác chiến lược Circle K',
            icon: <ShopOutlined />,
            bgColor: '#FFF0F2',
            iconColor: '#E31837',
        },
        {
            title: 'Đang Hợp Tác',
            value: `${activeSuppliers} / ${totalSuppliers}`,
            subtitle: 'Trạng thái hoạt động tốt',
            icon: <CheckCircleOutlined />,
            bgColor: '#ECFDF5',
            iconColor: '#10B981',
        },
        {
            title: 'Tổng Công Nợ Phải Trả',
            value: formatVND(totalDebt),
            subtitle: 'Tất cả các chi nhánh',
            icon: <DollarOutlined />,
            bgColor: '#FEF3C7',
            iconColor: '#D97706',
        },
        {
            title: 'Công Nợ Đến Hạn Tuần Này',
            value: formatVND(dueThisWeek),
            subtitle: 'Cần phê duyệt thanh toán',
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
                        <div className="supplier-stat-header">
                            <div>
                                <Text type="secondary" className="supplier-stat-label">
                                    {stat.title}
                                </Text>
                                <Title level={4} className="supplier-stat-value">
                                    {stat.value}
                                </Title>
                                <Text type="secondary" className="supplier-stat-subtitle">
                                    {stat.subtitle}
                                </Text>
                            </div>
                            <div
                                className="supplier-stat-icon"
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
