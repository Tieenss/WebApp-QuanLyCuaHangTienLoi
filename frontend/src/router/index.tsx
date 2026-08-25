import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { SuppliersPage } from '../pages/SuppliersPage';
import { PlaceholderPage } from '../pages/PlaceholderPage';

export const AppRouter: React.FC = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<AdminLayout />}>
                    <Route index element={<DashboardPage />} />
                    <Route path="suppliers" element={<SuppliersPage />} />
                    <Route
                        path="pos"
                        element={
                            <PlaceholderPage
                                title="Màn Hình Bán Hàng POS Cửa Hàng Tiện Lợi"
                                subTitle="Tính năng quét mã vạch và thanh toán nhanh POS đang phát triển (Module POS)."
                            />
                        }
                    />
                    <Route
                        path="products"
                        element={
                            <PlaceholderPage
                                title="Quản Lý Danh Mục & Sản Phẩm"
                                subTitle="Quản lý SKU, giá bán, danh mục hàng hóa Circle K."
                            />
                        }
                    />
                    <Route
                        path="inventory"
                        element={
                            <PlaceholderPage
                                title="Quản Lý & Kiểm Kê Tồn Kho"
                                subTitle="Quản lý nhập xuất kho, cảnh báo hết hàng, kiểm kê chi nhánh."
                            />
                        }
                    />
                    <Route
                        path="orders"
                        element={
                            <PlaceholderPage
                                title="Quản Lý Đơn Hàng & Doanh Thu"
                                subTitle="Lịch sử hóa đơn, đối soát ca bán hàng và phương thức thanh toán."
                            />
                        }
                    />
                    <Route
                        path="customers"
                        element={
                            <PlaceholderPage
                                title="Quản Lý Khách Hàng Thân Thiết"
                                subTitle="Chương trình tích điểm thẻ thành viên Circle K Club."
                            />
                        }
                    />
                    <Route
                        path="reports"
                        element={
                            <PlaceholderPage
                                title="Báo Cáo & Thống Kê Chi Tiết"
                                subTitle="Báo cáo doanh thu theo ngày/tuần/tháng, thống kê hàng tồn và lợi nhuận."
                            />
                        }
                    />
                </Route>
            </Routes>
        </BrowserRouter>
    );
};
