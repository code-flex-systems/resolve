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

/**
 * Format claim status from recovery_status and substatus into a single display string.
 * Returns combined text like "In Progress - Negotiation" or "Recovered".
 *
 * @param recoveryStatus - The recovery_status field from claim table
 * @param substatus - The substatus field from claim table
 * @returns Formatted status string
 */
export function formatClaimStatus(
	recoveryStatus: string | null | undefined,
	substatus: string | null | undefined
): string {
	if (!recoveryStatus) return 'Unknown';

	const formattedRecoveryStatus = formatLabel(recoveryStatus);

	// For closed statuses, don't show substatus (it's redundant)
	if (recoveryStatus === 'recovered' || recoveryStatus === 'closed_no_recovery') {
		return formattedRecoveryStatus;
	}

	// If substatus exists and is meaningful, show combined format
	if (substatus) {
		const formattedSubstatus = formatLabel(substatus);
		return `${formattedRecoveryStatus} - ${formattedSubstatus}`;
	}

	return formattedRecoveryStatus;
}
