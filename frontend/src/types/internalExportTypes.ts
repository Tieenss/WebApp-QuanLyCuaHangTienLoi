export type InternalExportType =
    | 'Chuyển chi nhánh'
    | 'Xuất hủy'
    | 'Sử dụng nội bộ'
    | 'Trả nhà cung cấp';

export type InternalExportStatus = 'Nháp' | 'Chờ duyệt' | 'Đã duyệt' | 'Hoàn tất';

export interface InternalExportItem {
    productId: string;
    productName: string;
    sku: string;
    unit: string;
    quantity: number;
    unitPrice: number;
}

export interface InternalExport {
    id: string;
    code: string; // e.g., 'XK-001'
    exportDate: string; // YYYY-MM-DD
    sourceWarehouse: string;
    exportType: InternalExportType;
    destination: string; // Chi nhánh / bộ phận nhận
    reason?: string;
    items: InternalExportItem[];
    totalValue: number;
    status: InternalExportStatus;
    createdBy: string;
}

export interface InternalExportFormValues {
    exportDate: string;
    sourceWarehouse: string;
    exportType: InternalExportType;
    destination: string;
    reason?: string;
    status: InternalExportStatus;
    items: InternalExportItem[];
}
