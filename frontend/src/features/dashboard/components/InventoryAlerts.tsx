import React from 'react';
import { Card, List, Tag, Typography, Button, Space, Progress, message } from 'antd';
import { WarningOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { mockInventoryAlerts } from '../mockData';
import './InventoryAlerts.css';

const { Text } = Typography;

export const InventoryAlerts: React.FC = () => {
    const handleReorder = (productName: string, quantity: number) => {
        message.success(`Đã tạo yêu cầu nhập bổ sung ${quantity} đơn vị cho "${productName}"!`);
    };

    return (
        <Card
            title={
                <div className="card-title-row">
                    <WarningOutlined className="inventory-alerts-icon" />
                    <span>Cảnh Báo Tồn Kho Thấp</span>
                </div>
            }
            extra={<Tag color="error" className="alert-count-tag">{mockInventoryAlerts.length} món cần nhập</Tag>}
            className="full-height-card"
        >
            <List
                itemLayout="vertical"
                dataSource={mockInventoryAlerts}
                renderItem={(item) => {
                    const percent = Math.round((item.currentStock / item.minStock) * 100);
                    return (
                        <List.Item
                            key={item.id}
                            className="alert-item"
                            actions={[
                                <Button
                                    key="reorder"
                                    type="primary"
                                    size="small"
                                    icon={<PlusCircleOutlined />}
                                    onClick={() => handleReorder(item.productName, item.suggestedReorder)}
                                    className="reorder-btn"
                                >
                                    Nhập +{item.suggestedReorder}
                                </Button>,
                            ]}
                        >
                            <div className="alert-content">
                                <div className="alert-header">
                                    <Text className="alert-product-name">{item.productName}</Text>
                                    <Tag color={item.urgency === 'high' ? 'error' : 'warning'} className="alert-urgency-tag">
                                        {item.urgency === 'high' ? 'Gấp' : 'Chú ý'}
                                    </Tag>
                                </div>
                                <Space size={8} className="alert-meta">
                                    <Text type="secondary" className="alert-meta-text">SKU: {item.sku}</Text>
                                    <Text type="secondary" className="alert-meta-text">|</Text>
                                    <Text className="alert-stock">
                                        Còn: {item.currentStock} (Tối thiểu: {item.minStock})
                                    </Text>
                                </Space>
                            </div>
                            <Progress
                                percent={percent}
                                size="small"
                                status={item.urgency === 'high' ? 'exception' : 'active'}
                                strokeColor={item.urgency === 'high' ? '#DC2626' : '#F59E0B'}
                            />
                        </List.Item>
                    );
                }}
            />
        </Card>
    );
};
