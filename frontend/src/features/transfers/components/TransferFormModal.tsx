import { useMemo, useState, type FC } from 'react';
import {
  Alert,
  App as AntdApp,
  Button,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ArrowRightOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { resolveStockLevel, stockOf } from '@/store/slices/stockSlice';
import {
  buildTransfer,
  transferShipped,
  type TransferDraftLine,
} from '@/store/slices/transferSlice';
import { DOCUMENT_STATUS, STOCK_LEVEL, USER_ROLE, type DocumentStatus, type StockLevel } from '@/types';
import { DISTRIBUTION_CENTER_ID, activeStores, branchNameById } from '@/mockData/branches';
import { sellableProducts } from '@/mockData/products';
import { dayjs, today } from '@/utils/dateUtils';
import { formatVND } from '@/utils/formatters';
import type { Dayjs } from 'dayjs';
import './TransferFormModal.css';

const { Text, Paragraph } = Typography;

interface TransferFormValues {
  toBranchId: string;
  requestDate: Dayjs;
  note: string;
}

/** Một dòng hàng trên form; `productId` rỗng nghĩa là chưa chọn sản phẩm. */
interface DraftRow extends TransferDraftLine {
  key: string;
}

interface TransferFormModalProps {
  open: boolean;
  onClose: () => void;
  /**
   * Trạng thái phiếu khi tạo:
   * - `PENDING`: yêu cầu chờ Thủ kho duyệt (StoreManager dùng).
   * - `COMPLETED`: Thủ kho/Admin trực tiếp xuất, tồn kho chuyển ngay.
   *
   * Mặc định `COMPLETED` để giữ hành vi cũ khi gọi không truyền prop.
   */
  initialStatus?: DocumentStatus;
}

const emptyRow = (): DraftRow => ({
  key: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  productId: '',
  quantity: 0,
});

/**
 * Form lập phiếu xuất kho nội bộ (module 9).
 *
 * BR-06: nguồn xuất luôn là Kho Tổng, chỉ chọn cửa hàng nhận.
 * BR-01: không cho xuất vượt tồn Kho Tổng — form chặn ngay tại ô số lượng
 * (`max`) và kiểm lại lần nữa trước khi lưu.
 *
 * Hàng pha chế tại quầy (danh mục `cat-03`) không luân chuyển: Kho Tổng không
 * giữ tồn cho nhóm này.
 */
export const TransferFormModal: FC<TransferFormModalProps> = ({
  open,
  onClose,
  initialStatus = DOCUMENT_STATUS.Completed,
}) => {
  const dispatch = useAppDispatch();
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm<TransferFormValues>();

  const user = useAppSelector((state) => state.auth.user);
  const balances = useAppSelector((state) => state.stock.balances);
  const transferCount = useAppSelector((state) => state.transfer.transfers.length);

  const isRequest = initialStatus === DOCUMENT_STATUS.Pending;

  /**
   * StoreManager chỉ được yêu cầu xuất cho chi nhánh mình phụ trách; Thủ kho
   * và Admin chọn được mọi cửa hàng.
   */
  const availableBranches = useMemo(() => {
    if (user?.role === USER_ROLE.StoreManager && user.branchId !== null) {
      return activeStores.filter((branch) => branch.id === user.branchId);
    }
    return activeStores;
  }, [user]);

  const defaultToBranchId =
    user?.role === USER_ROLE.StoreManager && user.branchId !== null
      ? user.branchId
      : null;

  const [toBranchId, setToBranchId] = useState<string | null>(defaultToBranchId);
  const [rows, setRows] = useState<DraftRow[]>([emptyRow()]);

  /** Dọn form sau khi modal đóng hẳn (dùng sự kiện, không dùng effect). */
  const handleAfterClose = (): void => {
    form.resetFields();
    setToBranchId(defaultToBranchId);
    setRows([emptyRow()]);
  };

  /** Chỉ hàng Kho Tổng đang có tồn > 0 mới xuất được. */
  const availableProducts = useMemo(
    () =>
      sellableProducts.filter(
        (product) => stockOf(balances, DISTRIBUTION_CENTER_ID, product.id) > 0,
      ),
    [balances],
  );

  const usedProductIds = useMemo(
    () => new Set(rows.map((row) => row.productId).filter((id) => id !== '')),
    [rows],
  );

  const validRows = useMemo(
    () => rows.filter((row) => row.productId !== '' && row.quantity > 0),
    [rows],
  );

  const totalValue = useMemo(
    () =>
      validRows.reduce((sum, row) => {
        const product = sellableProducts.find((item) => item.id === row.productId);
        return sum + row.quantity * (product?.costPrice ?? 0);
      }, 0),
    [validRows],
  );

  /**
   * Dòng nào xuất vượt tồn Kho Tổng.
   *
   * Ô `InputNumber` đã có `max`, nhưng người dùng vẫn có thể dán số lớn hơn,
   * nên cần kiểm lại trước khi lưu.
   */
  const overStockRows = useMemo(
    () =>
      validRows.filter(
        (row) =>
          row.quantity > stockOf(balances, DISTRIBUTION_CENTER_ID, row.productId),
      ),
    [validRows, balances],
  );

  const updateRow = (key: string, patch: Partial<DraftRow>): void => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  const handleSubmit = async (): Promise<void> => {
    try {
      const values = await form.validateFields();

      if (validRows.length === 0) {
        message.error('Phiếu xuất phải có ít nhất một dòng hàng hợp lệ.');
        return;
      }
      // Phiếu xuất trực tiếp (COMPLETED) chặn vượt tồn ngay. Phiếu yêu cầu
      // (PENDING) chưa đụng tồn nên bỏ qua — Thủ kho sẽ tự kiểm khi duyệt.
      if (isRequest === false && overStockRows.length > 0) {
        message.error('Không đủ tồn kho: có dòng hàng xuất vượt tồn Kho Tổng.');
        return;
      }

      const performedBy =
        user === null ? 'Không xác định' : `${user.fullName} (${user.employeeCode})`;

      const transfer = buildTransfer({
        toBranchId: values.toBranchId,
        lines: validRows.map(({ productId, quantity }) => ({ productId, quantity })),
        requestDate: values.requestDate.format('YYYY-MM-DD'),
        note: values.note?.trim() ?? '',
        createdBy: performedBy,
        existingCount: transferCount,
        initialStatus,
      });
      if (transfer === null) return;

      dispatch(transferShipped({ transfer, performedBy }));

      if (isRequest) {
        message.success(
          `Đã gửi yêu cầu xuất ${transfer.code} sang ${transfer.toBranchName}. Vui lòng chờ Thủ kho duyệt.`,
        );
      } else {
        message.success(
          `Đã xuất phiếu ${transfer.code} sang ${transfer.toBranchName}: trừ tồn Kho Tổng và cộng tồn cửa hàng.`,
        );
      }
      onClose();
    } catch {
      // antd đã hiển thị lỗi tại từng field.
    }
  };

  /** Nhãn cảnh báo khi tồn Kho Tổng của mặt hàng đang thấp. */
  const stockLevelHint = (level: StockLevel): string =>
    level === STOCK_LEVEL.Critical || level === STOCK_LEVEL.Low
      ? ' transfer-stock-low'
      : '';

  const lineColumns: ColumnsType<DraftRow> = [
    {
      title: 'Sản phẩm',
      dataIndex: 'productId',
      render: (value: string, row) => (
        <Select
          className="transfer-line-product"
          value={value === '' ? undefined : value}
          placeholder="Chọn sản phẩm có tồn ở Kho Tổng"
          showSearch
          optionFilterProp="label"
          onChange={(productId: string) => updateRow(row.key, { productId, quantity: 0 })}
          options={availableProducts.map((product) => ({
            value: product.id,
            label: `${product.name} (${product.sku})`,
            disabled: usedProductIds.has(product.id) && product.id !== value,
          }))}
        />
      ),
    },
    {
      title: 'Tồn Kho Tổng',
      key: 'sourceStock',
      align: 'right',
      width: 130,
      render: (_, row) => {
        if (row.productId === '') return <Text type="secondary">—</Text>;

        const balance = balances.find(
          (item) =>
            item.branchId === DISTRIBUTION_CENTER_ID &&
            item.productId === row.productId,
        );
        if (balance === undefined) return <Text type="secondary">0</Text>;

        const level = resolveStockLevel(
          balance.quantity,
          balance.minStock,
          balance.maxStock,
        );
        return (
          <Text className={`numeric-cell${stockLevelHint(level)}`}>
            {balance.quantity}
          </Text>
        );
      },
    },
    {
      title: 'Tồn cửa hàng',
      key: 'targetStock',
      align: 'right',
      width: 120,
      render: (_, row) =>
        row.productId === '' || toBranchId === null ? (
          <Text type="secondary">—</Text>
        ) : (
          <Text className="numeric-cell">
            {stockOf(balances, toBranchId, row.productId)}
          </Text>
        ),
    },
    {
      title: 'Số lượng xuất',
      dataIndex: 'quantity',
      align: 'right',
      width: 130,
      render: (value: number, row) => {
        const available =
          row.productId === ''
            ? 0
            : stockOf(balances, DISTRIBUTION_CENTER_ID, row.productId);
        return (
          <InputNumber<number>
            className="transfer-line-input"
            min={0}
            // BR-01: chặn xuất vượt tồn ngay tại ô nhập.
            max={available}
            step={6}
            value={value}
            disabled={row.productId === ''}
            status={value > available ? 'error' : undefined}
            onChange={(quantity) => updateRow(row.key, { quantity: quantity ?? 0 })}
          />
        );
      },
    },
    {
      title: 'Giá trị',
      key: 'lineTotal',
      align: 'right',
      width: 140,
      render: (_, row) => {
        const product = sellableProducts.find((item) => item.id === row.productId);
        return (
          <Text strong className="numeric-cell">
            {formatVND(row.quantity * (product?.costPrice ?? 0))}
          </Text>
        );
      },
    },
    {
      key: 'actions',
      align: 'center',
      width: 50,
      render: (_, row) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          disabled={rows.length === 1}
          onClick={() =>
            setRows((current) => current.filter((item) => item.key !== row.key))
          }
        />
      ),
    },
  ];

  return (
    <Modal
      open={open}
      title={isRequest ? 'Tạo yêu cầu xuất kho' : 'Lập phiếu xuất kho nội bộ'}
      okText={isRequest ? 'Gửi yêu cầu' : 'Xác nhận xuất kho'}
      cancelText="Huỷ"
      onOk={handleSubmit}
      onCancel={onClose}
      afterClose={handleAfterClose}
      destroyOnHidden
      width={1000}
    >
      <Alert
        type="info"
        showIcon
        className="transfer-alert"
        message={
          <Space size={6}>
            {branchNameById(DISTRIBUTION_CENTER_ID)}
            <ArrowRightOutlined className="transfer-route-arrow" />
            {toBranchId === null ? 'Chọn cửa hàng nhận' : branchNameById(toBranchId)}
          </Space>
        }
        description={
          isRequest
            ? 'Yêu cầu sẽ ở trạng thái "Chờ duyệt". Tồn kho hai đầu chưa bị đụng cho tới khi Thủ kho/Admin duyệt. Luân chuyển nội bộ không phát sinh dòng tiền nên không tạo phiếu sổ quỹ.'
            : 'Khi xác nhận, hệ thống trừ tồn Kho Tổng, cộng tồn cửa hàng và ghi 2 dòng thẻ kho. Luân chuyển nội bộ không phát sinh dòng tiền nên không tạo phiếu sổ quỹ.'
        }
      />

      <Form<TransferFormValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{
          toBranchId: defaultToBranchId ?? undefined,
          requestDate: dayjs(today()),
          note: '',
        }}
      >
        <Space size={16} wrap className="transfer-head-fields">
          <Form.Item
            name="toBranchId"
            label="Cửa hàng nhận hàng"
            rules={[{ required: true, message: 'Vui lòng chọn cửa hàng nhận.' }]}
            className="transfer-field-branch"
          >
            <Select
              placeholder="Chọn cửa hàng bán lẻ"
              showSearch
              optionFilterProp="label"
              disabled={defaultToBranchId !== null}
              onChange={setToBranchId}
              options={availableBranches.map((branch) => ({
                value: branch.id,
                label: `${branch.code} — ${branch.name}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="requestDate"
            label={isRequest ? 'Ngày cần hàng' : 'Ngày xuất kho'}
            rules={[{ required: true, message: 'Vui lòng chọn ngày.' }]}
          >
            <DatePicker
              format="DD/MM/YYYY"
              allowClear={false}
              maxDate={dayjs(today())}
            />
          </Form.Item>
        </Space>

        <Form.Item name="note" label="Ghi chú">
          <Input placeholder="Ví dụ: Cấp hàng bù cho ca cuối tuần." />
        </Form.Item>
      </Form>

      {overStockRows.length > 0 && (
        <Alert
          type="error"
          showIcon
          className="transfer-alert"
          message="Không đủ tồn kho"
          description={`${overStockRows.length} dòng hàng đang xuất vượt tồn Kho Tổng. Giảm số lượng trước khi lưu.`}
        />
      )}

      <Table<DraftRow>
        columns={lineColumns}
        dataSource={rows}
        rowKey="key"
        size="small"
        pagination={false}
        className="transfer-line-table"
      />

      <Button
        type="dashed"
        block
        icon={<PlusOutlined />}
        className="transfer-add-row"
        onClick={() => setRows((current) => [...current, emptyRow()])}
      >
        Thêm dòng hàng
      </Button>

      <Descriptions bordered size="small" column={2} className="transfer-totals">
        <Descriptions.Item label="Số dòng hàng">
          {validRows.length} dòng
        </Descriptions.Item>
        <Descriptions.Item label="Tổng giá trị hàng xuất">
          <Text strong className="transfer-grand-total">
            {formatVND(totalValue)}
          </Text>
        </Descriptions.Item>
      </Descriptions>

      <Paragraph type="secondary" className="transfer-foot-note">
        Giá trị tính theo giá vốn, chỉ để theo dõi nội bộ — không phải doanh thu hay
        chi phí.
      </Paragraph>
    </Modal>
  );
};
