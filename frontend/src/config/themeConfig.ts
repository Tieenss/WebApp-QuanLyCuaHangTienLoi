import type { ThemeConfig } from 'antd';

export const circleKTheme: ThemeConfig = {
    token: {
        colorPrimary: '#E31837', // Circle K Red
        colorInfo: '#E31837',
        colorSuccess: '#10B981',
        colorWarning: '#F59E0B',
        colorError: '#DC2626',
        colorLink: '#E31837',
        colorLinkHover: '#B30F24',
        borderRadius: 8,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        colorBgContainer: '#FFFFFF',
        colorBgLayout: '#F5F7FA',
        colorTextHeading: '#111827',
        colorText: '#374151',
        colorTextSecondary: '#6B7280',
    },
    components: {
        Layout: {
            headerBg: '#1A1D20', // Dark Sleek Header
            headerColor: '#FFFFFF',
            headerHeight: 64,
            headerPadding: '0 24px',
            siderBg: '#111315', // Sleek Dark Sidebar
        },
        Menu: {
            darkItemBg: '#111315',
            darkSubMenuItemBg: '#0B0C0E',
            darkItemSelectedBg: '#E31837', // Active Item Circle K Red
            darkItemSelectedColor: '#FFFFFF',
            darkItemHoverBg: 'rgba(227, 24, 55, 0.15)',
            darkItemHoverColor: '#FFFFFF',
            itemBorderRadius: 6,
            itemMarginInline: 12,
        },
        Button: {
            colorPrimary: '#E31837',
            colorPrimaryHover: '#C41230',
            colorPrimaryActive: '#A60F28',
            borderRadius: 6,
            controlHeight: 38,
            fontWeight: 500,
        },
        Card: {
            headerBg: '#FFFFFF',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
            borderRadiusLG: 10,
        },
        Table: {
            headerBg: '#F9FAFB',
            headerColor: '#374151',
            headerSplitColor: '#F3F4F6',
            rowHoverBg: '#FFF5F6',
        },
        Tag: {
            borderRadius: 4,
        },
        Badge: {
            colorError: '#E31837',
        },
    },
};
