import React from 'react';
import { Card, Table, Tag, Typography, Avatar, Space } from 'antd';
import { CrownOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { TopProduct } from '../../../types/dashboardTypes';
import { mockTopProducts } from '../mockData';
import { formatVND } from '../../../utils/formatters';

const { Text } = Typography;

export const TopProductsTable: React.FC = () => {
    const columns: ColumnsType<TopProduct> = [
        {
            title: 'Sản Phẩm',
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (
                <Space size={12}>
                    <Avatar src={record.image} shape="square" size={40} style={{ borderRadius: 6 }} />
                    <div>
                        <Text style={{ fontWeight: 600, display: 'block', color: '#111827' }}>{text}</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>SKU: {record.sku}</Text>
                    </div>
                </Space>
            ),
        },
        {
            title: 'Danh Mục',
            dataIndex: 'category',
            key: 'category',
            render: (cat) => <Tag color="default">{cat}</Tag>,
        },
        {
            title: 'Đơn Giá',
            dataIndex: 'price',
            key: 'price',
            align: 'right',
            render: (price) => <Text style={{ fontWeight: 500 }}>{formatVND(price)}</Text>,
        },
        {
            title: 'Đã Bán',
            dataIndex: 'quantitySold',
            key: 'quantitySold',
            align: 'center',
            render: (qty) => (
                <Tag color="volcano" style={{ fontWeight: 700, padding: '2px 10px' }}>
                    {qty} ly/món
                </Tag>
            ),
        },
        {
            title: 'Tổng Doanh Thu',
            dataIndex: 'totalRevenue',
            key: 'totalRevenue',
            align: 'right',
            render: (rev) => <Text style={{ fontWeight: 700, color: '#E31837' }}>{formatVND(rev)}</Text>,
        },
        {
            title: 'Trạng Thái',
            dataIndex: 'status',
            key: 'status',
            align: 'center',
            render: (status) => {
                if (status === 'Best Seller') {
                    return <Tag color="gold" style={{ fontWeight: 600 }}>🔥 Best Seller</Tag>;
                }
                if (status === 'Low Stock') {
                    return <Tag color="error" style={{ fontWeight: 600 }}>⚠️ Sắp hết</Tag>;
                }
                return <Tag color="success" style={{ fontWeight: 600 }}>Sẵn hàng</Tag>;
            },
        },
    ];

    return (
        <Card
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CrownOutlined style={{ color: '#FFC72C', fontSize: 20 }} />
                    <span>Sản Phẩm Bán Chạy Nhất (Top Products)</span>
                </div>
            }
            bodyStyle={{ padding: 0 }}
        >
            <Table
                columns={columns}
                dataSource={mockTopProducts}
                pagination={false}
                rowClassName="top-product-row"
                size="middle"
            />
        </Card>
    );
};
