/**
 * Coverage Fixtures
 */

import { Kysely, sql } from 'kysely';
import type { DB } from '@/api/database/types';
import { DeductibleStatus } from '@/config/enums';
import { shouldIncludeDeductibleInClaimAmount } from '@/api/utils/deductibleUtils';

/**
 * Create a test coverage
 * Also updates claim.total_incurred via delta increment to match production behavior
 */
export async function createTestCoverage(
	db: Kysely<DB>,
	overrides: {
		client_id: string;
		claim_id: string;
		created_by: string;
		claim_party_id?: string | null;
		loss_type?: string;
		coverage_amount?: string | number | null;
		amount_reserved?: string | number | null;
		deductible_amount?: string | number | null;
		deductible_status?: DeductibleStatus;
		subro_applicable?: boolean;
		statute_date?: Date | null;
		statute_preserved?: boolean;
		deleted_at?: Date | null;
		deleted_by?: string | null;
	}
) {
	const data = {
		client_id: overrides.client_id,
		claim_id: overrides.claim_id,
		created_by: overrides.created_by,
		claim_party_id: overrides.claim_party_id ?? null,
		loss_type: overrides.loss_type || 'dwelling',
		coverage_amount: overrides.coverage_amount?.toString() ?? null,
		amount_reserved: overrides.amount_reserved?.toString() ?? null,
		deductible_amount: overrides.deductible_amount?.toString() ?? null,
		deductible_status: overrides.deductible_status ?? DeductibleStatus.NOT_CONFIRMED,
		subro_applicable: overrides.subro_applicable ?? false,
		statute_date: overrides.statute_date ?? null,
		statute_preserved: overrides.statute_preserved ?? false,
		deleted_at: overrides.deleted_at ?? null,
		deleted_by: overrides.deleted_by ?? null,
	};

	const coverage = await db
		.insertInto('claim_coverage')
		.values(data)
		.returningAll()
		.executeTakeFirstOrThrow();

	// Update claim.total_incurred via delta increment (matches production behavior)
	// Includes both reserves and deductible (if applicable based on status)
	if (!overrides.deleted_at) {
		const reserveAmount =
			overrides.amount_reserved !== null && overrides.amount_reserved !== undefined
				? typeof overrides.amount_reserved === 'string'
					? parseFloat(overrides.amount_reserved)
					: overrides.amount_reserved
				: 0;

		const deductibleAmount =
			overrides.deductible_amount !== null && overrides.deductible_amount !== undefined
				? typeof overrides.deductible_amount === 'string'
					? parseFloat(overrides.deductible_amount)
					: overrides.deductible_amount
				: 0;

		const deductibleStatus = overrides.deductible_status ?? DeductibleStatus.NOT_CONFIRMED;
		const shouldIncludeDeductible = shouldIncludeDeductibleInClaimAmount(deductibleStatus);
		const deductibleImpact = shouldIncludeDeductible ? deductibleAmount : 0;

		const totalDelta = reserveAmount + deductibleImpact;

		if (totalDelta !== 0) {
			await db
				.updateTable('claim')
				.set({
					total_incurred: sql`COALESCE(total_incurred::numeric, 0) + ${totalDelta}`,
				})
				.where('id', '=', overrides.claim_id)
				.where('client_id', '=', overrides.client_id)
				.execute();
		}
	}

	return coverage;
}
