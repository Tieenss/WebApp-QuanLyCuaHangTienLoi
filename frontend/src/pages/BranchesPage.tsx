import React from 'react';
import { Card, Typography, Button, Input, Row, Col } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store';
import { setModalOpen, setSearchQuery } from '../store/slices/branchSlice';
import { hasPermission, PERMISSIONS } from '../config/rbacConfig';
import { BranchStatCards } from '../features/branches/components/BranchStatCards';
import { BranchListTable } from '../features/branches/components/BranchListTable';
import { BranchFormModal } from '../features/branches/components/BranchFormModal';
import './BranchesPage.css';

const { Title, Text } = Typography;

export const BranchesPage: React.FC = () => {
    const dispatch = useDispatch();
    const user = useSelector((state: RootState) => state.auth.user);
    const canManage = hasPermission(user, PERMISSIONS.BRANCHES_MANAGE);
    const { searchQuery } = useSelector((state: RootState) => state.branch);

    return (
        <div className="page-stack">
            {/* Top Header Card */}
            <Card bodyStyle={{ padding: '20px 24px' }} className="page-banner-card">
                <div className="page-banner-inner">
                    <div>
                        <Text type="secondary" className="breadcrumb-label">
                            ERP Cửa Hàng Tiện Lợi / Hệ Thống
                        </Text>
                        <Title level={2} className="page-title">
                            Quản Lý Chi Nhánh
                        </Title>
                    </div>

                    {canManage && (
                        <Button
                            type="primary"
                            size="large"
                            icon={<PlusOutlined />}
                            onClick={() => dispatch(setModalOpen(true))}
                            className="add-branch-btn"
                        >
                            Thêm Chi Nhánh Mới
                        </Button>
                    )}
                </div>
            </Card>

            {/* KPI Overview Cards */}
            <BranchStatCards />

            {/* Table Container Card */}
            <Card bodyStyle={{ padding: 24 }}>
                <Row gutter={[16, 16]} className="branches-search-row">
                    <Col xs={24} sm={12} md={8}>
                        <Input
                            placeholder="Tìm theo mã CN, tên chi nhánh, quản lý..."
                            prefix={<SearchOutlined className="branch-search-icon" />}
                            value={searchQuery}
                            onChange={(e) => dispatch(setSearchQuery(e.target.value))}
                            allowClear
                        />
                    </Col>
                </Row>

                <BranchListTable />
            </Card>

            <BranchFormModal />
        </div>
    );
};
