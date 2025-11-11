/**
 * Shared utility functions for recovery metrics and components
 */

import dayjs from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';

dayjs.extend(quarterOfYear);

/**
 * Format large numbers with friendly abbreviations (K, M)
 * Handles negative values correctly by using absolute value for comparison
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

/**
 * Calculate the start and end dates for a quarter as ISO strings
 */
export function getQuarterDates(quarter: number, year: number): [string, string] {
	const startMonth = (quarter - 1) * 3;
	const start = dayjs().year(year).month(startMonth).startOf('month').toISOString();
	const end = dayjs()
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
