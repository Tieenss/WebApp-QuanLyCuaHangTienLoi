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
  createEmployee,
  fetchEmployees,
  setEmployeeModalOpen,
  updateEmployeeThunk,
} from '@/store/slices/employeeSlice';
import { fetchBranches } from '@/store/slices/branchSlice';
import {
  EMPLOYMENT_TYPE,
  EMPLOYMENT_TYPE_LABEL,
  RECORD_STATUS,
  SHIFT_CODE,
  SHIFT_LABEL,
  USER_ROLE,
  USER_ROLE_LABEL,
  BRANCH_KIND,
  POSITION_ROLE_MAP,
  EMPLOYEE_POSITIONS,
  positionForRole,
  type EmployeeFormValues,
} from '@/types';
import {
  applyFormErrors,
  COMMON_PATTERNS,
  getErrorMessage,
  isFormValidationError,
} from '@/utils/apiError';
import './EmployeeFormModal.css';

const ROLE_OPTIONS = Object.values(USER_ROLE).map((role) => ({
  value: role,
  label: USER_ROLE_LABEL[role],
}));

const generateNextEmployeeCode = (employees: Array<{ code: string }>): string => {
  let maxNum = 0;
  for (const emp of employees) {
    if (!emp.code) continue;
    const match = emp.code.trim().match(/^NV-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  let nextNum = maxNum + 1;
  let candidate = `NV-${String(nextNum).padStart(4, '0')}`;
  while (employees.some((e) => e.code?.toUpperCase() === candidate)) {
    nextNum += 1;
    candidate = `NV-${String(nextNum).padStart(4, '0')}`;
  }
  return candidate;
};

export const EmployeeFormModal: FC = () => {
  const [form] = Form.useForm<EmployeeFormValues>();
  const dispatch = useAppDispatch();
  const { message } = AntdApp.useApp();

  const { isModalOpen, selectedEmployee, employees } = useAppSelector(
    (state) => state.employee,
  );
  const branches = useAppSelector((state) => state.branch.branches);
  const user = useAppSelector((state) => state.auth.user);
  const isEditing = selectedEmployee !== null;
  const salaryType = Form.useWatch('employmentType', form);
  const isManager = user?.role === 'QUAN_LY';
  // const isAdmin = user?.role === 'ADMIN';

  // Lọc chi nhánh theo vai trò: THU_KHO chỉ được chọn Kho tổng
  const filterBranchesByRole = (role: string) => {
    let filtered = branches.filter(
        (b) => b.status === RECORD_STATUS.Active,
    );

    // QUẢN LÝ chỉ được thao tác tại chi nhánh của mình.
    if (isManager) {
      filtered = filtered.filter(
          (b) => b.id === user?.branchId,
      );
    }

    if (role === USER_ROLE.WarehouseKeeper) {
      return filtered.filter(
          (b) => b.kind === BRANCH_KIND.DistributionCenter,
      );
    }

    return filtered.filter(
        (b) => b.kind === BRANCH_KIND.Store,
    );
  };

  useEffect(() => {
    if (branches.length === 0) {
      dispatch(fetchBranches());
    }
  }, [branches.length, dispatch]);

  useEffect(() => {
    if (!isModalOpen) return;

    if (selectedEmployee !== null) {
      // Chuẩn hóa chức vụ của nhân viên cũ.
      // Nếu vi_tri cũ không nằm trong danh sách mới
      // thì suy ra chức vụ từ role.
      const position = POSITION_ROLE_MAP[selectedEmployee.position]
          ? selectedEmployee.position
          : positionForRole(selectedEmployee.role);

      // Xác định hình thức trả lương từ dữ liệu cũ.
      // Có lương cứng > 0 → Lương cứng.
      // Ngược lại → Lương giờ.
      const employmentType =
          selectedEmployee.baseSalary > 0
              ? EMPLOYMENT_TYPE.FullTime
              : EMPLOYMENT_TYPE.PartTime;

      form.setFieldsValue({
        ...selectedEmployee,
        position,
        role: selectedEmployee.role,
        employmentType,
        branchId: isManager
            ? user?.branchId ?? selectedEmployee.branchId
            : selectedEmployee.branchId,
      });

      return;
    }

    // Form thêm mới
    form.resetFields();

    const autoCode = generateNextEmployeeCode(employees);
    form.setFieldsValue({
      code: autoCode,
      position: 'Thu ngân',
      employmentType: EMPLOYMENT_TYPE.FullTime,
      defaultShift: SHIFT_CODE.Morning,
      role: USER_ROLE.Cashier,
      status: RECORD_STATUS.Active,
      hourlyWage: 0,
      baseSalary: 0,
      branchId: isManager ? user?.branchId ?? null : null,
    });
  }, [isModalOpen, selectedEmployee, employees, form, isManager, user?.branchId]);

  const handleSubmit = async (): Promise<void> => {
    try {
      const values = await form.validateFields();
      /**
       * Chỉ lưu một hình thức trả lương.
       *
       * FULL_TIME → dùng baseSalary, hourlyWage = 0
       * PART_TIME → dùng hourlyWage, baseSalary = 0
       */
      if (values.employmentType === EMPLOYMENT_TYPE.FullTime) {
        values.hourlyWage = 0;
      } else {
        values.baseSalary = 0;
      }

      /**
       * QUẢN LÝ chỉ được quản lý THU_NGAN
       * tại chi nhánh của chính mình.
       *
       * Backend vẫn kiểm tra lại rule này.
       */
      if (isManager) {
        values.role = USER_ROLE.Cashier;
        values.branchId = user?.branchId ?? null;
      }

      // Nếu vai trò là ADMIN/KE_TOAN → KHÔNG gửi branchId (DB constraint)
      if (values.role === USER_ROLE.Admin || values.role === USER_ROLE.Accountant) {
        values.branchId = null;
      }
      if (isEditing && selectedEmployee) {
        await dispatch(updateEmployeeThunk({ id: selectedEmployee.id, values })).unwrap();
        message.success('Đã cập nhật thông tin nhân viên.');
      } else {
        await dispatch(createEmployee(values)).unwrap();
        message.success('Đã thêm nhân viên mới.');
      }
      // Reload danh sách để cập nhật branchName từ Redux
      dispatch(fetchEmployees());
      dispatch(setEmployeeModalOpen(false));
    } catch (error: unknown) {
      if (isFormValidationError(error)) return;
      const errorMessage = getErrorMessage(error, 'Không thể lưu thông tin nhân viên');
      const handled = applyFormErrors(form, errorMessage, {
        email: ['email', 'hòm thư'],
        phone: ['số điện thoại', 'sđt', 'phone'],
        code: ['mã nhân viên'],
        branchId: ['chi nhánh'],
      });
      if (!handled) message.error(errorMessage);
    }
  };

  return (
    <Modal
      open={isModalOpen}
      title={
        isEditing
          ? `Chỉnh sửa nhân viên ${selectedEmployee?.code}`
          : 'Thêm nhân viên mới'
      }
      okText={isEditing ? 'Lưu thay đổi' : 'Thêm nhân viên'}
      cancelText="Huỷ"
      width={720}
      onOk={handleSubmit}
      onCancel={() => dispatch(setEmployeeModalOpen(false))}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" className="employee-form">
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="fullName"
              label="Họ và tên"
              rules={[
                { required: true, whitespace: true, message: 'Vui lòng nhập họ và tên.' },
                { max: 255, message: 'Họ và tên tối đa 255 ký tự.' },
              ]}
            >
              <Input placeholder="Họ và tên nhân viên" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="code"
              label="Mã nhân viên"
              rules={[
                { required: true, message: 'Vui lòng nhập mã nhân viên.' },
              ]}
            >
              <Input placeholder="VD: NV-0042" disabled />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
                name="position"
                label="Chức vụ"
                rules={[{ required: true, message: 'Vui lòng chọn chức vụ.' }]}
            >
              <Select
                  placeholder="Chọn chức vụ"
                  options={EMPLOYEE_POSITIONS
                      .filter((position) => !isManager || POSITION_ROLE_MAP[position] === USER_ROLE.Cashier)
                      .map((position) => ({
                        value: position,
                        label: position,
                      }))}
                  disabled={isManager && isEditing}
                  onChange={(value) => {
                    const role = POSITION_ROLE_MAP[value];

                    form.setFieldValue('role', role);

                    // Khi QUẢN LÝ tạo THU_NGAN thì giữ chi nhánh của mình.
                    if (isManager && role === USER_ROLE.Cashier) {
                      form.setFieldValue('branchId', user?.branchId ?? null);
                    } else {
                      form.setFieldValue('branchId', null);
                    }
                  }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
                name="role"
                label="Vai trò hệ thống"
                rules={[
                  {
                    required: true,
                    message: 'Vai trò hệ thống được xác định từ chức vụ.',
                  },
                ]}
            >
              <Select
                  options={
                    isManager
                        ? ROLE_OPTIONS.filter((option) => option.value === USER_ROLE.Cashier)
                        : ROLE_OPTIONS
                  }
                  disabled
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
                noStyle
                shouldUpdate={(prev, curr) => prev.role !== curr.role}
            >
              {({ getFieldValue }) => {
                const role = getFieldValue('role');
                const requiresBranch = !['ADMIN', 'KE_TOAN'].includes(role);
                const filteredBranches = requiresBranch
                    ? filterBranchesByRole(role)
                    : [];

                return (
                    <Form.Item
                        name="branchId"
                        label={`Chi nhánh${
                            requiresBranch
                                ? role === 'THU_KHO'
                                    ? ' (Thủ kho chỉ được gán Kho tổng)'
                                    : ''
                                : ' (không bắt buộc với Admin/Kế toán)'
                        }`}
                        rules={
                          requiresBranch
                              ? [{ required: true, message: 'Chọn chi nhánh.' }]
                              : []
                        }
                    >
                      <Select
                          options={filteredBranches.map((b) => ({
                            value: b.id,
                            label: `${b.code} - ${b.name}`,
                          }))}
                          allowClear
                          disabled={!requiresBranch || isManager}
                          placeholder={
                            requiresBranch
                                ? role === 'THU_KHO'
                                    ? 'Chọn Kho tổng'
                                    : isManager
                                        ? 'Chi nhánh của bạn'
                                        : 'Chọn chi nhánh'
                                : 'Không cần chọn'
                          }
                      />
                    </Form.Item>
                );
              }}
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
                name="defaultShift"
                label="Ca mặc định"
                rules={[{ required: true, message: 'Chọn ca mặc định.' }]}
            >
              <Select
                  options={Object.values(SHIFT_CODE).map((shift) => ({
                    value: shift,
                    label: SHIFT_LABEL[shift],
                  }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
                name="employmentType"
                label="Hình thức trả lương"
                rules={[
                  {
                    required: true,
                    message: 'Chọn hình thức trả lương.',
                  },
                ]}
            >
              <Select
                  options={Object.values(EMPLOYMENT_TYPE).map((type) => ({
                    value: type,
                    label: EMPLOYMENT_TYPE_LABEL[type],
                  }))}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            {salaryType === EMPLOYMENT_TYPE.PartTime ? (
                <Form.Item
                    name="hourlyWage"
                    label="Lương giờ (đồng)"
                    rules={[
                      {
                        required: true,
                        type: 'number',
                        min: 0,
                        message: 'Vui lòng nhập lương giờ >= 0.',
                      },
                    ]}
                >
                  <InputNumber
                      className="employee-amount-input"
                      min={0}
                      step={1000}
                      addonAfter="₫"
                      style={{ width: '100%' }}
                  />
                </Form.Item>
            ) : (
                <Form.Item
                    name="baseSalary"
                    label="Lương cứng (đồng/tháng)"
                    rules={[
                      {
                        required: true,
                        type: 'number',
                        min: 0,
                        message: 'Vui lòng nhập lương cứng >= 0.',
                      },
                    ]}
                >
                  <InputNumber
                      className="employee-amount-input"
                      min={0}
                      step={100000}
                      addonAfter="₫"
                      style={{ width: '100%' }}
                  />
                </Form.Item>
            )}
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
                name="status"
                label="Trạng thái"
                rules={[{ required: true, message: 'Chọn trạng thái.' }]}
            >
              <Select
                  options={[
                    { value: 'Active', label: 'Đang hoạt động' },
                    { value: 'Inactive', label: 'Ngừng hoạt động' },
                  ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Vui lòng nhập email.' },
                {
                  pattern: COMMON_PATTERNS.EMAIL,
                  message: 'Email không đúng định dạng (VD: example@domain.com).',
                },
              ]}
            >
              <Input placeholder="nv@example.com" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="phone"
              label="Số điện thoại"
              rules={[
                { required: true, message: 'Vui lòng nhập số điện thoại.' },
                {
                  pattern: COMMON_PATTERNS.PHONE,
                  message: 'Số điện thoại không hợp lệ (bắt đầu bằng 0, gồm 10 hoặc 11 chữ số).',
                },
              ]}
            >
              <Input placeholder="09xx xxx xxx" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};
