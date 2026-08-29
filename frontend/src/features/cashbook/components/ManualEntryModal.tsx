import { useEffect, type FC } from 'react';
import {
  App as AntdApp,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
} from 'antd';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addManualEntry } from '@/store/slices/cashbookSlice';
import {
  CASH_CATEGORY,
  CASH_CATEGORY_LABEL,
  CASH_FLOW_DIRECTION,
  CASH_FLOW_DIRECTION_LABEL,
  PAYMENT_METHOD,
  PAYMENT_METHOD_LABEL,
  type CashFlowDirection,
  type CashEntry,
} from '@/types';
import { dayjs, today } from '@/utils/dateUtils';
import type { Dayjs } from 'dayjs';
import './ManualEntryModal.css';

const DIRECTION_OPTIONS = Object.values(CASH_FLOW_DIRECTION).map((d) => ({
  value: d,
  label: CASH_FLOW_DIRECTION_LABEL[d],
}));

const PAYMENT_METHOD_OPTIONS = Object.values(PAYMENT_METHOD).map((m) => ({
  value: m,
  label: PAYMENT_METHOD_LABEL[m],
}));

const CASH_CATEGORY_OPTIONS = Object.values(CASH_CATEGORY).map((c) => ({
  value: c,
  label: CASH_CATEGORY_LABEL[c],
}));

interface ManualEntryFormValues {
  direction: CashFlowDirection;
  category: string;
  amount: number;
  paymentMethod: string;
  counterparty: string;
  description: string;
  entryDate: Dayjs;
}

interface ManualEntryModalProps {
  open: boolean;
  onClose: () => void;
}

export const ManualEntryModal: FC<ManualEntryModalProps> = ({ open, onClose }) => {
  const [form] = Form.useForm<ManualEntryFormValues>();
  const dispatch = useAppDispatch();
  const { message } = AntdApp.useApp();

  const user = useAppSelector((state) => state.auth.user);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      direction: CASH_FLOW_DIRECTION.Payment,
      paymentMethod: PAYMENT_METHOD.BankTransfer,
      category: CASH_CATEGORY.Other,
      entryDate: dayjs(today()),
      amount: 0,
      counterparty: '',
      description: '',
    });
  }, [form, open]);

  const handleSubmit = async (): Promise<void> => {
    try {
      const values = await form.validateFields();
      const direction = values.direction;
      const amount = Number(values.amount);

      dispatch(
        addManualEntry({
          direction,
          category: values.category as CashEntry['category'],
          branchId: null,
          entryDate: values.entryDate.format('YYYY-MM-DD'),
          amount,
          paymentMethod: values.paymentMethod as CashEntry['paymentMethod'],
          counterparty: values.counterparty,
          referenceCode: null,
          description: values.description.trim(),
          createdBy:
            user === null
              ? 'Không xác định'
              : `${user.fullName} (${user.employeeCode})`,
        }),
      );
      message.success('Đã thêm phiếu thu chi mới.');
      onClose();
    } catch {
      // Lỗi validate đã được antd Form hiển thị tại từng field.
    }
  };

  return (
    <Modal
      open={open}
      title="Tạo phiếu thu chi thủ công"
      okText="Xác nhận"
      cancelText="Huỷ"
      onOk={handleSubmit}
      onCancel={onClose}
      destroyOnHidden
      width={560}
    >
      <Form form={form} layout="vertical" className="manual-entry-form">
        <Form.Item
          name="direction"
          label="Loại"
          rules={[{ required: true, message: 'Chọn loại phiếu.' }]}
        >
          <Select options={DIRECTION_OPTIONS} />
        </Form.Item>

        <Form.Item
          name="category"
          label="Hạng mục"
          rules={[{ required: true, message: 'Chọn hạng mục.' }]}
        >
          <Select options={CASH_CATEGORY_OPTIONS} />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="amount"
              label="Số tiền (đồng)"
              rules={[
                { required: true, message: 'Vui lòng nhập số tiền.' },
                { type: 'number', min: 0, message: 'Số tiền phải >= 0.' },
              ]}
            >
              <InputNumber
                className="manual-entry-amount-input"
                min={0}
                step={1000}
                addonAfter="₫"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="paymentMethod"
              label="Hình thức thanh toán"
              rules={[{ required: true, message: 'Chọn hình thức.' }]}
            >
              <Select options={PAYMENT_METHOD_OPTIONS} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="counterparty"
          label="Đối tượng"
          rules={[{ required: true, message: 'Vui lòng nhập đối tượng.' }]}
        >
          <Input placeholder="Tên cá nhân/tổ chức" />
        </Form.Item>

        <Form.Item
          name="description"
          label="Diễn giải"
          rules={[{ required: true, message: 'Vui lòng nhập diễn giải.' }]}
        >
          <Input.TextArea rows={2} maxLength={200} showCount placeholder="Mô tả phiếu thu chi." />
        </Form.Item>

        <Form.Item
          name="entryDate"
          label="Ngày hạch toán"
          rules={[{ required: true, message: 'Vui lòng chọn ngày.' }]}
        >
          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};