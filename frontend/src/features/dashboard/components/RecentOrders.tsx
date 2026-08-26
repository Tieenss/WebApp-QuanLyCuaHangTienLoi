import React from 'react';
import { Card, Table, Tag, Typography, Button } from 'antd';
import { HistoryOutlined, RightOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { RecentOrder } from '../../../types/dashboardTypes';
import { mockRecentOrders } from '../mockData';
import { formatVND } from '../../../utils/formatters';
import './RecentOrders.css';

const { Text } = Typography;

export const RecentOrders: React.FC = () => {
    const columns: ColumnsType<RecentOrder> = [
        {
            title: 'Mã Đơn Hàng',
            dataIndex: 'orderId',
            key: 'orderId',
            render: (id) => <Text className="order-id">{id}</Text>,
        },
        {
            title: 'Thời Gian',
            dataIndex: 'time',
            key: 'time',
            render: (time) => <Text type="secondary">{time}</Text>,
        },
        {
            title: 'Thu Ngân',
            dataIndex: 'cashier',
            key: 'cashier',
            render: (cashier) => <Text className="cashier-name">{cashier}</Text>,
        },
        {
            title: 'Số Lượng',
            dataIndex: 'itemsCount',
            key: 'itemsCount',
            align: 'center',
            render: (count) => <Text>{count} món</Text>,
        },
        {
            title: 'Thanh Toán',
            dataIndex: 'paymentMethod',
            key: 'paymentMethod',
            align: 'center',
            render: (method) => {
                let color = 'blue';
                if (method === 'MoMo') color = 'magenta';
                if (method === 'ZaloPay') color = 'cyan';
                if (method === 'Cash') color = 'green';
                if (method === 'Card') color = 'purple';
                return <Tag color={color} className="payment-tag">{method}</Tag>;
            },
        },
        {
            title: 'Tổng Tiền',
            dataIndex: 'totalAmount',
            key: 'totalAmount',
            align: 'right',
            render: (amount) => <Text className="order-total">{formatVND(amount)}</Text>,
        },
        {
            title: 'Trạng Thái',
            dataIndex: 'status',
            key: 'status',
            align: 'center',
            render: (status) => {
                if (status === 'Completed') {
                    return <Tag color="success">Hoàn thành</Tag>;
                }
                if (status === 'Processing') {
                    return <Tag color="processing">Đang xử lý</Tag>;
                }
                return <Tag color="error">Đã hủy</Tag>;
            },
        },
    ];

    return (
        <Card
            title={
                <div className="card-title-row">
                    <HistoryOutlined className="recent-orders-icon" />
                    <span>Giao Dịch POS Gần Đây (Recent Transactions)</span>
                </div>
            }
            extra={
                <Button type="link" className="view-all-btn">
                    Xem tất cả <RightOutlined className="view-all-arrow" />
                </Button>
            }
            bodyStyle={{ padding: 0 }}
        >
            <Table
                columns={columns}
                dataSource={mockRecentOrders}
                pagination={false}
                size="middle"
            />
        </Card>
    );
};
