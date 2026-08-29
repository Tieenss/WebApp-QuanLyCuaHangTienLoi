import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { TIME_RANGE, type TimeRange } from '@/types';

/**
 * State giao diện dùng chung: trạng thái sidebar, khoảng thời gian đang lọc,
 * số thông báo. Tách khỏi `authSlice` để việc đăng xuất không xoá tuỳ chỉnh UI.
 */
export interface UiState {
  isSidebarCollapsed: boolean;
  /** Khoảng thời gian lọc dùng chung cho dashboard và báo cáo. */
  timeRange: TimeRange;
  notificationCount: number;
  /** Từ khoá ở ô tìm kiếm trên header. */
  globalSearch: string;
}

const initialState: UiState = {
  isSidebarCollapsed: false,
  timeRange: TIME_RANGE.Today,
  notificationCount: 0,
  globalSearch: '',
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.isSidebarCollapsed = !state.isSidebarCollapsed;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.isSidebarCollapsed = action.payload;
    },
    setTimeRange: (state, action: PayloadAction<TimeRange>) => {
      state.timeRange = action.payload;
    },
    setNotificationCount: (state, action: PayloadAction<number>) => {
      state.notificationCount = action.payload;
    },
    clearNotifications: (state) => {
      state.notificationCount = 0;
    },
    setGlobalSearch: (state, action: PayloadAction<string>) => {
      state.globalSearch = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarCollapsed,
  setTimeRange,
  setNotificationCount,
  clearNotifications,
  setGlobalSearch,
} = uiSlice.actions;

export default uiSlice.reducer;