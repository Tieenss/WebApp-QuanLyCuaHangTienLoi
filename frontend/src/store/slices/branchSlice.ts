import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Branch, BranchFormValues } from '../../types/branchTypes';
import { initialBranches } from '../../features/branches/mockBranches';

interface BranchState {
    branches: Branch[];
    selectedBranch: Branch | null;
    isModalOpen: boolean;
    searchQuery: string;
}

const initialState: BranchState = {
    branches: initialBranches,
    selectedBranch: null,
    isModalOpen: false,
    searchQuery: '',
};

export const branchSlice = createSlice({
    name: 'branch',
    initialState,
    reducers: {
        addBranch: (state, action: PayloadAction<BranchFormValues>) => {
            const nextIdNumber = state.branches.length + 101;
            const newBranch: Branch = {
                ...action.payload,
                id: `CK-0${String(nextIdNumber).padStart(3, '0')}`,
            };
            state.branches.unshift(newBranch);
        },
        updateBranch: (
            state,
            action: PayloadAction<{ id: string; values: BranchFormValues }>
        ) => {
            const index = state.branches.findIndex((b) => b.id === action.payload.id);
            if (index !== -1) {
                state.branches[index] = { ...state.branches[index], ...action.payload.values };
            }
        },
        deleteBranch: (state, action: PayloadAction<string>) => {
            state.branches = state.branches.filter((b) => b.id !== action.payload);
        },
        setSelectedBranch: (state, action: PayloadAction<Branch | null>) => {
            state.selectedBranch = action.payload;
        },
        setModalOpen: (state, action: PayloadAction<boolean>) => {
            state.isModalOpen = action.payload;
            if (!action.payload) {
                state.selectedBranch = null;
            }
        },
        setSearchQuery: (state, action: PayloadAction<string>) => {
            state.searchQuery = action.payload;
        },
    },
});

export const {
    addBranch,
    updateBranch,
    deleteBranch,
    setSelectedBranch,
    setModalOpen,
    setSearchQuery,
} = branchSlice.actions;

export default branchSlice.reducer;
