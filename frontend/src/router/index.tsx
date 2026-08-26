import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { SuppliersPage } from '../pages/SuppliersPage';
import { PlaceholderPage } from '../pages/PlaceholderPage';
import { LoginPage } from '../pages/LoginPage';
import { InternalExportPage } from '../pages/InternalExportPage';
import { BranchesPage } from '../pages/BranchesPage';
import { RequireAuth, RequirePermission } from '../components/RequirePermission';
import { PERMISSIONS } from '../config/rbacConfig';

export const AppRouter: React.FC = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                    path="/"
                    element={
                        <RequireAuth>
                            <AdminLayout />
                        </RequireAuth>
                    }
                >
                    <Route
                        index
                        element={
                            <RequirePermission permission={PERMISSIONS.DASHBOARD_VIEW}>
                                <DashboardPage />
                            </RequirePermission>
                        }
                    />
                    <Route
                        path="suppliers"
                        element={
                            <RequirePermission permission={PERMISSIONS.SUPPLIERS_VIEW}>
                                <SuppliersPage />
                            </RequirePermission>
                        }
                    />
                    <Route
                        path="pos"
                        element={
                            <RequirePermission permission={PERMISSIONS.POS_VIEW}>
                                <PlaceholderPage
                                    title="Màn Hình Bán Hàng POS Cửa Hàng Tiện Lợi"
                                    subTitle="Tính năng quét mã vạch và thanh toán nhanh POS đang phát triển (Module POS)."
                                />
                            </RequirePermission>
                        }
                    />
                    <Route
                        path="products"
                        element={
                            <RequirePermission permission={PERMISSIONS.PRODUCTS_VIEW}>
                                <PlaceholderPage
                                    title="Quản Lý Danh Mục & Sản Phẩm"
                                    subTitle="Quản lý SKU, giá bán, danh mục hàng hóa Circle K."
                                />
                            </RequirePermission>
                        }
                    />
                    <Route
                        path="inventory"
                        element={
                            <RequirePermission permission={PERMISSIONS.INVENTORY_VIEW}>
                                <PlaceholderPage
                                    title="Quản Lý & Kiểm Kê Tồn Kho"
                                    subTitle="Quản lý nhập xuất kho, cảnh báo hết hàng, kiểm kê chi nhánh."
                                />
                            </RequirePermission>
                        }
                    />
                    <Route
                        path="internal-export"
                        element={
                            <RequirePermission permission={PERMISSIONS.INVENTORY_EXPORT}>
                                <InternalExportPage />
                            </RequirePermission>
                        }
                    />
                    <Route
                        path="branches"
                        element={
                            <RequirePermission permission={PERMISSIONS.BRANCHES_VIEW}>
                                <BranchesPage />
                            </RequirePermission>
                        }
                    />
                    <Route
                        path="orders"
                        element={
                            <RequirePermission permission={PERMISSIONS.ORDERS_VIEW}>
                                <PlaceholderPage
                                    title="Quản Lý Đơn Hàng & Doanh Thu"
                                    subTitle="Lịch sử hóa đơn, đối soát ca bán hàng và phương thức thanh toán."
                                />
                            </RequirePermission>
                        }
                    />
                    <Route
                        path="customers"
                        element={
                            <RequirePermission permission={PERMISSIONS.CUSTOMERS_VIEW}>
                                <PlaceholderPage
                                    title="Quản Lý Khách Hàng Thân Thiết"
                                    subTitle="Chương trình tích điểm thẻ thành viên Circle K Club."
                                />
                            </RequirePermission>
                        }
                    />
                    <Route
                        path="reports"
                        element={
                            <RequirePermission permission={PERMISSIONS.REPORTS_VIEW}>
                                <PlaceholderPage
                                    title="Báo Cáo & Thống Kê Chi Tiết"
                                    subTitle="Báo cáo doanh thu theo ngày/tuần/tháng, thống kê hàng tồn và lợi nhuận."
                                />
                            </RequirePermission>
                        }
                    />
                </Route>
            </Routes>
        </BrowserRouter>
    );
};
