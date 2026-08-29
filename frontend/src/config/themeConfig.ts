import type { ThemeConfig } from 'antd';
import { BRAND } from './brand';

/**
 * Theme antd cho toàn hệ thống, xây trên palette Circle K.
 * Sidebar/Header dùng nền tối `neutralDark` để đỏ thương hiệu nổi bật hơn.
 */
export const circleKTheme: ThemeConfig = {
  token: {
    colorPrimary: BRAND.primaryRed,
    colorInfo: BRAND.info,
    colorSuccess: BRAND.success,
    colorWarning: BRAND.warning,
    colorError: BRAND.error,
    colorLink: BRAND.primaryRed,
    colorLinkHover: BRAND.primaryRedHover,
    borderRadius: 8,
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    colorBgContainer: BRAND.bgContainer,
    colorBgLayout: BRAND.bgLayout,
    colorTextHeading: BRAND.textHeading,
    colorText: BRAND.textBody,
    colorTextSecondary: BRAND.textSecondary,
    colorBorder: BRAND.border,
  },
  components: {
    Layout: {
      headerBg: BRAND.bgContainer,
      headerColor: BRAND.textHeading,
      headerHeight: 64,
      headerPadding: '0 24px',
      siderBg: BRAND.neutralDarker,
      bodyBg: BRAND.bgLayout,
      footerBg: BRAND.bgLayout,
    },
    Menu: {
      darkItemBg: BRAND.neutralDarker,
      darkSubMenuItemBg: '#0B0C0E',
      darkItemSelectedBg: BRAND.primaryRed,
      darkItemSelectedColor: '#FFFFFF',
      darkItemHoverBg: 'rgba(227, 24, 55, 0.16)',
      darkItemHoverColor: '#FFFFFF',
      itemBorderRadius: 6,
      itemMarginInline: 10,
      iconSize: 16,
    },
    Button: {
      colorPrimary: BRAND.primaryRed,
      colorPrimaryHover: BRAND.primaryRedHover,
      colorPrimaryActive: BRAND.primaryRedActive,
      borderRadius: 6,
      controlHeight: 38,
      fontWeight: 500,
    },
    Card: {
      headerBg: BRAND.bgContainer,
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
      borderRadiusLG: 10,
    },
    Table: {
      headerBg: '#F9FAFB',
      headerColor: BRAND.textBody,
      headerSplitColor: '#F3F4F6',
      rowHoverBg: BRAND.primaryRedSoft,
      cellPaddingBlock: 12,
    },
    Tag: {
      borderRadius: 4,
    },
    Badge: {
      colorError: BRAND.primaryRed,
    },
    Segmented: {
      itemSelectedBg: BRAND.primaryRed,
      itemSelectedColor: '#FFFFFF',
    },
    Statistic: {
      titleFontSize: 13,
    },
    Descriptions: {
      labelBg: '#F9FAFB',
    },
  },
};