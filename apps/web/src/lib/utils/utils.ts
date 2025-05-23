import { PageInstanceStatus } from '@/config/enums';
import { InstanceListItem, TreeNode } from '@/types/types';
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

export function getExtension(filename: string) {
	let parts = filename.split('.');
	return `.${parts[parts.length - 1]}`;
}

export function getPageInstancesFromTree(tree: TreeNode[], currentInstanceId: number) {
	let instances: InstanceListItem[] = [];
	getInstances(tree, currentInstanceId, instances);
	return instances;
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
