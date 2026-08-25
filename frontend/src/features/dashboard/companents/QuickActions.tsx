import React from 'react';
import { Card, Row, Col, Button, message } from 'antd';
import {
    ShoppingCartOutlined,
    InboxOutlined,
    PlusOutlined,
    ExportOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

export const QuickActions: React.FC = () => {
    const navigate = useNavigate();

    const handleExport = () => {
        message.loading({ content: 'Đang xuất báo cáo doanh thu CSV...', key: 'export' });
        setTimeout(() => {
            message.success({ content: 'Đã xuất báo cáo doanh thu thành công!', key: 'export' });
        }, 1200);
    };

    return (
        <Card title="Thao Tác Nhanh Quản Trị" style={{ height: '100%' }}>
            <Row gutter={[12, 12]}>
                <Col span={12}>
                    <Button
                        type="primary"
                        block
                        className="quick-action-btn"
                        icon={<ShoppingCartOutlined style={{ fontSize: 18 }} />}
                        onClick={() => navigate('/pos')}
                        style={{ backgroundColor: '#E31837', borderColor: '#E31837' }}
                    >
                        Mở Bán Hàng POS
                    </Button>
                </Col>
                <Col span={12}>
                    <Button
                        type="default"
                        block
                        className="quick-action-btn"
                        icon={<InboxOutlined style={{ fontSize: 18, color: '#111827' }} />}
                        onClick={() => navigate('/inventory')}
                    >
                        Nhập Kho Cấp Tốc
                    </Button>
                </Col>
                <Col span={12}>
                    <Button
                        type="default"
                        block
                        className="quick-action-btn"
                        icon={<PlusOutlined style={{ fontSize: 18, color: '#111827' }} />}
                        onClick={() => navigate('/products')}
                    >
                        Thêm Sản Phẩm Mới
                    </Button>
                </Col>
                <Col span={12}>
                    <Button
                        type="dashed"
                        block
                        className="quick-action-btn"
                        icon={<ExportOutlined style={{ fontSize: 18, color: '#E31837' }} />}
                        onClick={handleExport}
                    >
                        Xuất Báo Cáo CSV
                    </Button>
                </Col>
            </Row>
        </Card>
    );
};
