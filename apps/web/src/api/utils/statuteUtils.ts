import type { Claim } from '@/api/database/types';

/**
 * Calculates the statute of limitations date for a coverage.
 *
 * PLACEHOLDER: Currently adds 4 years to date_of_loss.
 * Future implementation will use:
 * - claim.loss_state (for state-specific statutes)
 * - coverage.loss_type (for loss type specific rules)
 * - cause_of_action (when field added)
 * - statute_rules lookup table
 *
 * @param claim - The claim record with date_of_loss and loss_state
 * @returns Date object representing statute deadline, or null if cannot calculate
 */
export function calculateStatuteDate(claim: Claim): Date | null {
	if (!claim.date_of_loss) {
		return null; // Cannot calculate without date of loss
	}

	// TODO: Look up statute period based on state/loss_type/cause_of_action
	const DEFAULT_STATUTE_YEARS = 4;

	const statuteDate = new Date(claim.date_of_loss as unknown as Date | string);
	statuteDate.setFullYear(statuteDate.getFullYear() + DEFAULT_STATUTE_YEARS);

	return statuteDate;
}
