import React from 'react';
import { Card, List, Tag, Typography, Button, Space, Progress, message } from 'antd';
import { WarningOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { mockInventoryAlerts } from '../mockData';

const { Text } = Typography;

export const InventoryAlerts: React.FC = () => {
    const handleReorder = (productName: string, quantity: number) => {
        message.success(`Đã tạo yêu cầu nhập bổ sung ${quantity} đơn vị cho "${productName}"!`);
    };

    return (
        <Card
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <WarningOutlined style={{ color: '#DC2626', fontSize: 18 }} />
                    <span>Cảnh Báo Tồn Kho Thấp</span>
                </div>
            }
            extra={<Tag color="error" style={{ fontWeight: 700 }}>{mockInventoryAlerts.length} món cần nhập</Tag>}
            style={{ height: '100%' }}
        >
            <List
                itemLayout="vertical"
                dataSource={mockInventoryAlerts}
                renderItem={(item) => {
                    const percent = Math.round((item.currentStock / item.minStock) * 100);
                    return (
                        <List.Item
                            key={item.id}
                            style={{ padding: '12px 0', borderBottom: '1px dashed #F3F4F6' }}
                            actions={[
                                <Button
                                    type="primary"
                                    size="small"
                                    icon={<PlusCircleOutlined />}
                                    onClick={() => handleReorder(item.productName, item.suggestedReorder)}
                                    style={{ fontSize: 12 }}
                                >
                                    Nhập +{item.suggestedReorder}
                                </Button>,
                            ]}
                        >
                            <div style={{ marginBottom: 6 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <Text style={{ fontWeight: 600, color: '#111827' }}>{item.productName}</Text>
                                    <Tag color={item.urgency === 'high' ? 'error' : 'warning'} style={{ margin: 0, fontSize: 11 }}>
                                        {item.urgency === 'high' ? 'Gấp' : 'Chú ý'}
                                    </Tag>
                                </div>
                                <Space size={8} style={{ marginTop: 2 }}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>SKU: {item.sku}</Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>|</Text>
                                    <Text style={{ fontSize: 12, color: '#DC2626', fontWeight: 600 }}>
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
