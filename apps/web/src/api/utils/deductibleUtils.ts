import { DeductibleStatus } from '@/config/enums';

/**
 * Determines whether a deductible should be included in total_incurred
 * based on its status.
 *
 * Note: total_incurred = total reserves + deductible (if applicable).
 * This is different from claim amount, which is total payments made.
 *
 * @param deductibleStatus - The deductible status enum value
 * @returns true if deductible should be added to claim total_incurred, false otherwise
 */
export function shouldIncludeDeductibleInClaimAmount(deductibleStatus: DeductibleStatus): boolean {
	switch (deductibleStatus) {
		case DeductibleStatus.NOT_CONFIRMED:
		case DeductibleStatus.APPLIES:
		case DeductibleStatus.REIMBURSED_BY_CLIENT:
		case DeductibleStatus.REIMBURSED_BY_ADVERSE:
			return true; // Include in total_incurred

		case DeductibleStatus.WAIVED:
		case DeductibleStatus.NO_DEDUCTIBLE:
			return false; // Do NOT include in total_incurred

		default:
			return false; // Safe default
	}
}

/**
 * Validates that deductible amount is 0 when status is NO_DEDUCTIBLE.
 * Throws error if validation fails.
 */
export function validateDeductibleAmount(deductibleAmount: number | null, deductibleStatus: DeductibleStatus): void {
	if (deductibleStatus === DeductibleStatus.NO_DEDUCTIBLE) {
		if (deductibleAmount !== 0 && deductibleAmount !== null) {
			throw new Error('Deductible amount must be $0 when status is NO_DEDUCTIBLE');
		}
	}
}
