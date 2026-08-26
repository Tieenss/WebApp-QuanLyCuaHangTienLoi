import type { InternalExport } from '../../types/internalExportTypes';

export const WAREHOUSE_OPTIONS = [
    { value: 'Kho Trung Tâm Quận 1', label: 'Kho Trung Tâm Quận 1' },
    { value: 'Kho Thủ Đức', label: 'Kho Thủ Đức' },
    { value: 'Kho Bình Thạnh', label: 'Kho Bình Thạnh' },
];

export const PRODUCT_OPTIONS = [
    { productId: 'P-001', productName: 'Bánh mì que', sku: 'BMQ-01', unit: 'Gói', unitPrice: 5000 },
    { productId: 'P-002', productName: 'Slushie Froster 500ml', sku: 'SLF-05', unit: 'Ly', unitPrice: 25000 },
    { productId: 'P-003', productName: 'Mì trộn Circle K', sku: 'MTC-03', unit: 'Hộp', unitPrice: 32000 },
    { productId: 'P-004', productName: 'Cà phê sữa đá', sku: 'CSD-02', unit: 'Ly', unitPrice: 18000 },
    { productId: 'P-005', productName: 'Kem đánh răng P/S', sku: 'KDR-11', unit: 'Tuýp', unitPrice: 28000 },
    { productId: 'P-006', productName: 'Nước suối Aquafina 500ml', sku: 'NSA-50', unit: 'Chai', unitPrice: 7000 },
];

const product = (id: string) => PRODUCT_OPTIONS.find((p) => p.productId === id)!;

export const initialInternalExports: InternalExport[] = [
    {
        id: 'xk-1',
        code: 'XK-001',
        exportDate: '2026-08-20',
        sourceWarehouse: 'Kho Trung Tâm Quận 1',
        exportType: 'Chuyển chi nhánh',
        destination: 'Circle K - Quận 3 (Trần Quốc Thảo)',
        reason: 'Bổ sung hàng bán cho ca sáng',
        items: [
            { ...product('P-002'), quantity: 120 },
            { ...product('P-003'), quantity: 80 },
            { ...product('P-004'), quantity: 150 },
        ],
        totalValue: 9400000,
        status: 'Hoàn tất',
        createdBy: 'Trần Văn Anh',
    },
    {
        id: 'xk-2',
        code: 'XK-002',
        exportDate: '2026-08-21',
        sourceWarehouse: 'Kho Thủ Đức',
        exportType: 'Sử dụng nội bộ',
        destination: 'Phòng Kỹ thuật - Khu Vực Đông',
        reason: 'Vật tư bảo trì tủ mát cửa hàng Thảo Điền',
        items: [{ ...product('P-005'), quantity: 12 }],
        totalValue: 336000,
        status: 'Đã duyệt',
        createdBy: 'Lê Thị Hồng',
    },
    {
        id: 'xk-3',
        code: 'XK-003',
        exportDate: '2026-08-23',
        sourceWarehouse: 'Kho Trung Tâm Quận 1',
        exportType: 'Xuất hủy',
        destination: 'Biên bản hủy hàng lỗi #48/2026',
        reason: 'Hết hạn sử dụng, hư hộp trong vận chuyển',
        items: [
            { ...product('P-001'), quantity: 45 },
            { ...product('P-006'), quantity: 30 },
        ],
        totalValue: 435000,
        status: 'Chờ duyệt',
        createdBy: 'Nguyễn Minh Tuấn',
    },
    {
        id: 'xk-4',
        code: 'XK-004',
        exportDate: '2026-08-24',
        sourceWarehouse: 'Kho Bình Thạnh',
        exportType: 'Chuyển chi nhánh',
        destination: 'Circle K - TP.Thủ Đức (Thảo Điền)',
        reason: 'Cân đối tồn kho giữa các chi nhánh cuối tháng',
        items: [
            { ...product('P-006'), quantity: 300 },
            { ...product('P-001'), quantity: 200 },
        ],
        totalValue: 3700000,
        status: 'Nháp',
        createdBy: 'Trần Văn Anh',
    },
    {
        id: 'xk-5',
        code: 'XK-005',
        exportDate: '2026-08-25',
        sourceWarehouse: 'Kho Trung Tâm Quận 1',
        exportType: 'Trả nhà cung cấp',
        destination: 'Công Ty TNHH Pepsico Việt Nam',
        reason: 'Lô nước ngọt sai quy cách đóng gói',
        items: [{ ...product('P-006'), quantity: 240 }],
        totalValue: 1680000,
        status: 'Chờ duyệt',
        createdBy: 'Lê Thị Hồng',
    },
];
