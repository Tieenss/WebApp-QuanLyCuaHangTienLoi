import { useEffect, useMemo, useState } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Popconfirm,
  message,
  Tag,
  Alert,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { taiKhoanApi, type TaiKhoanDTO, type CreateTaiKhoanRequest } from '@/api/taiKhoan';
import { chiNhanhApi, type ChiNhanhDTO } from '@/api/chiNhanh';
import { nhanVienApi, type NhanVienDTO } from '@/api/nhanVien';
import { USER_ROLE_LABEL, type UserRole } from '@/types';
import {
  applyFormErrors,
  COMMON_PATTERNS,
  getErrorMessage,
} from '@/utils/apiError';
import { compareDateDescWithId, matchKeyword } from '@/utils/formatters';
import { isInitialLoading } from '@/utils/tableLoading';

const VAI_TRO_OPTIONS = [
  { value: 'ADMIN', label: 'Admin / Giám đốc' },
  { value: 'KE_TOAN', label: 'Kế toán' },
  { value: 'THU_KHO', label: 'Thủ kho' },
  { value: 'QUAN_LY', label: 'Quản lý Chi nhánh' },
  { value: 'THU_NGAN', label: 'Thu ngân' },
];

export const AccountManagementPage = () => {
  const [data, setData] = useState<TaiKhoanDTO[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TaiKhoanDTO | null>(null);
  const [form] = Form.useForm();
  const selectedNhanVienId = Form.useWatch('idNhanVien', form);
  const [nhanVienOptions, setNhanVienOptions] = useState<any[]>([]);
  const [branches, setBranches] = useState<ChiNhanhDTO[]>([]);
  const [allNhanVien, setAllNhanVien] = useState<NhanVienDTO[]>([]);
  const nvById = useMemo(
      () => new Map(allNhanVien.map((nv) => [nv.id, nv])),
      [allNhanVien]
  );

  const branchNameById = useMemo(
      () =>
          new Map(
              branches.map((b) => [
                b.id,
                `${b.maChiNhanh} - ${b.tenChiNhanh}`,
              ])
          ),
      [branches]
  );

  const selectedNhanVien = selectedNhanVienId
      ? nvById.get(selectedNhanVienId)
      : undefined;

  const requiresBranch =
      !!selectedNhanVien &&
      !['ADMIN', 'KE_TOAN'].includes(selectedNhanVien.vaiTro ?? '');

  const canCreateAccount =
      nhanVienOptions.length > 0 &&
      Boolean(selectedNhanVien?.vaiTro) &&
      (!requiresBranch || Boolean(selectedNhanVien?.idChiNhanh));

  const filteredAccounts = useMemo(
    () =>
      data
        .filter((account) =>
          matchKeyword(search, [
            account.tenDangNhap,
            account.hoTen ?? '',
            account.email ?? '',
            account.vaiTro ?? '',
            account.trangThai,
          ]),
        )
        .sort((a, b) => compareDateDescWithId(a, b, (row) => row.ngayTao)),
    [data, search],
  );
  // const [selectedVaiTro, setSelectedVaiTro] = useState<string>('THU_NGAN');

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await taiKhoanApi.getAll();
      setData(result);
    } catch {
      message.error('Lỗi khi tải danh sách tài khoản');
    }
    setLoading(false);
  };

  const fetchNhanVienOptions = async () => {
    try {
      const result = await taiKhoanApi.getNhanVienChuaCoTaiKhoan();
      setNhanVienOptions(result);
    } catch {
      message.error('Lỗi khi tải danh sách nhân viên');
    }
  };

  const fetchBranches = async () => {
    try {
      const result = await chiNhanhApi.getAll();
      setBranches(result);
    } catch {
      // ignore
    }
  };

  const fetchAllNhanVien = async () => {
    try {
      const result = await nhanVienApi.getAll();
      setAllNhanVien(result);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (modalOpen) {
      if (nhanVienOptions.length === 0) fetchNhanVienOptions();
      if (branches.length === 0) fetchBranches();
      if (allNhanVien.length === 0) fetchAllNhanVien();
    }
  }, [modalOpen]);

  // NV chưa có tài khoản + lọc theo idChiNhanh được chọn
  // const filteredNhanVienOptions = useMemo(() => {
  //   const chiNhanhId = form.getFieldValue('idChiNhanh');
  //   return nhanVienOptions.filter((nv: any) => {
  //     if (!chiNhanhId) return true;
  //     return nv.idChiNhanh === chiNhanhId;
  //   });
  // }, [nhanVienOptions, form, modalOpen]);

  // Chỉ hiện chi nhánh nếu vai trò yêu cầu
  // const requiresBranch = !['ADMIN', 'KE_TOAN'].includes(selectedVaiTro);

  // Cập nhật NV options khi chọn chi nhánh
  // const handleBranchChange = (value: string) => {
  //   // Reset nhân viên đã chọn nếu không thuộc chi nhánh mới
  //   const currentNvId = form.getFieldValue('idNhanVien');
  //   if (currentNvId) {
  //     const nvExists = nhanVienOptions.some((nv: any) => nv.id === currentNvId && nv.idChiNhanh === value);
  //     if (!nvExists) form.setFieldValue('idNhanVien', undefined);
  //   }
  // };

  const handleCreate = async (values: any) => {
    try {
      const payload: CreateTaiKhoanRequest = {
        tenDangNhap: values.tenDangNhap,
        matKhau: values.matKhau,
        idNhanVien: values.idNhanVien,
      };

      await taiKhoanApi.create(payload);

      message.success('Tạo tài khoản thành công');
      setModalOpen(false);
      form.resetFields();
      fetchData();
      fetchNhanVienOptions();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error, 'Lỗi khi tạo tài khoản');
      const handled = applyFormErrors(form, errorMessage, {
        tenDangNhap: ['tên đăng nhập', 'tendangnhap'],
        matKhau: ['mật khẩu', 'matkhau'],
        idNhanVien: ['nhân viên', 'chi nhánh'],
      });
      if (!handled) message.error(errorMessage);
    }
  };

  const handleUpdate = async (values: any) => {
    if (!editing) return;
    try {
      await taiKhoanApi.update(editing.id, values);
      message.success('Cập nhật tài khoản thành công');
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      fetchData();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error, 'Lỗi khi cập nhật tài khoản');
      const handled = applyFormErrors(form, errorMessage, {
        matKhau: ['mật khẩu', 'matkhau'],
        trangThai: ['trạng thái', 'trangthai'],
        vaiTro: ['vai trò', 'vaitro'],
      });
      if (!handled) message.error(errorMessage);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await taiKhoanApi.delete(id);
      message.success('Xóa tài khoản thành công');
      fetchData();
      fetchNhanVienOptions();
    } catch (error: unknown) {
      message.error(getErrorMessage(error, 'Lỗi khi xóa tài khoản'));
    }
  };

  const openEdit = (record: TaiKhoanDTO) => {
    setEditing(record);
    form.setFieldsValue({
      ...record,
    });
    setModalOpen(true);
  };

  const columns: ColumnsType<TaiKhoanDTO> = [
    {
      title: 'Tên đăng nhập',
      dataIndex: 'tenDangNhap',
      key: 'tenDangNhap',
    },
    {
      title: 'Họ tên',
      dataIndex: 'hoTen',
      key: 'hoTen',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Vai trò',
      dataIndex: 'vaiTro',
      key: 'vaiTro',
      render: (vaiTro: string) => (
        <Tag color="blue">{USER_ROLE_LABEL[vaiTro as UserRole] || vaiTro}</Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'trangThai',
      key: 'trangThai',
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'green' : 'red'}>
          {status === 'ACTIVE' ? 'Hoạt động' : 'Khóa'}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
          />
          <Popconfirm
            title="Xóa tài khoản?"
            description="Hành động này không thể hoàn tác"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        <h2>Quản lý Tài khoản</h2>
        <Input.Search
          allowClear
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm theo tên đăng nhập, họ tên, email, vai trò, trạng thái..."
          style={{ maxWidth: 440 }}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditing(null);
            form.resetFields();
            setModalOpen(true);
          }}
        >
          Tạo tài khoản mới
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={filteredAccounts}
        rowKey="id"
        loading={isInitialLoading(loading, data)}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total) => `${total} tài khoản`,
        }}
      />

      <Modal
        title={editing ? 'Sửa tài khoản' : 'Tạo tài khoản mới'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={editing ? handleUpdate : handleCreate}
        >
          {!editing && (
            <>
              <Form.Item
                name="tenDangNhap"
                label="Tên đăng nhập"
                rules={[
                  { required: true, whitespace: true, message: 'Vui lòng nhập tên đăng nhập' },
                  {
                    pattern: COMMON_PATTERNS.USERNAME,
                    message: 'Tên đăng nhập phải từ 3 đến 50 ký tự, chỉ gồm chữ, số và dấu gạch dưới.',
                  },
                ]}
              >
                <Input placeholder="Nhập tên đăng nhập" />
              </Form.Item>

              <Form.Item
                name="matKhau"
                label="Mật khẩu"
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu' },
                  { min: 8, max: 100, message: 'Mật khẩu phải từ 8 đến 100 ký tự.' },
                ]}
              >
                <Input.Password placeholder="Nhập mật khẩu" />
              </Form.Item>

              {/*<Form.Item*/}
              {/*  name="vaiTro"*/}
              {/*  label="Vai trò"*/}
              {/*  rules={[{ required: true, message: 'Chọn vai trò' }]}*/}
              {/*>*/}
              {/*  <Select*/}
              {/*    placeholder="Chọn vai trò"*/}
              {/*    options={VAI_TRO_OPTIONS}*/}
              {/*    onChange={(v: string) => setSelectedVaiTro(v)}*/}
              {/*  />*/}
              {/*</Form.Item>*/}

              {nhanVienOptions.length === 0 && (
                  <Alert
                      type="warning"
                      showIcon
                      message="Chưa có nhân viên nào chưa gắn tài khoản — hãy tạo nhân viên ở mục Nhân sự trước"
                      style={{ marginBottom: 16 }}
                  />
              )}

              <Form.Item
                  name="idNhanVien"
                  label="Nhân viên liên kết"
                  rules={[
                    {
                      required: true,
                      message: 'Vui lòng chọn nhân viên liên kết',
                    },
                  ]}
              >
                <Select
                    placeholder="Chọn nhân viên chưa có tài khoản"
                    options={nhanVienOptions.map((nv: any) => {
                      const meta = nvById.get(nv.id);

                      const roleValue = meta?.vaiTro ?? nv.vaiTro;
                      const roleLabel =
                          USER_ROLE_LABEL[roleValue as UserRole] ??
                          roleValue ??
                          '—';

                      return {
                        value: nv.id,
                        label: `${meta?.maNhanVien ?? 'NV'} - ${nv.hoTen} (${roleLabel})`,
                      };
                    })}
                    showSearch
                    optionFilterProp="label"
                />
              </Form.Item>

              <Form.Item
                  noStyle
                  shouldUpdate={(prevValues, currentValues) =>
                      prevValues.idNhanVien !== currentValues.idNhanVien
                  }
              >
                {({ getFieldValue }) => {
                  const idNhanVien = getFieldValue('idNhanVien');
                  const nv = idNhanVien ? nvById.get(idNhanVien) : undefined;

                  if (!nv) {
                    return null;
                  }

                  const roleLabel =
                      USER_ROLE_LABEL[nv.vaiTro as UserRole] || nv.vaiTro || 'Chưa xác định';

                  const branchName = nv.idChiNhanh
                      ? branchNameById.get(nv.idChiNhanh) || 'Không xác định'
                      : 'Chưa có chi nhánh';

                  const requiresBranch =
                      !['ADMIN', 'KE_TOAN'].includes(nv.vaiTro ?? '');

                  const isValid =
                      Boolean(nv.vaiTro) &&
                      (!requiresBranch || Boolean(nv.idChiNhanh));

                  return (
                      <Alert
                          type={isValid ? 'info' : 'warning'}
                          showIcon
                          message={
                            isValid
                                ? 'Thông tin kế thừa từ nhân viên'
                                : 'Nhân viên chưa đủ thông tin để tạo tài khoản'
                          }
                          description={
                            <div>
                              <div>
                                <strong>Vai trò:</strong> {roleLabel}
                              </div>
                              <div>
                                <strong>Chi nhánh:</strong> {branchName}
                              </div>

                              {!nv.vaiTro && (
                                  <div style={{ marginTop: 8 }}>
                                    ⚠️ Nhân viên chưa được gán vai trò.
                                  </div>
                              )}

                              {requiresBranch && !nv.idChiNhanh && (
                                  <div style={{ marginTop: 4 }}>
                                    ⚠️ Nhân viên chưa được gán chi nhánh.
                                  </div>
                              )}
                            </div>
                          }
                      />
                  );
                }}
              </Form.Item>
            </>
          )}

          {editing && (
            <>
              <Form.Item
                name="matKhau"
                label="Mật khẩu mới (để trống nếu không đổi)"
                rules={[{ min: 8, max: 100, message: 'Mật khẩu phải từ 8 đến 100 ký tự.' }]}
              >
                <Input.Password placeholder="Nhập mật khẩu mới" />
              </Form.Item>

              <Form.Item name="trangThai" label="Trạng thái">
                <Select
                  options={[
                    { value: 'ACTIVE', label: 'Hoạt động' },
                    { value: 'INACTIVE', label: 'Khóa' },
                  ]}
                />
              </Form.Item>

              <Form.Item name="vaiTro" label="Vai trò">
                <Select options={VAI_TRO_OPTIONS} />
              </Form.Item>
            </>
          )}

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>Hủy</Button>
              <Button
                  type="primary"
                  htmlType="submit"
                  disabled={!editing && !canCreateAccount}
              >
                {editing ? 'Cập nhật' : 'Tạo mới'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
