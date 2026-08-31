export interface Supplier {
    id: string;
    code: string; // e.g., 'NCC-001'
    name: string;
    taxCode: string;
    phone: string;
    email: string;
    address: string;
    categories: string[]; // e.g., ['Nước giải khát', 'Snack & Bánh kẹo']
    paymentTerms: 'Công nợ 15 ngày' | 'Công nợ 30 ngày' | 'Thanh toán ngay' | 'Công nợ 45 ngày';
    totalDebt: number; // Công nợ hiện tại (VND)
    totalOrders: number;
    status: 'Active' | 'Inactive';
    createdAt: string;
}

export type SupplierFormValues = Omit<Supplier, 'id' | 'code' | 'totalDebt' | 'totalOrders' | 'createdAt'>;

export interface SupplierStatSummary {
    totalSuppliers: number;
    activeSuppliers: number;
    totalDebt: number;
    dueThisWeek: number;
}
