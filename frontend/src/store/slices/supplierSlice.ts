import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Supplier, SupplierFormValues } from '../../types/supplierTypes';
import { initialSuppliers } from '../../features/suppliers/mockSuppliers';

interface SupplierState {
    suppliers: Supplier[];
    selectedSupplier: Supplier | null;
    isModalOpen: boolean;
    searchQuery: string;
    categoryFilter: string | null;
}

const initialState: SupplierState = {
    suppliers: initialSuppliers,
    selectedSupplier: null,
    isModalOpen: false,
    searchQuery: '',
    categoryFilter: null,
};

export const supplierSlice = createSlice({
    name: 'supplier',
    initialState,
    reducers: {
        addSupplier: (state, action: PayloadAction<SupplierFormValues>) => {
            const nextIdNumber = state.suppliers.length + 1;
            const code = `NCC-${String(nextIdNumber).padStart(3, '0')}`;
            const newSupplier: Supplier = {
                ...action.payload,
                id: `sup-${Date.now()}`,
                code,
                totalDebt: 0,
                totalOrders: 0,
                createdAt: new Date().toISOString().split('T')[0],
            };
            state.suppliers.unshift(newSupplier);
        },
        updateSupplier: (state, action: PayloadAction<{ id: string; values: SupplierFormValues }>) => {
            const index = state.suppliers.findIndex((s) => s.id === action.payload.id);
            if (index !== -1) {
                state.suppliers[index] = {
                    ...state.suppliers[index],
                    ...action.payload.values,
                };
            }
        },
        deleteSupplier: (state, action: PayloadAction<string>) => {
            state.suppliers = state.suppliers.filter((s) => s.id !== action.payload);
        },
        setSelectedSupplier: (state, action: PayloadAction<Supplier | null>) => {
            state.selectedSupplier = action.payload;
        },
        setModalOpen: (state, action: PayloadAction<boolean>) => {
            state.isModalOpen = action.payload;
            if (!action.payload) {
                state.selectedSupplier = null;
            }
        },
        setSearchQuery: (state, action: PayloadAction<string>) => {
            state.searchQuery = action.payload;
        },
        setCategoryFilter: (state, action: PayloadAction<string | null>) => {
            state.categoryFilter = action.payload;
        },
    },
});

export const {
    addSupplier,
    updateSupplier,
    deleteSupplier,
    setSelectedSupplier,
    setModalOpen,
    setSearchQuery,
    setCategoryFilter,
} = supplierSlice.actions;

export default supplierSlice.reducer;
