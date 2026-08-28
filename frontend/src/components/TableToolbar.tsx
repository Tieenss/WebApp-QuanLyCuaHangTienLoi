import type { FC, ReactNode } from 'react';
import { Button, Col, Input, Row, Select, Space, Tooltip } from 'antd';
import {
  DownloadOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { SelectOption } from '@/types';
import './TableToolbar.css';

/** Một ô lọc dạng Select trên thanh công cụ. */
export interface ToolbarFilter {
  key: string;
  placeholder: string;
  /** `null` nghĩa là "tất cả". */
  value: string | null;
  options: SelectOption[];
  onChange: (value: string | null) => void;
  /** Độ rộng cột theo grid 24 của antd, mặc định 5. */
  span?: number;
}

interface TableToolbarProps {
  searchValue: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  filters?: ToolbarFilter[];
  /** Hiện nút xuất Excel khi truyền handler. */
  onExport?: () => void;
  /** Hiện nút đặt lại bộ lọc khi truyền handler. */
  onReset?: () => void;
  /** Nút hành động chính, ví dụ "Thêm mới". */
  actions?: ReactNode;
}

/**
 * Thanh công cụ chuẩn cho các trang danh sách: ô tìm kiếm + các Select lọc +
 * nút xuất Excel. Dùng chung để 13 module có cùng bố cục và hành vi.
 */
export const TableToolbar: FC<TableToolbarProps> = ({
  searchValue,
  searchPlaceholder,
  onSearchChange,
  filters = [],
  onExport,
  onReset,
  actions,
}) => (
  <Row gutter={[12, 12]} align="middle" className="table-toolbar">
    <Col xs={24} md={8} lg={7}>
      <Input
        allowClear
        value={searchValue}
        placeholder={searchPlaceholder}
        prefix={<SearchOutlined className="toolbar-search-icon" />}
        onChange={(event) => onSearchChange(event.target.value)}
      />
    </Col>

    {filters.map((filter) => (
      <Col xs={12} md={6} lg={filter.span ?? 4} key={filter.key}>
        <Select
          allowClear
          className="toolbar-filter"
          placeholder={filter.placeholder}
          value={filter.value}
          options={filter.options}
          // antd trả `undefined` khi bấm clear, chuẩn hoá về `null`.
          onChange={(value: string | undefined) => filter.onChange(value ?? null)}
        />
      </Col>
    ))}

    <Col flex="auto" className="table-toolbar-actions-col">
      <Space wrap>
        {onReset !== undefined && (
          <Tooltip title="Đặt lại bộ lọc">
            <Button icon={<ReloadOutlined />} onClick={onReset} />
          </Tooltip>
        )}
        {onExport !== undefined && (
          <Button icon={<DownloadOutlined />} onClick={onExport}>
            Xuất Excel
          </Button>
        )}
        {actions}
      </Space>
    </Col>
  </Row>
);