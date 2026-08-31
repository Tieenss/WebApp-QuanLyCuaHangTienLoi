import type { FC } from 'react';
import {
  AppstoreOutlined,
  BankOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  DashboardOutlined,
  DeploymentUnitOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  ImportOutlined,
  ScanOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  TagsOutlined,
  TeamOutlined,
  TruckOutlined,
} from '@ant-design/icons';
import type { ModuleIconKey } from '@/config/modules';

/**
 * Map khoá icon logic trong `config/modules.ts` sang component icon thật.
 *
 * Tách ra đây để `modules.ts` không phải import JSX — nhờ vậy file cấu hình
 * module vẫn là TypeScript thuần và dùng được ở cả tầng không phải React.
 */
const ICON_MAP: Record<ModuleIconKey, FC> = {
  dashboard: DashboardOutlined,
  pos: ShoppingCartOutlined,
  'sales-order': FileTextOutlined,
  branch: ShopOutlined,
  employee: TeamOutlined,
  product: AppstoreOutlined,
  category: TagsOutlined,
  supplier: TruckOutlined,
  warehouse: DeploymentUnitOutlined,
  purchase: ImportOutlined,
  transfer: FileDoneOutlined,
  stocktake: ScanOutlined,
  attendance: ClockCircleOutlined,
  cashbook: BankOutlined,
  report: BarChartOutlined,
};

interface ModuleIconProps {
  name: ModuleIconKey;
}

export const ModuleIcon: FC<ModuleIconProps> = ({ name }) => {
  const IconComponent = ICON_MAP[name];
  return <IconComponent />;
};