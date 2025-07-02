import { InstanceListItem, TreeNode } from '@/types/types';
import dayjs from 'dayjs';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

// public methods

export function getInitials(name: string | null | undefined) {
	if (!name) return '';
	const parts = name.split(' ');
	return `${parts[0][0]}${parts[1][0]}`;
}

export function formatAmount(value?: number | string, currency = false) {
	if (value == null) return '';
	const roundedValue = Math.round(parseFloat(value.toString()) * 100) / 100;
	const formattedValue = roundedValue.toLocaleString('en-US', {
		minimumFractionDigits: 2,
	});
	return currency ? '$' + formattedValue : formattedValue;
}

export function formatHour(hour: number) {
	return dayjs().set('hour', hour).format('h A');
}

export function formatMDY(date?: string) {
	if (!date) return '';
	const parsedDate = dayjs(date);
	if (parsedDate.isSame(new Date(), 'day')) return 'Today';
	return parsedDate.format('MMMM D, YYYY');
}

export function formatMDYAbv(date?: string) {
	if (!date) return '';
	const parsedDate = dayjs(date);
	if (parsedDate.isSame(new Date(), 'day')) return 'Today';
	return parsedDate.format('MM/DD/YY');
}

export function formatPhoneNumber(phoneRaw: string) {
	const phone = parsePhoneNumberFromString(phoneRaw, 'US');
	if (!phone || !phone.isValid()) {
		throw new Error('Invalid phone number');
	}
	return phone.number;
}

export function getExtension(filename: string) {
	const parts = filename.split('.');
	return `.${parts[parts.length - 1]}`;
}

export function getPageInstancesFromTree(tree: TreeNode[], currentInstanceId: number) {
	const instances: InstanceListItem[] = [];
	getInstances(tree, currentInstanceId, instances);
	console.log(tree);
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
			instances.push({ instanceId: node.instanceId, pageId: node.pageId });
		}

		if (node.children) {
			getInstances(node.children, currentInstanceId, instances);
		}
	});
}
