import { useEffect, type FC } from 'react';
import { Alert, Form, Input, InputNumber, Modal, Typography } from 'antd';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { adjustHours, closeHourAdjust } from '@/store/slices/payrollSlice';
import { formatVND } from '@/utils/formatters';
import './HourAdjustModal.css';

const { Text, Paragraph } = Typography;

interface HourAdjustFormValues {
  hours: number;
  reason: string;
}

/**
 * Modal điều chỉnh giờ làm (Tầng 1 của luồng duyệt lương).
 *
 * Theo `bang_luong.ly_do_dieu_chinh`, lý do là **bắt buộc** khi có sửa giờ —
 * đây là dấu vết duy nhất giải thích vì sao số giờ khác với dữ liệu chấm công
 * hệ thống tổng hợp, nên không cho để trống.
 */
export const HourAdjustModal: FC = () => {
  const dispatch = useAppDispatch();
  const [form] = Form.useForm<HourAdjustFormValues>();

  const adjustingId = useAppSelector((state) => state.payroll.adjustingId);
  const row = useAppSelector((state) =>
    state.payroll.rows.find((item) => item.id === state.payroll.adjustingId),
  );

  // Nạp lại giá trị mỗi lần mở để không dùng lại số của dòng trước.
  useEffect(() => {
    if (row) {
      form.setFieldsValue({
        hours: row.adjustedHours ?? row.totalHours,
        reason: row.adjustReason,
      });
    }
  }, [form, row]);

  if (adjustingId === null || !row) return null;

  const handleSubmit = async (): Promise<void> => {
    try {
      const values = await form.validateFields();
      dispatch(
        adjustHours({
          id: row.id,
          hours: values.hours,
          reason: values.reason,
        }),
      );
    } catch {
      // antd đã hiển thị lỗi tại từng field.
    }
  };

  return (
    <Modal
      open
      title="Điều chỉnh giờ làm"
      okText="Lưu điều chỉnh"
      cancelText="Huỷ"
      onOk={handleSubmit}
      onCancel={() => dispatch(closeHourAdjust())}
      destroyOnHidden
      width={520}
    >
      <Paragraph type="secondary" className="hour-adjust-intro">
        <Text strong>{row.employeeName}</Text> · {row.employeeCode} ·{' '}
        {row.branchName}
      </Paragraph>

      <Alert
        type="info"
        showIcon
        className="hour-adjust-alert"
        message={`Giờ hệ thống tổng hợp: ${row.totalHours.toFixed(1)} giờ`}
        description={`Thực nhận hiện tại ${formatVND(row.netPay)}. Sửa số giờ sẽ tính lại lương theo ca và thực nhận.`}
      />

      <Form<HourAdjustFormValues> form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="hours"
          label="Số giờ làm thực tế"
          rules={[
            { required: true, message: 'Vui lòng nhập số giờ.' },
            {
              type: 'number',
              min: 0,
              max: 400,
              message: 'Số giờ phải trong khoảng 0 – 400.',
            },
          ]}
        >
          <InputNumber
            className="hour-adjust-input"
            min={0}
            max={400}
            step={0.5}
            addonAfter="giờ"
          />
        </Form.Item>

        <Form.Item
          name="reason"
          label="Lý do điều chỉnh"
          rules={[
            { required: true, message: 'Bắt buộc ghi lý do khi sửa giờ làm.' },
            { min: 8, message: 'Lý do quá ngắn, hãy ghi rõ để đối chiếu về sau.' },
          ]}
        >
          <Input.TextArea
            rows={3}
            maxLength={200}
            showCount
            placeholder="Ví dụ: Nhân viên làm bù ca đêm 02/09 nhưng máy chấm công lỗi."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
