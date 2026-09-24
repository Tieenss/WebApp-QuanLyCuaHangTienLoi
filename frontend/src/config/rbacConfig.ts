// ============================================
// RBAC - Phân quyền theo vai trò (demo frontend)
// Khi nối backend, danh sách này sẽ lấy từ API
// ============================================

export const PERMISSIONS = {
    DASHBOARD_VIEW: 'dashboard.view',
    POS_VIEW: 'pos.view',
    PRODUCTS_VIEW: 'products.view',
    INVENTORY_VIEW: 'inventory.view',
    INVENTORY_EXPORT: 'inventory.export',
    SUPPLIERS_VIEW: 'suppliers.view',
    ORDERS_VIEW: 'orders.view',
    CUSTOMERS_VIEW: 'customers.view',
    REPORTS_VIEW: 'reports.view',
    BRANCHES_VIEW: 'branches.view',
    BRANCHES_MANAGE: 'branches.manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

import type { AuthUser, UserRole } from '@/types';
import { USER_ROLE } from '@/types';

interface RoleDefinition {
    key: UserRole;
    label: string;
    permissions: Permission[];
}

export const ROLES: Record<UserRole, RoleDefinition> = {
    [USER_ROLE.Admin]: {
        key: USER_ROLE.Admin,
        label: 'Quản Trị Viên Hệ Thống',
        permissions: Object.values(PERMISSIONS),
    },
    [USER_ROLE.Accountant]: {
        key: USER_ROLE.Accountant,
        label: 'Kế toán',
        permissions: [
            PERMISSIONS.DASHBOARD_VIEW,
            PERMISSIONS.PRODUCTS_VIEW,
            PERMISSIONS.INVENTORY_VIEW,
            PERMISSIONS.INVENTORY_EXPORT,
            PERMISSIONS.SUPPLIERS_VIEW,
            PERMISSIONS.ORDERS_VIEW,
            PERMISSIONS.CUSTOMERS_VIEW,
            PERMISSIONS.REPORTS_VIEW,
            PERMISSIONS.BRANCHES_VIEW,
        ],
    },
    [USER_ROLE.StoreManager]: {
        key: USER_ROLE.StoreManager,
        label: 'Quản Lý Chi Nhánh',
        permissions: [
            PERMISSIONS.DASHBOARD_VIEW,
            PERMISSIONS.POS_VIEW,
            PERMISSIONS.PRODUCTS_VIEW,
            PERMISSIONS.INVENTORY_VIEW,
            PERMISSIONS.INVENTORY_EXPORT,
            PERMISSIONS.SUPPLIERS_VIEW,
            PERMISSIONS.ORDERS_VIEW,
            PERMISSIONS.CUSTOMERS_VIEW,
            PERMISSIONS.REPORTS_VIEW,
            PERMISSIONS.BRANCHES_VIEW,
        ],
    },
    [USER_ROLE.WarehouseKeeper]: {
        key: USER_ROLE.WarehouseKeeper,
        label: 'Thủ Kho',
        permissions: [
            PERMISSIONS.DASHBOARD_VIEW,
            PERMISSIONS.PRODUCTS_VIEW,
            PERMISSIONS.INVENTORY_VIEW,
            PERMISSIONS.INVENTORY_EXPORT,
        ],
    },
    [USER_ROLE.Cashier]: {
        key: USER_ROLE.Cashier,
        label: 'Thu Ngân',
        permissions: [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.POS_VIEW],
    },
};

export const ROLE_LABEL: Record<UserRole, string> = Object.fromEntries(
    Object.values(ROLES).map((r) => [r.key, r.label])
) as Record<UserRole, string>;

export const hasPermission = (
    user: AuthUser | null | undefined,
    permission: Permission
): boolean => {
    if (!user) return false;
    const role = ROLES[user.role];
    return role?.permissions.includes(permission) ?? false;
};

// Map đường dẫn route → quyền yêu cầu
export const ROUTE_PERMISSIONS: Record<string, Permission> = {
    '/': PERMISSIONS.DASHBOARD_VIEW,
    '/pos': PERMISSIONS.POS_VIEW,
    '/products': PERMISSIONS.PRODUCTS_VIEW,
    '/inventory': PERMISSIONS.INVENTORY_VIEW,
    '/internal-export': PERMISSIONS.INVENTORY_EXPORT,
    '/suppliers': PERMISSIONS.SUPPLIERS_VIEW,
    '/orders': PERMISSIONS.ORDERS_VIEW,
    '/customers': PERMISSIONS.CUSTOMERS_VIEW,
    '/reports': PERMISSIONS.REPORTS_VIEW,
    '/branches': PERMISSIONS.BRANCHES_VIEW,
};
