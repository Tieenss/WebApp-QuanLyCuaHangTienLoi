import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Employee, EmployeeFormValues } from '@/types';
import { today } from '@/utils/dateUtils';

export interface EmployeeState {
  employees: Employee[];
  selectedEmployee: Employee | null;
  isModalOpen: boolean;
}

const initialState: EmployeeState = {
  employees: [],
  selectedEmployee: null,
  isModalOpen: false,
};

const nextEmployeeCode = (employees: readonly Employee[]): string => {
  const maxNumber = employees.reduce((max, emp) => {
    const parsed = Number.parseInt(emp.code.replace('NV-', ''), 10);
    return Number.isNaN(parsed) ? max : Math.max(max, parsed);
  }, 0);
  return `NV-${String(maxNumber + 1).padStart(4, '0')}`;
};

export const employeeSlice = createSlice({
  name: 'employee',
  initialState,
  reducers: {
    addEmployee: (state, action: PayloadAction<EmployeeFormValues>) => {
      state.employees.unshift({
        ...action.payload,
        id: `emp-${Date.now()}`,
        code: nextEmployeeCode(state.employees),
        branchName: '',
        avatarText: '',
        joinedAt: today(),
      });
    },
    updateEmployee: (
      state,
      action: PayloadAction<{ id: string; values: EmployeeFormValues }>,
    ) => {
      const index = state.employees.findIndex(
        (emp) => emp.id === action.payload.id,
      );
      if (index === -1) return;
      state.employees[index] = { ...state.employees[index], ...action.payload.values };
    },
    deleteEmployee: (state, action: PayloadAction<string>) => {
      state.employees = state.employees.filter(
        (emp) => emp.id !== action.payload,
      );
    },
    setSelectedEmployee: (state, action: PayloadAction<Employee | null>) => {
      state.selectedEmployee = action.payload;
    },
    setEmployeeModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isModalOpen = action.payload;
      if (!action.payload) {
        state.selectedEmployee = null;
      }
    },
  },
});

export const {
  addEmployee,
  updateEmployee,
  deleteEmployee,
  setSelectedEmployee,
  setEmployeeModalOpen,
} = employeeSlice.actions;

export default employeeSlice.reducer;
