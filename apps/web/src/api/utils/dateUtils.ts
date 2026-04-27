import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

/** Format a date as YYYY-MM-DD string for database storage, avoiding timezone conversion */
export function formatDateForDB(date: string | Date): string {
	return dayjs.utc(date).format('YYYY-MM-DD');
}
