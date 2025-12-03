/**
 * Shared utility functions for claim-related data and components
 */

/**
 * Generic utility to format snake_case or lowercase strings to Title Case.
 * Examples:
 *   - "uninsured_motorist" -> "Uninsured Motorist"
 *   - "uninsured motorist" -> "Uninsured Motorist"
 *   - "AUTO" -> "Auto"
 */
export function formatLabel(value: string | null | undefined): string {
	if (!value) return 'N/A';

	// First replace underscores with spaces, then split on spaces
	return value
		.toLowerCase()
		.replace(/_/g, ' ')
		.split(' ')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

/**
 * Format line of business to display-friendly text
 */
export function formatLineOfBusiness(lob: string | null): string {
	return formatLabel(lob);
}

/**
 * Format liability coverage type to display-friendly text
 */
export function formatLiabilityCoverageType(coverageType: string | null): string {
	return formatLabel(coverageType);
}

/**
 * Format loss type to display-friendly text
 */
export function formatLossType(lossType: string | null): string {
	return formatLabel(lossType);
}

/**
 * Format coverage type to display-friendly text
 */
export function formatCoverageType(coverageType: string | null): string {
	return formatLabel(coverageType);
}
