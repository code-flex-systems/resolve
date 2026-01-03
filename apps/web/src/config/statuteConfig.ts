/**
 * Hardcoded configuration for the Statute of Limitations feature.
 *
 * These are system-level values used across all clients for statute rules.
 * Unlike reference data which is client-scoped, statute rules are global
 * and need consistent tort types and LOB values.
 */

export interface StatuteTortType {
	value: string;
	label: string;
}

export interface StatuteLOB {
	value: string;
	label: string;
}

/**
 * Tort types for statute of limitations rules.
 * These correspond to the categories of legal claims.
 */
export const STATUTE_TORT_TYPES: StatuteTortType[] = [
	{ value: 'injury', label: 'Injury' },
	{ value: 'personal_property', label: 'Personal Property' },
	{ value: 'real_property', label: 'Real Property' },
];

/**
 * Lines of Business for statute conditional rules.
 * Some states have different statute limits based on LOB (e.g., Auto vs Non-Auto).
 */
export const STATUTE_LOB_TYPES: StatuteLOB[] = [
	{ value: 'auto', label: 'Auto' },
	{ value: 'homeowners', label: 'Homeowners' },
	{ value: 'commercial', label: 'Commercial' },
	{ value: 'umbrella', label: 'Umbrella' },
	{ value: 'other', label: 'Other' },
];

/**
 * Get tort type label by value.
 */
export function getTortTypeLabel(value: string): string {
	return STATUTE_TORT_TYPES.find((t) => t.value === value)?.label ?? value;
}

/**
 * Get LOB label by value.
 */
export function getLOBLabel(value: string): string {
	return STATUTE_LOB_TYPES.find((l) => l.value === value)?.label ?? value;
}
