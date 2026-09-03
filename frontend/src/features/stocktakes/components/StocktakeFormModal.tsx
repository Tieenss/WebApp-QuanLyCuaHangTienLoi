import { useEffect, useMemo, useState, type FC } from 'react';
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Table,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchStock, stockOf } from '@/store/slices/stockSlice';
import { fetchProducts } from '@/store/slices/productSlice';
import { DOCUMENT_STATUS, type Stocktake, type StocktakeLine } from '@/types';
import { dayjs, today } from '@/utils/dateUtils';
import type { Dayjs } from 'dayjs';
import './StocktakeFormModal.css';

const { Text, Paragraph } = Typography;

interface StocktakeFormValues {
  branchId: string;
  countDate: Dayjs;
  note: string;
}

interface DraftRow extends StocktakeLine {
  key: string;
}

interface StocktakeFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (stocktake: Stocktake) => void;
}

const varianceReasons = [
  'Hao hụt tự nhiên hàng đồ ăn nóng',
  'Sai sót nhập liệu tại quầy POS',
  'Hàng hư hỏng chưa lập phiếu huỷ',
  'Thất thoát chưa xác định nguyên nhân',
  'Nhân viên sử dụng nội bộ',
];

const emptyRow = (): DraftRow => ({
  key: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  id: '',
  productId: '',
  sku: '',
  productName: '',
  unit: '',
  systemQuantity: 0,
  countedQuantity: 0,
  varianceQuantity: 0,
  unitCost: 0,
  varianceValue: 0,
  reason: '',
});

