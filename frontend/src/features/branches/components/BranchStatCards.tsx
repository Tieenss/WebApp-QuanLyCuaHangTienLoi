import React from 'react';
import { Row, Col, Card, Typography } from 'antd';
import {
    ShopOutlined,
    CheckCircleOutlined,
    PauseCircleOutlined,
    TeamOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import './BranchStatCards.css';

const { Text, Title } = Typography;

export const BranchStatCards: React.FC = () => {
    const { branches } = useSelector((state: RootState) => state.branch);

    const totalBranches = branches.length;
    const activeBranches = branches.filter((b) => b.status === 'Active').length;
    const inactiveBranches = totalBranches - activeBranches;
    const totalStaff = branches.reduce((sum, b) => sum + b.employeeCount, 0);

    const stats = [
        {
            title: 'Tổng Chi Nhánh',
            value: `${totalBranches} chi nhánh`,
            subtitle: 'Toàn quốc',
            icon: <ShopOutlined />,
            bgColor: '#FFF0F2',
            iconColor: '#E31837',
        },
        {
            title: 'Đang Hoạt Động',
            value: `${activeBranches}`,
            subtitle: 'Phục vụ khách bình thường',
            icon: <CheckCircleOutlined />,
            bgColor: '#ECFDF5',
            iconColor: '#10B981',
        },
        {
            title: 'Tạm Đóng / Sửa Chữa',
            value: `${inactiveBranches}`,
            subtitle: 'Cần theo dõi tiến độ',
            icon: <PauseCircleOutlined />,
            bgColor: '#FEF3C7',
            iconColor: '#D97706',
        },
        {
            title: 'Tổng Nhân Sự',
            value: `${totalStaff} người`,
            subtitle: 'Đang làm việc tại các chi nhánh',
            icon: <TeamOutlined />,
            bgColor: '#EFF6FF',
            iconColor: '#2563EB',
        },
    ];

    return (
        <Row gutter={[16, 16]}>
            {stats.map((stat, idx) => (
                <Col xs={24} sm={12} xl={6} key={idx}>
                    <Card bodyStyle={{ padding: '18px 20px' }} className="stat-card">
                        <div className="stat-card-accent-line" />
                        <div className="branch-stat-header">
                            <div>
                                <Text type="secondary" className="branch-stat-label">
                                    {stat.title}
                                </Text>
                                <Title level={4} className="branch-stat-value">
                                    {stat.value}
                                </Title>
                                <Text type="secondary" className="branch-stat-subtitle">
                                    {stat.subtitle}
                                </Text>
                            </div>
                            <div
                                className="branch-stat-icon"
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
