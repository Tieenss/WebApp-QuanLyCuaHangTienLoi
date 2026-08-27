import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from './index';

/**
 * Hook đã gắn type cho store. Luôn dùng 2 hook này thay cho
 * `useDispatch` / `useSelector` gốc để không phải khai báo generic
 * ở từng component.
 */
export const useAppDispatch = (): AppDispatch => useDispatch<AppDispatch>();

export const useAppSelector = useSelector.withTypes<RootState>();