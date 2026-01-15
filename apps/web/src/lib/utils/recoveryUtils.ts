/**
 * Shared utility functions for recovery metrics and components
 */

import dayjs from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import utc from 'dayjs/plugin/utc';
import { RecoveryStatus } from '@/config/enums';

dayjs.extend(quarterOfYear);
dayjs.extend(utc);

/**
 * Format large numbers with friendly abbreviations (K, M)
 * Handles negative values correctly by using absolute value for comparison
 * Use this for high-level metrics and summaries.
 */
export function formatCurrency(value: number): string {
	const absValue = Math.abs(value);
	const sign = value < 0 ? '-' : '';

	if (absValue >= 1000000) {
		return `${sign}$${(absValue / 1000000).toFixed(1)}M`;
	} else if (absValue >= 1000) {
		return `${sign}$${(absValue / 1000).toFixed(0)}K`;
	}
	return `${sign}$${absValue.toFixed(0)}`;
}

/**
 * Format currency with exact precision (two decimal places, thousands separators)
 * Use this for detailed views where exact amounts are important.
 * Examples:
 *   - 1234.56 -> "$1,234.56"
 *   - 1000000 -> "$1,000,000.00"
 *   - -500.5 -> "-$500.50"
 */
export function formatCurrencyExact(value: number): string {
	const sign = value < 0 ? '-' : '';
	const absValue = Math.abs(value);

	return `${sign}$${absValue.toLocaleString('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

/**
 * Format recovery status enum to display-friendly text
 */
export function formatRecoveryStatus(status: string | null): string {
	if (!status) return 'N/A';
	// Convert snake_case to Title Case
	return status
		.split('_')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

// Icon mappings for recovery status
export const RECOVERY_STATUS_ICONS: Record<RecoveryStatus, string> = {
	[RecoveryStatus.PENDING]: '⏳',
	[RecoveryStatus.IN_PROGRESS]: '🔄',
	[RecoveryStatus.RECOVERED]: '✅',
	[RecoveryStatus.CLOSED_NO_RECOVERY]: '❌',
};

/**
 * Calculate the start and end dates for a quarter as ISO strings.
 * Uses UTC mode to avoid timezone issues where local endOf('month') could
 * shift to the next month when converted to UTC.
 */
export function getQuarterDates(quarter: number, year: number): [string, string] {
	const startMonth = (quarter - 1) * 3;
	const start = dayjs.utc().year(year).month(startMonth).startOf('month').toISOString();
	const end = dayjs
		.utc()
		.year(year)
		.month(startMonth + 2)
		.endOf('month')
		.toISOString();
	return [start, end];
}

/**
 * Get current quarter and last quarter date ranges
 */
export function getQuarterRanges() {
	const now = dayjs();
	const currentQuarter = now.quarter();
	const currentYear = now.year();

	// Current quarter
	const currentRange = getQuarterDates(currentQuarter, currentYear);

	// Last quarter
	let lastQuarter = currentQuarter - 1;
	let lastYear = currentYear;
	if (lastQuarter === 0) {
		lastQuarter = 4;
		lastYear = currentYear - 1;
	}
	const lastRange = getQuarterDates(lastQuarter, lastYear);

	return {
		current: currentRange,
		last: lastRange,
		currentQuarter,
		lastQuarter,
		currentYear,
		lastYear,
	};
}
