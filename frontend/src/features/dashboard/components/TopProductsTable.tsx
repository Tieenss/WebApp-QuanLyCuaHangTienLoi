import React from 'react';
import { Card, Table, Tag, Typography, Avatar, Space } from 'antd';
import { CrownOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { TopProduct } from '../../../types/dashboardTypes';
import { mockTopProducts } from '../mockData';
import { formatVND } from '../../../utils/formatters';
import './TopProductsTable.css';

const { Text } = Typography;

export const TopProductsTable: React.FC = () => {
    const columns: ColumnsType<TopProduct> = [
        {
            title: 'Sản Phẩm',
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (
                <Space size={12}>
                    <Avatar src={record.image} shape="square" size={40} className="product-avatar" />
                    <div>
                        <Text className="product-name">{text}</Text>
                        <Text type="secondary" className="product-sku">SKU: {record.sku}</Text>
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
            render: (price) => <Text className="product-price">{formatVND(price)}</Text>,
        },
        {
            title: 'Đã Bán',
            dataIndex: 'quantitySold',
            key: 'quantitySold',
            align: 'center',
            render: (qty) => (
                <Tag color="volcano" className="qty-tag">
                    {qty} ly/món
                </Tag>
            ),
        },
        {
            title: 'Tổng Doanh Thu',
            dataIndex: 'totalRevenue',
            key: 'totalRevenue',
            align: 'right',
            render: (rev) => <Text className="revenue-cell">{formatVND(rev)}</Text>,
        },
        {
            title: 'Trạng Thái',
            dataIndex: 'status',
            key: 'status',
            align: 'center',
            render: (status) => {
                if (status === 'Best Seller') {
                    return <Tag color="gold" className="status-tag">🔥 Best Seller</Tag>;
                }
                if (status === 'Low Stock') {
                    return <Tag color="error" className="status-tag">⚠️ Sắp hết</Tag>;
                }
                return <Tag color="success" className="status-tag">Sẵn hàng</Tag>;
            },
        },
    ];

    return (
        <Card
            title={
                <div className="card-title-row">
                    <CrownOutlined className="top-products-icon" />
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
