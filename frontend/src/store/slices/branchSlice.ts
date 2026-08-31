import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Branch, BranchFormValues } from '@/types';
import { today } from '@/utils/dateUtils';

export interface BranchState {
  branches: Branch[];
  selectedBranch: Branch | null;
  isModalOpen: boolean;
}

const initialState: BranchState = {
  branches: [],
  selectedBranch: null,
  isModalOpen: false,
};

const nextBranchCode = (branches: readonly Branch[]): string => {
  const maxNumber = branches.reduce((max, branch) => {
    const parsed = Number.parseInt(branch.code.replace('CK-', ''), 10);
    return Number.isNaN(parsed) ? max : Math.max(max, parsed);
  }, 0);
  return `CK-${String(maxNumber + 1).padStart(4, '0')}`;
};

export const branchSlice = createSlice({
  name: 'branch',
  initialState,
  reducers: {
    addBranch: (state, action: PayloadAction<BranchFormValues>) => {
      state.branches.unshift({
        ...action.payload,
        id: `br-${Date.now()}`,
        code: nextBranchCode(state.branches),
        employeeCount: 0,
        monthlyRevenue: 0,
        openedAt: today(),
      });
    },
    updateBranch: (
      state,
      action: PayloadAction<{ id: string; values: BranchFormValues }>,
    ) => {
      const index = state.branches.findIndex(
        (branch) => branch.id === action.payload.id,
      );
      if (index === -1) return;
      state.branches[index] = { ...state.branches[index], ...action.payload.values };
    },
    deleteBranch: (state, action: PayloadAction<string>) => {
      state.branches = state.branches.filter(
        (branch) => branch.id !== action.payload,
      );
    },
    setSelectedBranch: (state, action: PayloadAction<Branch | null>) => {
      state.selectedBranch = action.payload;
    },
    setBranchModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isModalOpen = action.payload;
      if (!action.payload) {
        state.selectedBranch = null;
      }
    },
  },
});

export const {
  addBranch,
  updateBranch,
  deleteBranch,
  setSelectedBranch,
  setBranchModalOpen,
} = branchSlice.actions;

export default branchSlice.reducer;
