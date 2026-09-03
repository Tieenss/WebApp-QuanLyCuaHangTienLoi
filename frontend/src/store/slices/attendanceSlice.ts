import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AttendanceRecord, AttendanceStatus, ShiftCode } from '@/types';
import { chamCongApi, type ChamCongDTO } from '@/api/chamCong';
import { today } from '@/utils/dateUtils';
import dayjs from 'dayjs';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

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
const mapDtoToRecord = (dto: ChamCongDTO, fallback: { employeeCode?: string; branchId?: string } = {}): AttendanceRecord => ({
  id: dto.id,
  employeeId: dto.idNhanVien,
  employeeName: dto.tenNhanVien ?? '',
  employeeCode: fallback.employeeCode ?? '',
  branchId: fallback.branchId ?? '',
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
export const fetchAttendance = createAsyncThunk('attendance/fetchAll', async () => {
  const list = await chamCongApi.getAll();
  return list.map((d) => mapDtoToRecord(d));
});

/**
 * Sinh lịch ca cho nhân viên từ hôm nay đến N ngày tới (dựa trên ca mặc định).
 * Dùng POST /api/cham-cong (create) để tạo từng ca.
 * Sau khi xong sẽ reload lại danh sách để cập nhật UI.
 */
export const scheduleAttendance = createAsyncThunk(
  'attendance/schedule',
  async (
    { idNhanVien, days = 7 }: { idNhanVien: string; days?: number },
    { rejectWithValue, dispatch },
  ) => {
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const to = dayjs().add(days, 'day').format('YYYY-MM-DD');

      // Lấy ca mặc định của nhân viên từ API
      const nvList = await fetch(`${API_BASE_URL}/api/nhan-vien/${idNhanVien}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      }).then((r) => r.json());
      const ca = nvList.caMacDinh || 'MORNING';

      // Định nghĩa giờ cho từng ca
      const SHIFT_HOURS: Record<string, [number, number]> = {
        MORNING: [6, 14],
        AFTERNOON: [14, 22],
        NIGHT: [22, 30],
      };
      const [startH, endH] = SHIFT_HOURS[ca] || [6, 14];

      const created: ChamCongDTO[] = [];
      let cur = dayjs(today);
      const end = dayjs(to);

      while (cur.isBefore(end) || cur.isSame(end, 'day')) {
        const dateStr = cur.format('YYYY-MM-DD');
        const checkIn = cur.hour(startH % 24).minute(0).second(0);
        const checkOut = endH >= 24
          ? cur.add(1, 'day').hour(endH % 24).minute(0).second(0)
          : cur.hour(endH).minute(0).second(0);

        try {
          const dto = await chamCongApi.create({
            id: '',
            idNhanVien,
            workDate: dateStr,
            caLamViec: ca,
            checkInAt: checkIn.toISOString(),
            checkOutAt: checkOut.toISOString(),
            overtimeHours: 0,
            breakHours: 0,
            trangThai: 'PRESENT',
            daThanhToan: false,
          });
          created.push(dto);
        } catch {
          // Bỏ qua nếu đã tồn tại (UNIQUE constraint)
        }
        cur = cur.add(1, 'day');
      }

      void dispatch(fetchAttendance());
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