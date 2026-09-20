import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AttendanceRecord, AttendanceStatus, ShiftCode } from '@/types';
import { chamCongApi, type ChamCongDTO } from '@/api/chamCong';
import { today } from '@/utils/dateUtils';
import dayjs from 'dayjs';

export interface AttendanceState {
  records: AttendanceRecord[];
  loading: boolean;
  error: string | null;
}

const initialState: AttendanceState = {
  records: [],
  loading: false,
  error: null,
};

/**
 * Map 1 bản ghi từ backend (ChamCongDTO) sang shape frontend (AttendanceRecord).
 *
 * Lưu ý mapping tên trường backend ↔ frontend:
 * - `idNhanVien` → `employeeId`, `tenNhanVien` → `employeeName`
 * - `caLamViec` → `shift`, `workDate` giữ nguyên
 * - `breakHours` → `breakDuration`
 * - `tongGioLam` → `actualHours` & `workedHours` (cùng giá trị)
 * - `daThanhToan` → `isPaid`, `ghiChu` → `note`
 * - `diTrePhut` (chỉ có ở backend) chưa hiện trên type cũ — bỏ qua.
 */
const mapDtoToRecord = (dto: ChamCongDTO): AttendanceRecord => ({
  id: dto.id,
  employeeId: dto.idNhanVien,
  employeeName: dto.tenNhanVien ?? '',
  employeeCode: dto.maNhanVien ?? '',
  branchId: dto.idChiNhanh ?? '',
  workDate: dto.workDate,
  shift: dto.caLamViec as ShiftCode,
  checkInAt: dto.checkInAt ?? null,
  checkOutAt: dto.checkOutAt ?? null,
  clockInAt: dto.clockInAt ?? null,
  clockOutAt: dto.clockOutAt ?? null,
  breakDuration: dto.breakHours ?? 0,
  actualHours: dto.tongGioLam ?? 0,
  workedHours: dto.tongGioLam ?? 0,
  overtimeHours: dto.overtimeHours ?? 0,
  isPaid: dto.daThanhToan ?? false,
  status: (dto.trangThai ?? 'PRESENT') as AttendanceStatus,
  note: dto.ghiChu ?? '',
});

/**
 * Tải toàn bộ chấm công từ backend.
 */
export const fetchAttendance = createAsyncThunk(
  'attendance/fetchAll',
  async ({ from, to }: { from?: string; to?: string } = {}) => {
  const list = await chamCongApi.getByDateRange(
    from ?? dayjs().subtract(29, 'day').format('YYYY-MM-DD'),
    to ?? dayjs().format('YYYY-MM-DD'),
  );
  return list.map((d) => mapDtoToRecord(d));
},
);

/**
 * Sinh lịch ca cho nhân viên từ hôm nay đến N ngày tới (dựa trên ca mặc định).
 * Dùng endpoint chuyên dụng để backend tự xác định ca mặc định và giới hạn
 * người thường chỉ được sinh lịch của chính mình.
 */
export const scheduleAttendance = createAsyncThunk(
  'attendance/schedule',
  async (
    { idNhanVien, days = 7 }: { idNhanVien: string; days?: number },
    { rejectWithValue },
  ) => {
    try {
      const from = dayjs().format('YYYY-MM-DD');
      const to = dayjs().add(Math.max(0, days - 1), 'day').format('YYYY-MM-DD');
      const created = await chamCongApi.scheduleRange(idNhanVien, from, to);

      return created;
    } catch (e: any) {
      return rejectWithValue(e?.message || 'Lỗi sinh lịch ca');
    }
  },
);

/**
 * Check-in: gọi API endpoint chuyên dụng `/{id}/clock-in`.
 */
export const clockInApi = createAsyncThunk(
  'attendance/clockIn',
  async (id: string, { rejectWithValue }) => {
    try {
      return await chamCongApi.clockIn(id);
    } catch (e: any) {
      return rejectWithValue(e?.message || 'Lỗi check-in');
    }
  },
);

/**
 * Check-out: gọi API endpoint chuyên dụng `/{id}/clock-out`.
 */
export const clockOutApi = createAsyncThunk(
  'attendance/clockOut',
  async (id: string, { rejectWithValue }) => {
    try {
      return await chamCongApi.clockOut(id);
    } catch (e: any) {
      return rejectWithValue(e?.message || 'Lỗi check-out');
    }
  },
);

interface ClockInPayload {
  id: string;
  actorId: string;
}

interface ClockOutPayload {
  id: string;
  actorId: string;
}

export const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    /**
     * Local-only fallback: nếu API thất bại vẫn cho user chấm công local.
     * KHÔNG ghi đè `checkInAt`/`checkOutAt` — đó là planned time, không phải
     * thời điểm chấm thực tế.
     */
    clockIn(state, action: PayloadAction<ClockInPayload>) {
      const { id } = action.payload;
      const record = state.records.find((r) => r.id === id);
      if (!record) return;
      if (record.workDate !== today()) return;
      if (record.clockInAt !== null) return;

      const now = dayjs().toISOString();
      record.clockInAt = now;
    },

    clockOut(state, action: PayloadAction<ClockOutPayload>) {
      const { id } = action.payload;
      const record = state.records.find((r) => r.id === id);
      if (!record) return;
      if (record.workDate !== today()) return;
      if (record.clockInAt === null) return;
      if (record.clockOutAt !== null) return;

      const now = dayjs().toISOString();
      record.clockOutAt = now;

      const clockIn = dayjs(record.clockInAt);
      const clockOut = dayjs(now);
      const diff = clockOut.diff(clockIn, 'hour', true);
      const tongGio = Math.max(0, diff - record.breakDuration);
      record.actualHours = Number(tongGio.toFixed(2));
      record.workedHours = Number(tongGio.toFixed(2));
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAttendance.fulfilled, (state, action) => {
        state.loading = false;
        state.records = action.payload;
      })
      .addCase(fetchAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Lỗi tải chấm công';
      })
      .addCase(scheduleAttendance.fulfilled, (state, action) => {
        // Gộp các record mới vào danh sách (thay thế nếu trùng id).
        const incoming = action.payload.map((d) => mapDtoToRecord(d));
        for (const rec of incoming) {
          const idx = state.records.findIndex((r) => r.id === rec.id);
          if (idx !== -1) {
            state.records[idx] = { ...state.records[idx], ...rec };
          } else {
            state.records.push(rec);
          }
        }
      })
      .addCase(clockInApi.fulfilled, (state, action) => {
        const dto = action.payload;
        const idx = state.records.findIndex((r) => r.id === dto.id);
        if (idx !== -1) {
          state.records[idx].clockInAt = dto.clockInAt ?? null;
          if (dto.trangThai) state.records[idx].status = dto.trangThai as AttendanceStatus;
        }
      })
      .addCase(clockOutApi.fulfilled, (state, action) => {
        const dto = action.payload;
        const idx = state.records.findIndex((r) => r.id === dto.id);
        if (idx !== -1) {
          state.records[idx].clockOutAt = dto.clockOutAt ?? null;
          state.records[idx].actualHours = dto.tongGioLam ?? state.records[idx].actualHours;
          state.records[idx].workedHours = dto.tongGioLam ?? state.records[idx].workedHours;
        }
      });
  },
});

export const { clockIn, clockOut } = attendanceSlice.actions;

export default attendanceSlice.reducer;
