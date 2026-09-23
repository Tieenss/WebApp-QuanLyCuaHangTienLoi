import { useEffect, type FC } from 'react';
import {
  App as AntdApp,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
} from 'antd';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  assignBranchManager,
  clearBranchManager,
  createBranch,
  setBranchModalOpen,
  updateBranchThunk,
} from '@/store/slices/branchSlice';
import { fetchEmployees } from '@/store/slices/employeeSlice';
import {
  BRANCH_KIND,
  BRANCH_KIND_LABEL,
  REGION,
  REGION_LABEL,
  RECORD_STATUS,
  type BranchFormValues,
} from '@/types';
import { COMMON_PATTERNS } from '@/utils/apiError';
import './BranchFormModal.css';

const KIND_OPTIONS = Object.values(BRANCH_KIND).map((kind) => ({
  value: kind,
  label: BRANCH_KIND_LABEL[kind],
}));

const REGION_OPTIONS = Object.values(REGION).map((region) => ({
  value: region,
  label: REGION_LABEL[region],
}));

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Đang hoạt động' },
  { value: 'Inactive', label: 'Ngừng hoạt động' },
];

// Chỉ nhận: "24/7" hoặc "HH:MM - HH:MM".
// HH: 00–23 (giờ đóng cho phép 24:00 để tương thích dữ liệu cũ), MM: 00–59.
const OPENING_HOURS_PATTERN =
    /^(24\/7|([01]\d|2[0-3]):[0-5]\d\s*-\s*(([01]\d|2[0-3]):[0-5]\d|24:00))$/;

type BranchEditorValues = BranchFormValues & { managerId?: string };

