import { useEffect, useState } from 'react';
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
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { taiKhoanApi, type TaiKhoanDTO, type CreateTaiKhoanRequest } from '@/api/taiKhoan';
import { USER_ROLE_LABEL, type UserRole } from '@/types';

const VAI_TRO_OPTIONS = [
  { value: 'ADMIN', label: 'Admin / Giám đốc' },
  { value: 'KE_TOAN', label: 'Kế toán' },
  { value: 'THU_KHO', label: 'Thủ kho' },
  { value: 'QUAN_LY', label: 'Quản lý Chi nhánh' },
  { value: 'THU_NGAN', label: 'Thu ngân' },
];

export const AccountManagementPage = () => {
  const [data, setData] = useState<TaiKhoanDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TaiKhoanDTO | null>(null);
  const [form] = Form.useForm();
  const [nhanVienOptions, setNhanVienOptions] = useState<any[]>([]);

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

  useEffect(() => {
    fetchData();
    fetchNhanVienOptions();
  }, []);

  const handleCreate = async (values: any) => {
    try {
      await taiKhoanApi.create(values as CreateTaiKhoanRequest);
      message.success('Tạo tài khoản thành công');
      setModalOpen(false);
      form.resetFields();
      fetchData();
      fetchNhanVienOptions();
    } catch (e: any) {
      message.error(e.message || 'Lỗi khi tạo tài khoản');
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
    } catch {
      message.error('Lỗi khi cập nhật tài khoản');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await taiKhoanApi.delete(id);
      message.success('Xóa tài khoản thành công');
      fetchData();
      fetchNhanVienOptions();
    } catch {
      message.error('Lỗi khi xóa tài khoản');
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
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2>Quản lý Tài khoản</h2>
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
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
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
                rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập' }]}
              >
                <Input placeholder="Nhập tên đăng nhập" />
              </Form.Item>

              <Form.Item
                name="matKhau"
                label="Mật khẩu"
                rules={[{ required: !editing, message: 'Vui lòng nhập mật khẩu' }]}
              >
                <Input.Password placeholder="Nhập mật khẩu" />
              </Form.Item>

              <Form.Item name="idNhanVien" label="Nhân viên liên kết">
                <Select
                  placeholder="Chọn nhân viên"
                  options={nhanVienOptions.map((nv: any) => ({
                    value: nv.id,
                    label: `${nv.hoTen} - ${nv.email}`,
                  }))}
                  allowClear
                />
              </Form.Item>

              <Form.Item name="vaiTro" label="Vai trò">
                <Select placeholder="Chọn vai trò" options={VAI_TRO_OPTIONS} />
              </Form.Item>
            </>
          )}

          {editing && (
            <>
              <Form.Item name="matKhau" label="Mật khẩu mới (để trống nếu không đổi)">
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
              <Button type="primary" htmlType="submit">
                {editing ? 'Cập nhật' : 'Tạo mới'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
