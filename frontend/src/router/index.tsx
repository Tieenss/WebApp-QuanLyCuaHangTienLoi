import type { FC } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthLayout } from '@/layouts/AuthLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { PosLayout } from '@/layouts/PosLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '@/features/auth/LoginPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { PosPage } from '@/features/pos/PosPage';
import { SalesOrdersPage } from '@/features/salesOrders/SalesOrdersPage';
import { BranchesPage } from '@/features/branches/BranchesPage';
import { EmployeesPage } from '@/features/employees/EmployeesPage';
import { ProductsPage } from '@/features/products/ProductsPage';
import { CategoriesPage } from '@/features/categories/CategoriesPage';
import { SuppliersPage } from '@/features/suppliers/SuppliersPage';
import { InventoryPage } from '@/features/inventory/InventoryPage';
import { PurchaseOrdersPage } from '@/features/purchaseOrders/PurchaseOrdersPage';
import { TransfersPage } from '@/features/transfers/TransfersPage';
import { StocktakesPage } from '@/features/stocktakes/StocktakesPage';
import { AttendancePage } from '@/features/attendance/AttendancePage';
import { CashbookPage } from '@/features/cashbook/CashbookPage';
import { ReportsPage } from '@/features/reports/ReportsPage';
import { AccountPage } from '@/features/account/AccountPage';
import { NotFoundPage } from '@/features/shared/NotFoundPage';


export const AppRouter: FC = () => (
  <BrowserRouter>
    <Routes>
      {/* Module 0 – Khu vực xác thực, nằm ngoài layout quản trị.
          AuthLayout dựng khung 2 cột và đẩy người đã đăng nhập về trang chính. */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Module 2 – Quầy bán hàng, dùng layout riêng không có sidebar quản trị.
          Đặt trước nhóm route của AdminLayout để `/pos` khớp ở đây. */}
      <Route
        element={
          <ProtectedRoute>
            <PosLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/pos" element={<PosPage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        {/* Điều hướng gốc về Dashboard; thu ngân sẽ bị ProtectedRoute chặn và
            hướng về POS thông qua trang 403. */}
        <Route index element={<Navigate to="/dashboard" replace />} />

        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/sales-orders" element={<SalesOrdersPage />} />
        <Route path="/branches" element={<BranchesPage />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
        <Route path="/transfers" element={<TransfersPage />} />
        <Route path="/stocktakes" element={<StocktakesPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/cashbook" element={<CashbookPage />} />
        <Route path="/reports" element={<ReportsPage />} />

        {/* Trang tài khoản không thuộc registry module nên mọi vai trò đều
            vào được — kể cả thu ngân, để tự đổi được mật khẩu. */}
        <Route path="/account" element={<AccountPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  </BrowserRouter>
);