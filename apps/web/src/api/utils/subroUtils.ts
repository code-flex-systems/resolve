import type { Claim } from '@/api/database/types';

/**
 * Determines whether subrogation is applicable for a coverage.
 *
 * PLACEHOLDER: Currently returns false for all coverages.
 * Future implementation will use:
 * - claim.loss_type (from coverage)
 * - client-specific subro rules
 * - coverage codes from data feeds
 *
 * @param claim - The claim record (passed to indicate future use)
 * @returns true if subro should default to applicable, false otherwise
 */
export function determineSubroApplicable(claim: Claim): boolean {
	// TODO: Implement business rules based on loss_type and client configuration
	return false; // Default to No for now
}
