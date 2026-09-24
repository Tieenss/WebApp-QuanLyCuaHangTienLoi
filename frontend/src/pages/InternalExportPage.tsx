import React from 'react';
import { Card, Typography, Button, Input, Select, Row, Col } from 'antd';
import { PlusOutlined, SearchOutlined, FilterOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store';
import {
    setModalOpen,
    setSearchQuery,
    setStatusFilter,
} from '../store/slices/internalExportSlice';
import { InternalExportStatCards } from '../features/inventory/components/InternalExportStatCards';
import { InternalExportListTable } from '../features/inventory/components/InternalExportListTable';
import { InternalExportFormModal } from '../features/inventory/components/InternalExportFormModal';
import './InternalExportPage.css';

const { Title, Text } = Typography;

const STATUS_FILTER_OPTIONS = [
    { value: 'Nháp', label: 'Nháp' },
    { value: 'Chờ duyệt', label: 'Chờ duyệt' },
    { value: 'Đã duyệt', label: 'Đã duyệt' },
    { value: 'Hoàn tất', label: 'Hoàn tất' },
];

export const InternalExportPage: React.FC = () => {
    const dispatch = useDispatch();
    const { searchQuery, statusFilter } = useSelector(
        (state: RootState) => state.internalExport
    );

    const handleOpenCreateModal = () => {
        dispatch(setModalOpen(true));
    };

    return (
        <div className="page-stack">
            {/* Top Header Card */}
            <Card bodyStyle={{ padding: '20px 24px' }} className="page-banner-card">
                <div className="page-banner-inner">
                    <div>
                        <Text type="secondary" className="breadcrumb-label">
                            ERP Cửa Hàng Tiện Lợi / Kho Vận
                        </Text>
                        <Title level={2} className="page-title">
                            Xuất Kho Nội Bộ
                        </Title>
                    </div>

                    <Button
                        type="primary"
                        size="large"
                        icon={<PlusOutlined />}
                        onClick={handleOpenCreateModal}
                        className="add-export-btn"
                    >
                        Tạo Phiếu Xuất Mới
                    </Button>
                </div>
            </Card>

            {/* KPI Overview Cards */}
            <InternalExportStatCards />

            {/* Table Container Card */}
            <Card bodyStyle={{ padding: 24 }}>
                {/* Search & Filters */}
                <Row gutter={[16, 16]} className="filters-row">
                    <Col xs={24} sm={12} md={8}>
                        <Input
                            placeholder="Tìm theo mã phiếu, nơi nhận, người tạo..."
                            prefix={<SearchOutlined className="search-prefix-icon" />}
                            value={searchQuery}
                            onChange={(e) => dispatch(setSearchQuery(e.target.value))}
                            allowClear
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Select
                            placeholder="Lọc theo trạng thái"
                            className="category-filter-select"
                            allowClear
                            value={statusFilter}
                            onChange={(val) => dispatch(setStatusFilter(val || null))}
                            prefix={<FilterOutlined className="filter-prefix-icon" />}
                            options={STATUS_FILTER_OPTIONS}
                        />
                    </Col>
                </Row>

                {/* Export Table */}
                <InternalExportListTable />
            </Card>

            {/* Create / Edit Modal */}
            <InternalExportFormModal />
        </div>
    );
};
