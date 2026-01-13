import config, { getFiscalYearStart } from '@/config/config';
import { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import { InstanceListItem, TreeNode } from '@/types/types';
import dayjs from 'dayjs';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

// public methods

/**
 * Format a phone number for display.
 * Returns formatted number like "(212) 555-1234" or the original string if parsing fails.
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
	if (!phone) return '';
	const parsed = parsePhoneNumberFromString(phone, 'US');
	return parsed?.formatNational() ?? phone;
}

export function capitalize(word: string) {
	return `${word[0].toUpperCase()}${word.slice(1)}`;
}

export function getInitials(name: string | null | undefined) {
	if (!name) return '';
	const parts = name.split(' ');
	return `${parts[0][0]}${parts[1][0]}`;
}

export function getCurrentFiscalQuarter() {
	const fiscalYearStart = getFiscalYearStart();
	const q1End = fiscalYearStart.add(3, 'months');
	const q2End = fiscalYearStart.add(6, 'months');
	const q3End = fiscalYearStart.add(9, 'months');
	const today = dayjs();
	if (today.isBefore(q1End)) return 1;
	if (today.isBefore(q2End)) return 2;
	if (today.isBefore(q3End)) return 3;
	return 4;
}

export function getCurrentFiscalQuarterStart() {
	const currentQ = getCurrentFiscalQuarter();
	const qEnd = getFiscalYearStart().add(currentQ * 3, 'months');
	return qEnd.subtract(3, 'months');
}

export function getDaysToEndOfFiscalQuarter() {
	const currentQ = getCurrentFiscalQuarter();
	const qEnd = getFiscalYearStart().add(currentQ * 3, 'months');
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
	return dayjs(date).format('MMM D');
}

export function formatMDY(date?: string) {
	if (!date) return '';
	return dayjs(date).format('MMMM D, YYYY');
}

export function formatDateForSentence(date: string) {
	return date === 'Today' ? 'today' : `on ${date}`;
}

export function formatMDYAbv(date?: string) {
	if (!date) return '';
	return dayjs(date).format('MM/DD/YY');
}

export function formatUser<T extends GetUserOutput | undefined>(user: T, me?: string) {
	if (!user) return '';
	return user.email === me ? 'You' : `${user.first} ${user.last}`;
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

/**
 * Build a map of instance -> all instances it can call via answers.
 * This is used for cycle detection in the answer call graph.
 *
 * @param tree - The full tree of page instances
 * @returns Map of instanceId -> Set of instanceIds it can call
 */
export function buildAnswerCallGraph(tree: TreeNode[]): Map<number, Set<number>> {
	// Note: This function builds a placeholder. The actual call graph
	// needs to be populated with real answer data from the backend.
	// This structure is here to show the intended data flow.
	const graph = new Map<number, Set<number>>();

	const initGraph = (nodes: TreeNode[]) => {
		for (const node of nodes) {
			if (!graph.has(node.instanceId)) {
				graph.set(node.instanceId, new Set());
			}
			if (node.children) {
				initGraph(node.children);
			}
		}
	};
	initGraph(tree);

	return graph;
}

/**
 * Check if selecting targetInstanceId as a "calls page" would create a cycle.
 * A cycle exists if there's already a path from targetInstanceId back to currentInstanceId
 * through the answer call graph.
 *
 * @param currentInstanceId - The instance we're currently on (where the answer exists)
 * @param targetInstanceId - The instance we want to call (potential cycle risk)
 * @param answerCallGraph - Map of instance -> Set of instances it calls via answers
 * @returns true if selecting this would create a cycle, false if safe
 */
export function wouldCreateCycle(
	currentInstanceId: number,
	targetInstanceId: number,
	answerCallGraph: Map<number, Set<number>>
): boolean {
	// If target doesn't call anything, no cycle possible
	const targetCalls = answerCallGraph.get(targetInstanceId);
	if (!targetCalls || targetCalls.size === 0) {
		return false;
	}

	// Use DFS to check if there's a path from target back to current
	const visited = new Set<number>();

	const hasPathTo = (from: number, to: number): boolean => {
		if (from === to) return true;
		if (visited.has(from)) return false; // Already checked this node

		visited.add(from);
		const callees = answerCallGraph.get(from);
		if (!callees) return false;

		for (const callee of callees) {
			if (hasPathTo(callee, to)) {
				return true;
			}
		}

		return false;
	};

	return hasPathTo(targetInstanceId, currentInstanceId);
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

/**
 * DataGrid sort comparators for consistent sorting across the application.
 * Use these with the `sortComparator` prop on DataGrid columns.
 */

/**
 * Sort comparator for string values. Case-insensitive, nulls sort to end.
 */
export const stringSortComparator = (v1: unknown, v2: unknown): number => {
	const a = (v1 || '').toString().toLowerCase();
	const b = (v2 || '').toString().toLowerCase();
	if (!v1 && !v2) return 0;
	if (!v1) return 1;
	if (!v2) return -1;
	return a.localeCompare(b);
};

/**
 * Sort comparator for numeric values. Parses strings to numbers, defaults to 0.
 */
export const numericSortComparator = (v1: unknown, v2: unknown): number => {
	const a = parseFloat(v1?.toString() || '0');
	const b = parseFloat(v2?.toString() || '0');
	return a - b;
};

/**
 * Sort comparator for date values. Nulls sort to end.
 */
export const dateSortComparator = (v1: unknown, v2: unknown): number => {
	if (!v1 && !v2) return 0;
	if (!v1) return 1;
	if (!v2) return -1;
	return new Date(v1 as string | Date).getTime() - new Date(v2 as string | Date).getTime();
};

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
