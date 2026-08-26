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
import './SupplierListTable.css';

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
            render: (code) => <Text className="supplier-code">{code}</Text>,
        },
        {
            title: 'Tên Nhà Cung Cấp',
            dataIndex: 'name',
            key: 'name',
            render: (name, record) => (
                <div>
                    <Text className="supplier-name">{name}</Text>
                    <Text type="secondary" className="supplier-taxcode">MST: {record.taxCode}</Text>
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
                        <Tag key={c} color="volcano" className="category-tag">
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
                    <div className="contact-line">
                        <PhoneOutlined className="contact-phone-icon" />
                        {record.phone}
                    </div>
                    <div className="contact-email">
                        <MailOutlined className="contact-mail-icon" />
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
                <Text className={debt > 0 ? 'debt-positive' : 'debt-zero'}>
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
                        icon={<EditOutlined className="edit-action-icon" />}
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
                        <Button type="text" icon={<DeleteOutlined className="delete-action-icon" />} />
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