const generateNextBranchCode = (branches: Array<{ code: string }>): string => {
  let maxNum = 100;
  for (const b of branches) {
    if (!b.code) continue;
    const match = b.code.trim().match(/^CK-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  let nextNum = maxNum + 1;
  let candidate = `CK-${String(nextNum).padStart(4, '0')}`;
  while (branches.some((b) => b.code?.toUpperCase() === candidate)) {
    nextNum += 1;
    candidate = `CK-${String(nextNum).padStart(4, '0')}`;
  }
  return candidate;
};

export const BranchFormModal: FC = () => {
  const [form] = Form.useForm<BranchEditorValues>();
  const dispatch = useAppDispatch();
  const { message } = AntdApp.useApp();

  const { isModalOpen, selectedBranch, branches } = useAppSelector(
    (state) => state.branch,
  );
  const isEditing = selectedBranch !== null;
  const employees = useAppSelector((state) => state.employee.employees);
  const selectedKind = Form.useWatch('kind', form);
  const selectedStatus = Form.useWatch('status', form);

  useEffect(() => {
    if (!isModalOpen) return;
    dispatch(fetchEmployees());
    if (selectedBranch !== null) {
      form.setFieldsValue({ ...selectedBranch, managerId: selectedBranch.managerId });
      return;
    }
    form.resetFields();
    const autoCode = generateNextBranchCode(branches);
    form.setFieldsValue({
      code: autoCode,
      kind: BRANCH_KIND.Store,
      status: RECORD_STATUS.Active,
      region: REGION.South,
    });
  }, [isModalOpen, selectedBranch, branches, form]);

  const handleSubmit = async (): Promise<void> => {
    try {
      const values = await form.validateFields();
      const { managerId, ...branchValues } = values;
      const payload = { ...branchValues, phone: branchValues.phone.replace(/\s+/g, '') };
      if (isEditing && selectedBranch) {
        await dispatch(updateBranchThunk({ id: selectedBranch.id, values: payload })).unwrap();
        if (managerId !== selectedBranch.managerId) {
          if (managerId) {
            await dispatch(assignBranchManager({ branchId: selectedBranch.id, employeeId: managerId })).unwrap();
          } else {
            await dispatch(clearBranchManager(selectedBranch.id)).unwrap();
          }
        }
        message.success('Đã cập nhật thông tin chi nhánh.');
      } else {
        await dispatch(createBranch(payload)).unwrap();
        message.success('Đã thêm chi nhánh mới.');
      }
      dispatch(setBranchModalOpen(false));
    } catch (error: any) {
      message.error(error?.message || 'Có lỗi xảy ra');
    }
  };

  return (
    <Modal
      open={isModalOpen}
      title={
        isEditing
          ? `Chỉnh sửa chi nhánh ${selectedBranch?.code}`
          : 'Thêm chi nhánh mới'
      }
      okText={isEditing ? 'Lưu thay đổi' : 'Thêm chi nhánh'}
      cancelText="Huỷ"
      width={720}
      onOk={handleSubmit}
      onCancel={() => dispatch(setBranchModalOpen(false))}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" className="branch-form">
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
                name="code"
                label="Mã chi nhánh"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: 'Vui lòng nhập mã chi nhánh.',
                  },
                  {
                    max: 20,
                    message: 'Mã chi nhánh tối đa 20 ký tự.',
                  },
                ]}
            >
              <Input placeholder="VD: CK-0101" maxLength={20} disabled />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="name"
              label="Tên điểm bán"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: 'Vui lòng nhập tên.',
                },
                {
                  max: 255,
                  message: 'Tên chi nhánh tối đa 255 ký tự.',
                },
              ]}
            >
              <Input placeholder="Tên chi nhánh" maxLength={255} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="kind"
              label="Loại điểm"
              rules={[{ required: true, message: 'Chọn loại điểm.' }]}
            >
              <Select options={KIND_OPTIONS} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="region"
              label="Vùng miền"
              rules={[{ required: true, message: 'Chọn vùng miền.' }]}
            >
              <Select options={REGION_OPTIONS} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
                name="province"
                label="Tỉnh/Thành"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: 'Vui lòng nhập tỉnh/thành.',
                  },
                  {
                    max: 100,
                    message: 'Tỉnh/Thành tối đa 100 ký tự.',
                  },
                ]}
            >
              <Input placeholder="Tỉnh/Thành" maxLength={100} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
                name="district"
                label="Quận/Huyện"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: 'Vui lòng nhập quận/huyện.',
                  },
                  {
                    max: 100,
                    message: 'Quận/Huyện tối đa 100 ký tự.',
                  },
                ]}
            >
              <Input placeholder="Quận/Huyện" maxLength={100} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
            name="addressLine"
            label="Địa chỉ"
            rules={[
              {
                required: true,
                whitespace: true,
                message: 'Vui lòng nhập địa chỉ.',
              },
              {
                max: 500,
                message: 'Địa chỉ tối đa 500 ký tự.',
              },
            ]}
        >
          <Input
              placeholder="Số nhà, đường, phường/xã"
              maxLength={500}
          />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="phone"
              label="SĐT liên hệ chi nhánh"
              normalize={(value: string | undefined) => value?.replace(/\s+/g, '')}
              rules={[
                { required: true, message: 'Vui lòng nhập điện thoại.' },
                {
                  pattern: COMMON_PATTERNS.PHONE,
                  message: 'Số điện thoại không hợp lệ (bắt đầu bằng 0, gồm 10 hoặc 11 chữ số).',
                },
              ]}
            >
              <Input placeholder="028 xxxx xxxx" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            {isEditing ? (
              <Form.Item
                name="managerId"
                label={selectedKind === BRANCH_KIND.DistributionCenter
                  ? 'Người phụ trách kho' : 'Quản lý phụ trách'}
              >
                <Select
                  allowClear
                  disabled={selectedStatus === RECORD_STATUS.Inactive}
                  placeholder="Chọn người phụ trách"
                  options={employees
                    .filter((employee) => employee.status === RECORD_STATUS.Active)
                    .filter((employee) => employee.branchId === selectedBranch?.id)
                    .filter((employee) => selectedKind === BRANCH_KIND.DistributionCenter
                      ? employee.role === 'THU_KHO'
                      : employee.role === 'QUAN_LY')
                    .map((employee) => ({
                      value: employee.id,
                      label: `${employee.code} - ${employee.fullName}`,
                    }))}
                />
              </Form.Item>
            ) : (
              <Form.Item label="Người phụ trách">
                <Input value="Thiết lập sau khi tạo chi nhánh" disabled />
              </Form.Item>
            )}
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
                name="openingHours"
                label="Giờ mở cửa"
                normalize={(value: string | undefined) => value?.trim().toUpperCase()}
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: 'Vui lòng nhập giờ mở cửa.',
                  },
                  {
                    max: 50,
                    message: 'Giờ mở cửa tối đa 50 ký tự.',
                  },
                  {
                    pattern: OPENING_HOURS_PATTERN,
                    message:
                        'Giờ mở cửa phải là "24/7" hoặc dạng "HH:MM - HH:MM" (VD: 06:00 - 22:00).',
                  },
                ]}
            >
              <Input
                  placeholder='VD: "24/7" hoặc "06:00 - 22:00"'
                  maxLength={50}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="areaSqm"
              label="Diện tích (m²)"
              rules={[
                {
                  type: 'number',
                  min: 50,
                  message: 'Diện tích phải >= 50.',
                },
              ]}
            >
              <InputNumber className="branch-amount-input" min={0} step={10} addonAfter="m²" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="status"
              label="Trạng thái"
              rules={[{ required: true, message: 'Chọn trạng thái.' }]}
            >
              <Select options={STATUS_OPTIONS} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};
