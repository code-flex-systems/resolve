import { formatLabel } from './claimUtils';

/**
 * Format a coverage type for display.
 * Uses formatLabel for consistent Title Case formatting.
 */
export function formatCoverageType(coverageType: string | null | undefined): string {
	if (!coverageType) return 'Unknown';
	return formatLabel(coverageType);
}