export const StocktakeFormModal: FC<StocktakeFormModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm<StocktakeFormValues>();
  const balances = useAppSelector((state) => state.stock.balances);
  const branches = useAppSelector((state) => state.branch.branches);
  const products = useAppSelector((state) => state.product.products);

  const sellableProducts = products.filter((p) => p.status === 'Active');
  const branchById = (id: string) => branches.find((b) => b.id === id);

  // Load stock + products chỉ khi mở modal — tránh fetch lặp mỗi lần re-render
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (!open) return;
    dispatch(fetchStock());
    dispatch(fetchProducts());
  }, [dispatch, open]);

  const [branchId, setBranchId] = useState<string | null>(null);
  const [rows, setRows] = useState<DraftRow[]>([emptyRow()]);

  const handleAfterClose = (): void => {
    form.resetFields();
    setBranchId(null);
    setRows([emptyRow()]);
  };

  const availableProducts = useMemo(
    () =>
      sellableProducts.filter(
        (product) => branchId && stockOf(balances, branchId, product.id) > 0,
      ),
    [sellableProducts, balances, branchId],
  );

  const usedProductIds = useMemo(
    () => new Set(rows.map((row) => row.productId).filter((id) => id !== '')),
    [rows],
  );

  const handleProductChange = (key: string, productId: string): void => {
    const product = sellableProducts.find((p) => p.id === productId);
    if (!product) return;

    const systemQty = branchId ? stockOf(balances, branchId, productId) : 0;

    setRows((prev) =>
      prev.map((row) =>
        row.key === key
          ? {
              ...row,
              productId,
              sku: product.sku,
              productName: product.name,
              unit: product.unit,
              systemQuantity: systemQty,
              countedQuantity: systemQty,
              varianceQuantity: 0,
              unitCost: product.costPrice,
              varianceValue: 0,
            }
          : row,
      ),
    );
  };

  const handleCountedChange = (key: string, countedQty: number): void => {
    setRows((prev) =>
      prev.map((row) =>
        row.key === key
          ? {
              ...row,
              countedQuantity: countedQty,
              varianceQuantity: countedQty - row.systemQuantity,
              varianceValue:
                (countedQty - row.systemQuantity) * row.unitCost,
            }
          : row,
      ),
    );
  };

  const handleReasonChange = (key: string, reason: string): void => {
    setRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, reason } : row)),
    );
  };

  const addRow = (): void => {
    setRows((prev) => [...prev, emptyRow()]);
  };

  const removeRow = (key: string): void => {
    setRows((prev) => prev.filter((row) => row.key !== key));
  };

  const lineColumns: ColumnsType<DraftRow> = [
    {
      title: 'Sản phẩm',
      dataIndex: 'productId',
      width: 250,
      render: (_: unknown, record: DraftRow) => (
        <Select
          showSearch
          placeholder="Chọn sản phẩm"
          value={record.productId || undefined}
          onChange={(val) => handleProductChange(record.key, val)}
          style={{ width: '100%' }}
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={availableProducts
            .filter((p) => !usedProductIds.has(p.id) || record.productId === p.id)
            .map((p) => ({
              value: p.id,
              label: `${p.sku} - ${p.name}`,
            }))}
        />
      ),
    },
    {
      title: 'Tồn sổ sách',
      dataIndex: 'systemQuantity',
      align: 'center',
      width: 100,
      render: (val: number) => <Text className="numeric-cell">{val}</Text>,
    },
    {
      title: 'Đếm thực tế',
      dataIndex: 'countedQuantity',
      align: 'center',
      width: 120,
      render: (val: number, record: DraftRow) => (
        <InputNumber
          min={0}
          value={val}
          onChange={(v) => handleCountedChange(record.key, v ?? 0)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Lệch',
      dataIndex: 'varianceQuantity',
      align: 'center',
      width: 80,
      render: (val: number) => (
        <Text
          strong
          className={`numeric-cell ${val < 0 ? 'qty-loss' : val > 0 ? 'qty-gain' : ''}`}
        >
          {val > 0 ? `+${val}` : val}
        </Text>
      ),
    },
    {
      title: 'Nguyên nhân',
      dataIndex: 'reason',
      width: 200,
      render: (val: string, record: DraftRow) =>
        record.varianceQuantity !== 0 ? (
          <Select
            placeholder="Chọn nguyên nhân"
            value={val || undefined}
            onChange={(v) => handleReasonChange(record.key, v)}
            style={{ width: '100%' }}
            options={varianceReasons.map((r) => ({ value: r, label: r }))}
          />
        ) : (
          <Text type="secondary">Khớp sổ sách</Text>
        ),
    },
    {
      title: '',
      key: 'action',
      width: 50,
      render: (_: unknown, record: DraftRow) =>
        rows.length > 1 && record.productId ? (
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => removeRow(record.key)}
          />
        ) : null,
    },
  ];

  const handleSubmit = (): void => {
    form.validateFields().then(async (values) => {
      const validRows = rows.filter((row) => row.productId !== '');
      if (validRows.length === 0) return;

      const missingReason = validRows.find(
        (row) => row.varianceQuantity !== 0 && !row.reason,
      );
      if (missingReason) {
        message.error(
          `Vui lòng chọn nguyên nhân lệch cho sản phẩm "${missingReason.productName || missingReason.sku}"`,
        );
        return;
      }

      const varianceLines = validRows.filter((row) => row.varianceQuantity !== 0);
      const branch = branchById(values.branchId);

      try {
        const { phieuKiemKeApi } = await import('@/api/phieuKiemKe');
        const created = await phieuKiemKeApi.createWithLines({
          idChiNhanh: values.branchId,
          ngayKiemKe: values.countDate.format('YYYY-MM-DD'),
          ghiChu: values.note,
          lines: validRows.map((row) => ({
            idPhieuKiemKe: '00000000-0000-0000-0000-000000000000',
            idSanPham: row.productId,
            tonHeThong: row.systemQuantity,
            tonThucTe: row.countedQuantity,
            soLuongLech: row.varianceQuantity,
            lyDoLech: row.reason,
            donGiaVon: row.unitCost,
            giaTriLech: row.varianceValue,
          })),
        });

        const newStocktake = {
          id: created.id!,
          code: created.maPhieu ?? '',
          branchId: values.branchId,
          branchName: branch?.name ?? '',
          countDate: values.countDate.format('YYYY-MM-DD'),
          status: DOCUMENT_STATUS.Pending,
          lines: validRows.map((row) => ({
            ...row,
            id: `stl-new-${row.key}`,
          })),
          totalItemsCounted: validRows.length,
          totalVarianceItems: varianceLines.length,
          totalVarianceValue: varianceLines.reduce((sum, row) => sum + row.varianceValue, 0),
          countedBy: branch?.managerName ?? 'Thủ kho',
          approvedBy: null,
          note: values.note,
        };

        // Reload danh sách
        onSuccess(newStocktake);
        onClose();
      } catch (e: any) {
        console.error('[StocktakeForm] create error:', e);
        alert('Lỗi tạo phiếu kiểm kê: ' + (e.message || e));
      }
    }).catch((err) => {
      console.error('[StocktakeForm] validate error:', err);
    });
  };

  return (
    <Modal
      title="Tạo phiếu kiểm kê"
      open={open}
      onCancel={onClose}
      afterClose={handleAfterClose}
      width={1000}
      footer={
        <Space>
          <Button onClick={onClose}>Huỷ</Button>
          <Button type="primary" onClick={handleSubmit}>
            Tạo phiếu
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        <Space size={16} style={{ width: '100%' }} wrap>
          <Form.Item
            name="branchId"
            label="Chi nhánh"
            rules={[{ required: true, message: 'Vui lòng chọn chi nhánh' }]}
          >
            <Select
              placeholder="Chọn chi nhánh"
              style={{ width: 280 }}
              value={branchId}
              onChange={(val) => setBranchId(val)}
              options={branches.map((s) => ({ value: s.id, label: s.name }))}
            />
          </Form.Item>
          <Form.Item
            name="countDate"
            label="Ngày kiểm kê"
            initialValue={dayjs(today())}
            rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
          >
            <DatePicker format="DD/MM/YYYY" style={{ width: 160 }} />
          </Form.Item>
        </Space>

        <Form.Item name="note" label="Ghi chú" style={{ marginBottom: 8 }}>
          <Input.TextArea placeholder="Nhập ghi chú (nếu có)" rows={2} />
        </Form.Item>

        <Paragraph type="secondary" style={{ marginBottom: 8 }}>
          Danh sách sản phẩm kiểm kê:
        </Paragraph>

        <Table
          columns={lineColumns}
          dataSource={rows}
          rowKey="key"
          size="small"
          pagination={false}
          scroll={{ x: 800 }}
          footer={() => (
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={addRow}
              style={{ width: '100%' }}
            >
              Thêm dòng sản phẩm
            </Button>
          )}
        />
      </Form>
    </Modal>
  );
};
