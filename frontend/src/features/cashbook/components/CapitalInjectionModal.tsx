import { useEffect, type FC } from 'react';
import {
  Alert,
  App as AntdApp,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Typography,
} from 'antd';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addCapitalInjection } from '@/store/slices/cashbookSlice';
import { dayjs, today } from '@/utils/dateUtils';
import { formatVND } from '@/utils/formatters';
import type { Dayjs } from 'dayjs';
import './CapitalInjectionModal.css';

const { Paragraph, Text } = Typography;

interface CapitalFormValues {
  amount: number;
  entryDate: Dayjs;
  description: string;
}

interface CapitalInjectionModalProps {
  open: boolean;
  onClose: () => void;
}

/** Mức cấp vốn tối thiểu — tránh nhập nhầm thiếu chữ số. */
const MIN_AMOUNT = 1_000_000;

/**
 * Admin cấp vốn cho quỹ — phiếu THU hạng mục CAP_VON.
 *
 * Đây là cơ chế "khoá van" trong luồng nghiệp vụ (`luong_nghiep_vu.md` mục 5.1):
 * nếu Admin không cấp vốn thì sổ quỹ không có tiền, Kế toán không duyệt chi
 * lương hay thanh toán nhà cung cấp được. Vì vậy modal hiện luôn số dư hiện tại
 * để Admin quyết định dựa trên số thật.
 */
export const CapitalInjectionModal: FC<CapitalInjectionModalProps> = ({
  open,
  onClose,
}) => {
  const dispatch = useAppDispatch();
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm<CapitalFormValues>();

  const user = useAppSelector((state) => state.auth.user);
  const entries = useAppSelector((state) => state.cashbook.entries);

  /**
   * Số dư quỹ hiện tại. `entries` sắp xếp mới-nhất-trước nên phần tử đầu mang
   * `runningBalance` sau cùng.
   */
  const currentBalance = entries[0]?.runningBalance ?? 0;

  // Nạp lại giá trị mặc định mỗi lần mở để không dùng lại số lần trước.
  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        amount: 500_000_000,
        entryDate: dayjs(today()),
        description: '',
      });
    }
  }, [form, open]);

  const handleSubmit = async (): Promise<void> => {
    try {
      const values = await form.validateFields();

      dispatch(
        addCapitalInjection({
          amount: values.amount,
          entryDate: values.entryDate.format('YYYY-MM-DD'),
          description: values.description.trim(),
          createdBy:
            user === null
              ? 'Không xác định'
              : `${user.fullName} (${user.employeeCode})`,
        }),
      );

      message.success(
        `Đã cấp vốn ${formatVND(values.amount)} vào quỹ tổng công ty.`,
      );
      onClose();
    } catch {
      // antd đã hiển thị lỗi tại từng field.
    }
  };

  return (
    <Modal
      open={open}
      title="Cấp vốn cho quỹ"
      okText="Xác nhận cấp vốn"
      cancelText="Huỷ"
      onOk={handleSubmit}
      onCancel={onClose}
      destroyOnHidden
      width={520}
    >
      <Paragraph type="secondary" className="capital-intro">
        Phiếu thu hạng mục <Text strong>Cấp vốn</Text> ghi vào quỹ tổng công ty,
        không thuộc chi nhánh nào.
      </Paragraph>

      <Alert
        type="info"
        showIcon
        className="capital-alert"
        message={`Số dư quỹ hiện tại: ${formatVND(currentBalance)}`}
        description="Kế toán chỉ duyệt chi được trong phạm vi số dư này."
      />

      <Form<CapitalFormValues> form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="amount"
          label="Số tiền cấp vốn"
          rules={[
            { required: true, message: 'Vui lòng nhập số tiền.' },
            {
              type: 'number',
              min: MIN_AMOUNT,
              message: `Số tiền tối thiểu ${formatVND(MIN_AMOUNT)}.`,
            },
          ]}
        >
          <InputNumber<number>
            className="capital-amount-input"
            min={MIN_AMOUNT}
            step={10_000_000}
            addonAfter="₫"
            // Hiển thị dấu phân cách nghìn để không đếm nhầm chữ số.
            formatter={(value) => `${value ?? 0}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
            parser={(value) => Number((value ?? '0').replace(/\./g, ''))}
          />
        </Form.Item>

        <Form.Item
          name="entryDate"
          label="Ngày hạch toán"
          rules={[{ required: true, message: 'Vui lòng chọn ngày.' }]}
        >
          <DatePicker
            className="capital-date-input"
            format="DD/MM/YYYY"
            allowClear={false}
            // Không cho ghi nhận vốn ở tương lai.
            maxDate={dayjs(today())}
          />
        </Form.Item>

        <Form.Item name="description" label="Diễn giải">
          <Input.TextArea
            rows={2}
            maxLength={200}
            showCount
            placeholder="Ví dụ: Cấp vốn hoạt động quý 4/2026."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
