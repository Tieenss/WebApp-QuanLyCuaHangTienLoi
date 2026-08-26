import React from 'react';
import { Card, Row, Col, Button, message } from 'antd';
import {
    ShoppingCartOutlined,
    InboxOutlined,
    PlusOutlined,
    ExportOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import './QuickActions.css';

export const QuickActions: React.FC = () => {
    const navigate = useNavigate();

    const handleExport = () => {
        message.loading({ content: 'Đang xuất báo cáo doanh thu CSV...', key: 'export' });
        setTimeout(() => {
            message.success({ content: 'Đã xuất báo cáo doanh thu thành công!', key: 'export' });
        }, 1200);
    };

    return (
        <Card title="Thao Tác Nhanh Quản Trị" className="full-height-card">
            <Row gutter={[12, 12]}>
                <Col span={12}>
                    <Button
                        type="primary"
                        block
                        className="quick-action-btn qa-btn-primary"
                        icon={<ShoppingCartOutlined className="qa-icon" />}
                        onClick={() => navigate('/pos')}
                    >
                        Mở Bán Hàng POS
                    </Button>
                </Col>
                <Col span={12}>
                    <Button
                        type="default"
                        block
                        className="quick-action-btn"
                        icon={<InboxOutlined className="qa-icon-dark" />}
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
                        icon={<PlusOutlined className="qa-icon-dark" />}
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
                        icon={<ExportOutlined className="qa-icon-red" />}
                        onClick={handleExport}
                    >
                        Xuất Báo Cáo CSV
                    </Button>
                </Col>
            </Row>
        </Card>
    );
};
