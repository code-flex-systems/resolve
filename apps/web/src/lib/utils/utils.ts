import config from '@/config/config';
import { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import { InstanceListItem, TreeNode } from '@/types/types';
import dayjs from 'dayjs';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

// public methods

export function capitalize(word: string) {
	return `${word[0].toUpperCase()}${word.slice(1)}`;
}

export function getInitials(name: string | null | undefined) {
	if (!name) return '';
	const parts = name.split(' ');
	return `${parts[0][0]}${parts[1][0]}`;
}

export function getCurrentFiscalQuarter() {
	const q1End = config.FISCAL_YEAR_START_DATE.add(3, 'months');
	const q2End = config.FISCAL_YEAR_START_DATE.add(6, 'months');
	const q3End = config.FISCAL_YEAR_START_DATE.add(9, 'months');
	const today = dayjs();
	if (today.isBefore(q1End)) return 1;
	if (today.isBefore(q2End)) return 2;
	if (today.isBefore(q3End)) return 3;
	return 4;
}

export function getCurrentFiscalQuarterStart() {
	const currentQ = getCurrentFiscalQuarter();
	const qEnd = config.FISCAL_YEAR_START_DATE.add(currentQ * 3, 'months');
	return qEnd.subtract(3, 'months');
}

export function getDaysToEndOfFiscalQuarter() {
	const currentQ = getCurrentFiscalQuarter();
	const qEnd = config.FISCAL_YEAR_START_DATE.add(currentQ * 3, 'months');
	return qEnd.diff(dayjs(), 'days');
}

export function formatAmount(value?: number | string, currency = false) {
	if (value == null) return '';
	const parsedValue = parseFloat(value.toString());

	// Return 0.00 for invalid inputs instead of NaN
	if (isNaN(parsedValue)) {
		return currency ? '$0.00' : '0.00';
	}

	const roundedValue = Math.round(parsedValue * 100) / 100;
	const formattedValue = roundedValue.toLocaleString('en-US', {
		minimumFractionDigits: 2,
	});
	return currency ? '$' + formattedValue : formattedValue;
}

export function formatHour(hour: number) {
	return dayjs().set('hour', hour).format('h A');
}

export function formatMetric(
	value?: string | number,
	options: { floating?: boolean; cap?: number; showNegative?: boolean } = {}
) {
	const parsedValue =
		!value || (typeof value === 'string' && isNaN(parseFloat(value)))
			? 0
			: options.floating
				? parseFloat(value.toString())
				: parseInt(value.toString());
	const isCapped = options.cap && Math.abs(parsedValue) > options.cap;
	let absValue = isCapped ? options.cap! : Math.abs(parsedValue);

	let abv = '';
	if (absValue > 999999) {
		absValue = absValue / 1000000;
		abv = 'm';
	} else if (absValue > 999) {
		absValue = absValue / 1000;
		abv = 'k';
	}

	const postfix = isCapped ? '+' : '';
	const formattedValue = options.floating
		? formatAmount(absValue)
		: absValue.toLocaleString('en-US', { maximumFractionDigits: 1 });
	const combinedValue = `${formattedValue}${abv}${postfix}`;
	return {
		value: options.showNegative && parsedValue < 0 ? `(${combinedValue})` : combinedValue,
		isNegative: parsedValue < 0,
	};
}

export function formatMD(date?: string) {
	if (!date) return '';
	const parsedDate = dayjs(date);
	if (parsedDate.isSame(new Date(), 'day')) return 'Today';
	return parsedDate.format('MMM D');
}

export function formatMDY(date?: string) {
	if (!date) return '';
	const parsedDate = dayjs(date);
	if (parsedDate.isSame(new Date(), 'day')) return 'Today';
	return parsedDate.format('MMMM D, YYYY');
}

export function formatDateForSentence(date: string) {
	return date === 'Today' ? 'today' : `on ${date}`;
}

export function formatMDYAbv(date?: string) {
	if (!date) return '';
	const parsedDate = dayjs(date);
	if (parsedDate.isSame(new Date(), 'day')) return 'Today';
	return parsedDate.format('MM/DD/YY');
}

export function formatUser<T extends GetUserOutput | undefined>(user: T, me?: string) {
	if (!user) return '';
	return user.email === me ? 'You' : `${user.last}, ${user.first}`;
}

export function formatPhoneNumber(phoneRaw: string) {
	const phone = parsePhoneNumberFromString(phoneRaw, 'US');
	if (!phone || !phone.isValid()) {
		throw new Error('Invalid phone number');
	}
	return phone.number;
}

export function parsePhoneNumber(phoneFormatted: string) {
	return phoneFormatted.slice(2);
}

export function getExtension(filename: string) {
	const parts = filename.split('.');
	return `.${parts[parts.length - 1]}`;
}

export function getPageInstancesFromTree(tree: TreeNode[], currentInstanceId: number) {
	const instances: InstanceListItem[] = [];
	getInstances(tree, currentInstanceId, instances);
	return instances;
}

export function isBetweenDates(fromDate: string, toDate: string) {
	const today = dayjs();
	const from = dayjs(fromDate);
	const to = dayjs(toDate);
	return (
		(today.isSame(from, 'date') || today.isAfter(from, 'date')) &&
		(today.isSame(to, 'date') || today.isBefore(to, 'date'))
	);
}

export function updatePropertyInTree<T extends keyof TreeNode>(
	nodes: TreeNode[],
	instanceId: number,
	key: T,
	value: TreeNode[T]
): TreeNode[] {
	return nodes.map((node) => {
		if (node.instanceId === instanceId) {
			return { ...node, [key]: value };
		}
		if (node.children?.length) {
			return {
				...node,
				children: updatePropertyInTree(node.children, instanceId, key, value),
			};
		}
		return node;
	});
}

export function validatePhoneNumber(phoneRaw: string) {
	const phone = parsePhoneNumberFromString(phoneRaw, 'US');
	return phone && phone.isValid() ? undefined : 'Invalid phone number';
}

// private methods

function getInstances(tree: TreeNode[], currentInstanceId: number, instances: InstanceListItem[]) {
	tree.forEach((node) => {
		if (node.instanceId !== currentInstanceId) {
			instances.push({ title: node.title, instanceId: node.instanceId, pageId: node.pageId });
		}

		if (node.children) {
			getInstances(node.children, currentInstanceId, instances);
		}
	});
}
