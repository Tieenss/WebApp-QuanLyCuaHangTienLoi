import React from 'react';
import { Card, Typography, Progress, Row, Col, Segmented } from 'antd';
import { AreaChartOutlined, FireOutlined } from '@ant-design/icons';
import { mockCategories } from '../mockData';
import { formatVND } from '../../../utils/formatters';
import './RevenueOverview.css';

const { Title, Text } = Typography;

export const RevenueOverview: React.FC = () => {
    return (
        <Card
            title={
                <div className="card-title-row">
                    <AreaChartOutlined className="revenue-title-icon" />
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
            className="full-height-card"
        >
            <Row gutter={[24, 24]}>
                <Col xs={24} lg={14}>
                    {/* Circle K Featured Banner */}
                    <div className="circlek-promo-card">
            <span className="circlek-promo-badge">
              <FireOutlined /> Circle K Top Performance
            </span>
                        <Title level={4} className="promo-heading">
                            Chuỗi Cửa Hàng Tiện Lợi Circle K Vietnam
                        </Title>
                        <Text className="promo-description">
                            Nhóm hàng đồ ăn nóng & thức uống độc quyền (Slushie Froster, Mì trộn, Cà phê) đang đóng góp{' '}
                            <strong className="promo-highlight">42% tổng doanh thu</strong> toàn chi nhánh.
                        </Text>
                        <div className="promo-stats">
                            <div>
                                <Text className="promo-stat-label">Doanh Thu Ca Hiện Tại</Text>
                                <div className="promo-stat-value-white">{formatVND(20378400)}</div>
                            </div>
                            <div className="promo-stat-divider">
                                <Text className="promo-stat-label">Mục Tiêu Ngày</Text>
                                <div className="promo-stat-value-gold">80.6%</div>
                            </div>
                        </div>
                    </div>
                </Col>

                <Col xs={24} lg={10}>
                    <div className="category-list">
                        {mockCategories.map((item) => (
                            <div key={item.category} className="category-progress-item">
                                <div className="category-label-row">
                                    <Text className="category-name">{item.category}</Text>
                                    <Text className="category-amount">
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
