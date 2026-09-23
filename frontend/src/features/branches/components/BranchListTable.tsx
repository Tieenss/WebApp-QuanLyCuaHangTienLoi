import React from 'react';
import { Table, Tag, Typography, Button, Space, Popconfirm, message } from 'antd';
import { EditOutlined, DeleteOutlined, PhoneOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../../store';
import type { Branch } from '../../../types/branchTypes';
import {
    setSelectedBranch,
    setBranchModalOpen,
    deleteBranchThunk,
} from '../../../store/slices/branchSlice';
import { hasPermission, PERMISSIONS } from '../../../config/rbacConfig';
import './BranchListTable.css';

const { Text } = Typography;

interface BranchListTableProps {
    searchQuery: string;
}

export const BranchListTable: React.FC<BranchListTableProps> = ({ searchQuery }) => {
    const dispatch = useDispatch<any>();
    const { branches } = useSelector((state: RootState) => state.branch);
    const user = useSelector((state: RootState) => state.auth.user);
    const canManage = hasPermission(user, PERMISSIONS.BRANCHES_MANAGE);

    const handleEdit = (branch: Branch) => {
        dispatch(setSelectedBranch(branch));
        dispatch(setBranchModalOpen(true));
    };

    const handleDelete = (id: string, name: string) => {
        dispatch(deleteBranchThunk(id));
        message.success(`Đã xóa chi nhánh "${name}"!`);
    };

    const filteredBranches = branches.filter((b) => {
        const q = searchQuery.toLowerCase();
        return (
            b.name.toLowerCase().includes(q) ||
            b.id.toLowerCase().includes(q) ||
            (b.managerName && b.managerName.toLowerCase().includes(q))
        );
    });

    const columns: ColumnsType<Branch> = [
        {
            title: 'Mã CN',
            dataIndex: 'id',
            key: 'id',
            width: 100,
            render: (id) => <Text className="branch-code">{id}</Text>,
        },
        {
            title: 'Chi Nhánh',
            dataIndex: 'name',
            key: 'name',
            render: (name, record) => (
                <div>
                    <Text className="branch-name">{name}</Text>
                    <div>
                        <Text type="secondary" className="branch-address">
                            {record.addressLine}, {record.district}
                        </Text>
                    </div>
                </div>
            ),
        },
        {
            title: 'Liên Hệ',
            dataIndex: 'phone',
            key: 'phone',
            width: 150,
            render: (phone) => (
                <span className="branch-phone">
                    <PhoneOutlined className="branch-phone-icon" />
                    {phone}
                </span>
            ),
        },
        {
            title: 'Quản Lý',
            dataIndex: 'managerName',
            key: 'managerName',
            width: 140,
        },
        {
            title: 'Nhân Sự',
            dataIndex: 'staffCount',
            key: 'staffCount',
            align: 'center',
            width: 90,
        },
        {
            title: 'Trạng Thái',
            dataIndex: 'status',
            key: 'status',
            align: 'center',
            width: 130,
            render: (status) => (
                <Tag color={status === 'Active' ? 'success' : 'warning'}>
                    {status === 'Active' ? 'Đang hoạt động' : 'Tạm đóng'}
                </Tag>
            ),
        },
        ...(canManage
            ? [
                  {
                      title: 'Thao Tác',
                      key: 'actions',
                      align: 'center' as const,
                      width: 110,
                      render: (_: unknown, record: Branch) => (
                          <Space size={4}>
                              <Button
                                  type="text"
                                  icon={<EditOutlined className="branch-edit-icon" />}
                                  onClick={() => handleEdit(record)}
                              />
                              <Popconfirm
                                  title="Xóa chi nhánh?"
                                  description={`Bạn có chắc muốn xóa "${record.name}"?`}
                                  onConfirm={() => handleDelete(record.id, record.name)}
                                  okText="Xóa"
                                  cancelText="Hủy"
                                  okButtonProps={{ danger: true }}
                              >
                                  <Button
                                      type="text"
                                      icon={<DeleteOutlined className="branch-delete-icon" />}
                                  />
                              </Popconfirm>
                          </Space>
                      ),
                  },
              ]
            : []),
    ];

    return (
        <Table<Branch>
            columns={columns}
            dataSource={filteredBranches}
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: true }}
            size="middle"
        />
    );
};
