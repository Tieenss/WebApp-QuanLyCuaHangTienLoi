import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { TimeRange } from '../../types/dashboardTypes';

interface DashboardState {
    timeRange: TimeRange;
    selectedBranchId: string;
    selectedBranchName: string;
    isSidebarCollapsed: boolean;
    notificationCount: number;
}

const initialState: DashboardState = {
    timeRange: 'today',
    selectedBranchId: 'CK-0101',
    selectedBranchName: 'Circle K - Chi Nhánh 0101 (Quận 1, TP.HCM)',
    isSidebarCollapsed: false,
    notificationCount: 4,
};

export const dashboardSlice = createSlice({
    name: 'dashboard',
    initialState,
    reducers: {
        setTimeRange: (state, action: PayloadAction<TimeRange>) => {
            state.timeRange = action.payload;
        },
        setSelectedBranch: (state, action: PayloadAction<{ id: string; name: string }>) => {
            state.selectedBranchId = action.payload.id;
            state.selectedBranchName = action.payload.name;
        },
        toggleSidebar: (state) => {
            state.isSidebarCollapsed = !state.isSidebarCollapsed;
        },
        setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
            state.isSidebarCollapsed = action.payload;
        },
        clearNotifications: (state) => {
            state.notificationCount = 0;
        },
    },
});

export const {
    setTimeRange,
    setSelectedBranch,
    toggleSidebar,
    setSidebarCollapsed,
    clearNotifications,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
