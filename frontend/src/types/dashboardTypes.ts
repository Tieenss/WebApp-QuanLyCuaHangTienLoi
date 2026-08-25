export interface StatCardData {
    id: string;
    title: string;
    value: number;
    formattedValue: string;
    change: number;
    isPositive: boolean;
    timeframe: string;
    iconName: 'revenue' | 'orders' | 'avgOrder' | 'lowStock';
}

export interface RevenueCategoryBreakdown {
    category: string;
    percentage: number;
    amount: number;
    color: string;
}

export interface TopProduct {
    key: string;
    sku: string;
    name: string;
    category: string;
    price: number;
    quantitySold: number;
    totalRevenue: number;
    stockLevel: number;
    image: string;
    status: 'In Stock' | 'Low Stock' | 'Best Seller';
}

export interface RecentOrder {
    key: string;
    orderId: string;
    time: string;
    cashier: string;
    itemsCount: number;
    totalAmount: number;
    paymentMethod: 'MoMo' | 'ZaloPay' | 'Cash' | 'Card';
    status: 'Completed' | 'Processing' | 'Cancelled';
}

export interface InventoryAlert {
    id: string;
    productName: string;
    sku: string;
    category: string;
    currentStock: number;
    minStock: number;
    suggestedReorder: number;
    urgency: 'high' | 'medium' | 'low';
}

export type TimeRange = 'today' | '7days' | '30days' | 'thisMonth';
