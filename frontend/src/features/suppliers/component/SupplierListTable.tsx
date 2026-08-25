import React from 'react';
import { Table, Tag, Typography, Button, Space, Popconfirm, message } from 'antd';
import { EditOutlined, DeleteOutlined, PhoneOutlined, MailOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../../store';
import type { Supplier } from '../../../types/supplierTypes';
import {
    setSelectedSupplier,
    setModalOpen,
    deleteSupplier,
} from '../../../store/slices/supplierSlice';
import { formatVND } from '../../../utils/formatters';

const { Text } = Typography;

export const SupplierListTable: React.FC = () => {
    const dispatch = useDispatch();
    const { suppliers, searchQuery, categoryFilter } = useSelector(
        (state: RootState) => state.supplier
    );

    const handleEdit = (supplier: Supplier) => {
        dispatch(setSelectedSupplier(supplier));
        dispatch(setModalOpen(true));
    };

    const handleDelete = (id: string, name: string) => {
        dispatch(deleteSupplier(id));
        message.success(`Đã xóa nhà cung cấp "${name}"!`);
    };

    // Filter suppliers
    const filteredSuppliers = suppliers.filter((s) => {
        const matchesSearch =
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.taxCode.includes(searchQuery);
        const matchesCategory =
            !categoryFilter || s.categories.some((cat) => cat === categoryFilter);
        return matchesSearch && matchesCategory;
    });

    const columns: ColumnsType<Supplier> = [
        {
            title: 'Mã NCC',
            dataIndex: 'code',
            key: 'code',
            width: 100,
            render: (code) => <Text style={{ fontWeight: 700, color: '#E31837' }}>{code}</Text>,
        },
        {
            title: 'Tên Nhà Cung Cấp',
            dataIndex: 'name',
            key: 'name',
            render: (name, record) => (
                <div>
                    <Text style={{ fontWeight: 600, color: '#111827', display: 'block' }}>{name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>MST: {record.taxCode}</Text>
                </div>
            ),
        },
        {
            title: 'Danh Mục Hàng',
            dataIndex: 'categories',
            key: 'categories',
            render: (cats: string[]) => (
                <Space size={[0, 4]} wrap>
                    {cats.map((c) => (
                        <Tag key={c} color="volcano" style={{ fontSize: 11 }}>
                            {c}
                        </Tag>
                    ))}
                </Space>
            ),
        },
        {
            title: 'Liên Hệ',
            key: 'contact',
            render: (_, record) => (
                <div>
                    <div style={{ fontSize: 12 }}>
                        <PhoneOutlined style={{ color: '#E31837', marginRight: 6 }} />
                        {record.phone}
                    </div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>
                        <MailOutlined style={{ marginRight: 6 }} />
                        {record.email}
                    </div>
                </div>
            ),
        },
        {
            title: 'Điều Khoản',
            dataIndex: 'paymentTerms',
            key: 'paymentTerms',
            render: (terms) => <Tag color="blue">{terms}</Tag>,
        },
        {
            title: 'Công Nợ',
            dataIndex: 'totalDebt',
            key: 'totalDebt',
            align: 'right',
            render: (debt) => (
                <Text style={{ fontWeight: 700, color: debt > 0 ? '#E31837' : '#10B981' }}>
                    {formatVND(debt)}
                </Text>
            ),
        },
        {
            title: 'Trạng Thái',
            dataIndex: 'status',
            key: 'status',
            align: 'center',
            render: (status) => (
                <Tag color={status === 'Active' ? 'success' : 'default'}>
                    {status === 'Active' ? 'Đang hợp tác' : 'Ngưng hợp tác'}
                </Tag>
            ),
        },
        {
            title: 'Thao Tác',
            key: 'actions',
            align: 'center',
            width: 110,
            render: (_, record) => (
                <Space size={4}>
                    <Button
                        type="text"
                        icon={<EditOutlined style={{ color: '#1890ff' }} />}
                        onClick={() => handleEdit(record)}
                    />
                    <Popconfirm
                        title="Xóa nhà cung cấp?"
                        description={`Bạn có chắc muốn xóa "${record.name}"?`}
                        onConfirm={() => handleDelete(record.id, record.name)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                    >
                        <Button type="text" icon={<DeleteOutlined style={{ color: '#FF4D4F' }} />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <Table
            columns={columns}
            dataSource={filteredSuppliers}
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: true }}
            size="middle"
        />
    );
};
