import dayjs from 'dayjs';

export function formatAmount(value?: number | string, currency = false) {
	if (value == null) return '';
	let roundedValue = Math.round(parseFloat(value.toString()) * 100) / 100;
	let formattedValue = roundedValue.toLocaleString('en-US', {
		minimumFractionDigits: 2,
	});
	return currency ? '$' + formattedValue : formattedValue;
}

export function formatMDY(date?: string) {
	if (!date) return '';
	return dayjs(date).format('MMMM D, YYYY');
}

export function formatMDYAbv(date?: string) {
	if (!date) return '';
	return dayjs(date).format('MM/DD/YY');
}

export function generateIntervalKey(id: number, from?: string, to?: string) {
	let key = `${id}`;
	if (from) key += `-${from}`;
	if (to) key += `-${to}`;
	return key;
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
