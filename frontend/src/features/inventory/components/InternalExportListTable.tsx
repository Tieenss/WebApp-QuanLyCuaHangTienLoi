import React from 'react';
import { Table, Tag, Typography, Button, Space, Popconfirm, message } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../../store';
import type { InternalExport, InternalExportItem } from '../../../types/internalExportTypes';
import {
    setSelectedExport,
    setModalOpen,
    deleteExport,
} from '../../../store/slices/internalExportSlice';
import { formatVND } from '../../../utils/formatters';
import './InternalExportListTable.css';

const { Text } = Typography;

const STATUS_COLOR: Record<string, string> = {
    'Nháp': 'default',
    'Chờ duyệt': 'gold',
    'Đã duyệt': 'blue',
    'Hoàn tất': 'success',
};

export const InternalExportListTable: React.FC = () => {
    const dispatch = useDispatch();
    const { exports, searchQuery, statusFilter } = useSelector(
        (state: RootState) => state.internalExport
    );

    const handleEdit = (record: InternalExport) => {
        dispatch(setSelectedExport(record));
        dispatch(setModalOpen(true));
    };

    const handleDelete = (id: string, code: string) => {
        dispatch(deleteExport(id));
        message.success(`Đã xóa phiếu xuất "${code}"!`);
    };

    const filteredExports = exports.filter((e) => {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
            e.code.toLowerCase().includes(q) ||
            e.destination.toLowerCase().includes(q) ||
            e.createdBy.toLowerCase().includes(q);
        const matchesStatus = !statusFilter || e.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const itemColumns: ColumnsType<InternalExportItem> = [
        { title: 'Sản Phẩm', dataIndex: 'productName', key: 'productName' },
        { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 110 },
        { title: 'ĐVT', dataIndex: 'unit', key: 'unit', width: 80 },
        {
            title: 'Số Lượng',
            dataIndex: 'quantity',
            key: 'quantity',
            width: 100,
            align: 'right' as const,
        },
        {
            title: 'Đơn Giá',
            dataIndex: 'unitPrice',
            key: 'unitPrice',
            width: 120,
            align: 'right' as const,
            render: (price) => <Text className="export-item-price">{formatVND(price)}</Text>,
        },
        {
            title: 'Thành Tiền',
            key: 'lineTotal',
            width: 140,
            align: 'right' as const,
            render: (_, record) => (
                <Text className="export-item-total">
                    {formatVND(record.quantity * record.unitPrice)}
                </Text>
            ),
        },
    ];

    const columns: ColumnsType<InternalExport> = [
        {
            title: 'Mã Phiếu',
            dataIndex: 'code',
            key: 'code',
            width: 100,
            render: (code) => <Text className="export-code">{code}</Text>,
        },
        {
            title: 'Ngày Xuất',
            dataIndex: 'exportDate',
            key: 'exportDate',
            width: 110,
            render: (date) => <Text className="export-date">{date}</Text>,
        },
        {
            title: 'Loại Xuất',
            dataIndex: 'exportType',
            key: 'exportType',
            width: 150,
            render: (type) => <Tag color="geekblue" className="export-type-tag">{type}</Tag>,
        },
        {
            title: 'Kho Nguồn → Nơi Nhận',
            key: 'route',
            render: (_, record) => (
                <div>
                    <Text className="export-warehouse">{record.sourceWarehouse}</Text>
                    <div>
                        <Text type="secondary" className="export-destination">
                            → {record.destination}
                        </Text>
                    </div>
                </div>
            ),
        },
        {
            title: 'Sản Phẩm',
            key: 'itemCount',
            align: 'center',
            width: 90,
            render: (_, record) => <Tag>{record.items.length} mặt hàng</Tag>,
        },
        {
            title: 'Tổng Giá Trị',
            dataIndex: 'totalValue',
            key: 'totalValue',
            align: 'right',
            width: 140,
            render: (value) => <Text className="export-value">{formatVND(value)}</Text>,
        },
        {
            title: 'Trạng Thái',
            dataIndex: 'status',
            key: 'status',
            align: 'center',
            width: 110,
            render: (status) => (
                <Tag color={STATUS_COLOR[status] ?? 'default'}>{status}</Tag>
            ),
        },
        {
            title: 'Người Tạo',
            dataIndex: 'createdBy',
            key: 'createdBy',
            width: 130,
        },
        {
            title: 'Thao Tác',
            key: 'actions',
            align: 'center',
            width: 110,
            fixed: 'right',
            render: (_, record) => (
                <Space size={4}>
                    <Button
                        type="text"
                        icon={<EditOutlined className="export-edit-icon" />}
                        onClick={() => handleEdit(record)}
                    />
                    <Popconfirm
                        title="Xóa phiếu xuất?"
                        description={`Bạn có chắc muốn xóa "${record.code}"?`}
                        onConfirm={() => handleDelete(record.id, record.code)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                    >
                        <Button type="text" icon={<DeleteOutlined className="export-delete-icon" />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <Table<InternalExport>
            columns={columns}
            dataSource={filteredExports}
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: true }}
            size="middle"
            scroll={{ x: 1100 }}
            expandable={{
                expandedRowRender: (record) => (
                    <Table
                        columns={itemColumns}
                        dataSource={record.items}
                        rowKey="productId"
                        pagination={false}
                        size="small"
                        title={() => <Text strong>Lý do xuất: {record.reason || '—'}</Text>}
                    />
                ),
                rowExpandable: () => true,
            }}
        />
    );
};
