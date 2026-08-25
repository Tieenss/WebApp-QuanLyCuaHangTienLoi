import React from 'react';
import { Card, Typography, Progress, Row, Col, Segmented } from 'antd';
import { AreaChartOutlined, FireOutlined } from '@ant-design/icons';
import { mockCategories } from '../mockData';
import { formatVND } from '../../../utils/formatters';

const { Title, Text } = Typography;

export const RevenueOverview: React.FC = () => {
    return (
        <Card
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <AreaChartOutlined style={{ color: '#E31837', fontSize: 18 }} />
                    <span>Cơ Cấu Doanh Thu Theo Danh Mục</span>
                </div>
            }
            extra={
                <Segmented
                    options={['Ca Sáng', 'Ca Chiều', 'Ca Đêm', 'Cả Ngày']}
                    defaultValue="Cả Ngày"
                    size="small"
                />
            }
            style={{ height: '100%' }}
        >
            <Row gutter={[24, 24]}>
                <Col xs={24} lg={14}>
                    {/* Circle K Featured Banner */}
                    <div className="circlek-promo-card">
            <span className="circlek-promo-badge">
              <FireOutlined /> Circle K Top Performance
            </span>
                        <Title level={4} style={{ color: '#FFFFFF', margin: '4px 0 8px 0' }}>
                            Chuỗi Cửa Hàng Tiện Lợi Circle K Vietnam
                        </Title>
                        <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 13, display: 'block', marginBottom: 16 }}>
                            Nhóm hàng đồ ăn nóng & thức uống độc quyền (Slushie Froster, Mì trộn, Cà phê) đang đóng góp{' '}
                            <strong style={{ color: '#FFC72C' }}>42% tổng doanh thu</strong> toàn chi nhánh.
                        </Text>
                        <div style={{ display: 'flex', gap: 24, background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: 8 }}>
                            <div>
                                <Text style={{ color: '#9CA3AF', fontSize: 11 }}>Doanh Thu Ca Hiện Tại</Text>
                                <div style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 700 }}>{formatVND(20378400)}</div>
                            </div>
                            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: 24 }}>
                                <Text style={{ color: '#9CA3AF', fontSize: 11 }}>Mục Tiêu Ngày</Text>
                                <div style={{ color: '#FFC72C', fontSize: 18, fontWeight: 700 }}>80.6%</div>
                            </div>
                        </div>
                    </div>
                </Col>

                <Col xs={24} lg={10}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {mockCategories.map((item) => (
                            <div key={item.category} className="category-progress-item">
                                <div className="category-label-row">
                                    <Text style={{ fontWeight: 600, fontSize: 13 }}>{item.category}</Text>
                                    <Text style={{ fontWeight: 700, color: '#111827' }}>
                                        {formatVND(item.amount)} ({item.percentage}%)
                                    </Text>
                                </div>
                                <Progress
                                    percent={item.percentage}
                                    strokeColor={item.color}
                                    showInfo={false}
                                    strokeWidth={8}
                                />
                            </div>
                        ))}
                    </div>
                </Col>
            </Row>
        </Card>
    );
};
