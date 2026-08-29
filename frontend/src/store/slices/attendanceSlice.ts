import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AttendanceRecord } from '@/types';
import { seedAttendance } from '@/mockData/employees';
import { today } from '@/utils/dateUtils';
import dayjs from 'dayjs';

export interface AttendanceState {
  records: AttendanceRecord[];
}

const initialState: AttendanceState = {
  records: seedAttendance,
};

interface ClockInPayload {
    id: string;
}

interface ClockOutPayload {
    id: string;
}

export const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    clockIn(state, action: PayloadAction<ClockInPayload>) {
      const { id } = action.payload;
      const record = state.records.find(
        (r) => r.id === id,
      );
      if (!record) return;
      if (record.workDate !== today()) return;
      if (record.clockInAt !== null) return;

      const now = dayjs().toISOString();
      record.clockInAt = now;
      record.checkInAt = now;
    },

    clockOut(state, action: PayloadAction<ClockOutPayload>) {
      const { id } = action.payload;
      const record = state.records.find(
        (r) => r.id === id,
      );
      if (!record) return;
      if (record.workDate !== today()) return;
      if (record.clockInAt === null) return;
      if (record.clockOutAt !== null) return;

      const now = dayjs().toISOString();
      record.clockOutAt = now;
      record.checkOutAt = now;

      const clockIn = dayjs(record.clockInAt);
      const clockOut = dayjs(now);
      const diff = clockOut.diff(clockIn, 'hour', true);
      const tongGio = diff - record.breakDuration;
      record.actualHours = Number(tongGio.toFixed(2));
      record.workedHours = Number(tongGio.toFixed(2));
    },
  },
});

export const { clockIn, clockOut } = attendanceSlice.actions;

export default attendanceSlice.reducer;