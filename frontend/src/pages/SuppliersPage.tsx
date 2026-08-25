import React from 'react';
import { Card, Typography, Button, Input, Select, Row, Col } from 'antd';
import { PlusOutlined, SearchOutlined, FilterOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store';
import {
    setModalOpen,
    setSearchQuery,
    setCategoryFilter,
    setSelectedSupplier,
} from '../store/slices/supplierSlice';
import { SupplierStatCards } from '../features/suppliers/component/SupplierStatCards';
import { SupplierListTable } from '../features/suppliers/component/SupplierListTable';
import { SupplierFormModal } from '../features/suppliers/component/SupplierFormModal';

const { Title, Text } = Typography;

export const SuppliersPage: React.FC = () => {
    const dispatch = useDispatch();
    const { searchQuery, categoryFilter } = useSelector(
        (state: RootState) => state.supplier
    );

    const handleOpenAddModal = () => {
        dispatch(setSelectedSupplier(null));
        dispatch(setModalOpen(true));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Top Header Card */}
            <Card bodyStyle={{ padding: '20px 24px' }} style={{ borderLeft: '5px solid #E31837' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            ERP Cửa Hàng Tiện Lợi / Danh Mục Hệ Thống
                        </Text>
                        <Title level={2} style={{ margin: '4px 0 0 0', fontWeight: 800, color: '#111827' }}>
                            Quản Lý Nhà Cung Cấp & Công Nợ
                        </Title>
                    </div>

                    <Button
                        type="primary"
                        size="large"
                        icon={<PlusOutlined />}
                        onClick={handleOpenAddModal}
                        style={{ backgroundColor: '#E31837', borderColor: '#E31837', fontWeight: 600, borderRadius: 8 }}
                    >
                        Thêm Nhà Cung Cấp Mới
                    </Button>
                </div>
            </Card>

            {/* KPI Overview Cards */}
            <SupplierStatCards />

            {/* Table Container Card */}
            <Card bodyStyle={{ padding: 24 }}>
                {/* Search & Filters */}
                <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                    <Col xs={24} sm={12} md={8}>
                        <Input
                            placeholder="Tìm theo tên nhà cung cấp, mã NCC, MST..."
                            prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
                            value={searchQuery}
                            onChange={(e) => dispatch(setSearchQuery(e.target.value))}
                            allowClear
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Select
                            placeholder="Lọc theo danh mục hàng"
                            style={{ width: '100%' }}
                            allowClear
                            value={categoryFilter}
                            onChange={(val) => dispatch(setCategoryFilter(val || null))}
                            prefix={<FilterOutlined style={{ color: '#E31837' }} />}
                            options={[
                                { value: 'Nước giải khát', label: 'Nước giải khát' },
                                { value: 'Snack & Bánh kẹo', label: 'Snack & Bánh kẹo' },
                                { value: 'Sữa & Chế phẩm', label: 'Sữa & Chế phẩm' },
                                { value: 'Đồ ăn nhanh', label: 'Đồ ăn nhanh' },
                                { value: 'Mì ăn liền', label: 'Mì ăn liền' },
                                { value: 'Thực phẩm tươi sống', label: 'Thực phẩm tươi sống' },
                                { value: 'Mỹ phẩm & Tiện ích', label: 'Mỹ phẩm & Tiện ích' },
                            ]}
                        />
                    </Col>
                </Row>

                {/* Supplier Table */}
                <SupplierListTable />
            </Card>

            {/* Form Modal */}
            <SupplierFormModal />
        </div>
    );
};
