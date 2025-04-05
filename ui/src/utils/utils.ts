import dayjs from 'dayjs';

export function formatMDY(date?: string) {
	if (!date) return '';
	return dayjs(date).format('MMMM D, YYYY');
}

export function getExtension(filename: string) {
	let parts = filename.split('.');
	return `.${parts[parts.length - 1]}`;
}

export function isBetweenDates(fromDate: string, toDate: string) {
	let today = dayjs();
	let from = dayjs(fromDate);
	let to = dayjs(toDate);
	return (
		(today.isSame(from, 'date') || today.isAfter(from, 'date')) &&
		(today.isSame(to, 'date') || today.isBefore(to, 'date'))
	);
}
