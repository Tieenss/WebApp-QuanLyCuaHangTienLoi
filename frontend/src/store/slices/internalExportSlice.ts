import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type {
    InternalExport,
    InternalExportFormValues,
} from '../../types/internalExportTypes';
import { initialInternalExports } from '../../features/inventory/mockInternalExports';

interface InternalExportState {
    exports: InternalExport[];
    selectedExport: InternalExport | null;
    isModalOpen: boolean;
    searchQuery: string;
    statusFilter: string | null;
}

const initialState: InternalExportState = {
    exports: initialInternalExports,
    selectedExport: null,
    isModalOpen: false,
    searchQuery: '',
    statusFilter: null,
};

export const internalExportSlice = createSlice({
    name: 'internalExport',
    initialState,
    reducers: {
        addExport: (state, action: PayloadAction<InternalExportFormValues>) => {
            const nextIdNumber = state.exports.length + 1;
            const code = `XK-${String(nextIdNumber).padStart(3, '0')}`;
            const newExport: InternalExport = {
                ...action.payload,
                id: `xk-${Date.now()}`,
                code,
                totalValue: action.payload.items.reduce(
                    (sum, item) => sum + item.quantity * item.unitPrice,
                    0
                ),
                createdBy: 'Trần Văn Anh',
            };
            state.exports.unshift(newExport);
        },
        updateExport: (
            state,
            action: PayloadAction<{ id: string; values: InternalExportFormValues }>
        ) => {
            const index = state.exports.findIndex((e) => e.id === action.payload.id);
            if (index !== -1) {
                state.exports[index] = {
                    ...state.exports[index],
                    ...action.payload.values,
                    totalValue: action.payload.values.items.reduce(
                        (sum, item) => sum + item.quantity * item.unitPrice,
                        0
                    ),
                };
            }
        },
        deleteExport: (state, action: PayloadAction<string>) => {
            state.exports = state.exports.filter((e) => e.id !== action.payload);
        },
        setSelectedExport: (state, action: PayloadAction<InternalExport | null>) => {
            state.selectedExport = action.payload;
        },
        setModalOpen: (state, action: PayloadAction<boolean>) => {
            state.isModalOpen = action.payload;
            if (!action.payload) {
                state.selectedExport = null;
            }
        },
        setSearchQuery: (state, action: PayloadAction<string>) => {
            state.searchQuery = action.payload;
        },
        setStatusFilter: (state, action: PayloadAction<string | null>) => {
            state.statusFilter = action.payload;
        },
    },
});

export const {
    addExport,
    updateExport,
    deleteExport,
    setSelectedExport,
    setModalOpen,
    setSearchQuery,
    setStatusFilter,
} = internalExportSlice.actions;

export default internalExportSlice.reducer;
