import type { Dayjs } from 'dayjs';

/** Date range tuple — replaces MUI's DateRange type */
export type DateRange<T = Dayjs> = [T | null, T | null];
