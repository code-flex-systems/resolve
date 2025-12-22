/**
 * Coverage Fixtures
 */

import { Kysely, sql } from 'kysely';
import type { DB } from '@/api/database/types';

/**
 * Create a test coverage
 * Also updates claim.total_incurred via delta increment to match production behavior
 */
export async function createTestCoverage(
	db: Kysely<DB>,
	overrides: {
		client_id: string;
		claim_id: number;
		created_by: string;
		claim_party_id?: number | null;
		loss_type?: string;
		coverage_amount?: string | number | null;
		amount_reserved?: string | number | null;
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
		deleted_at: overrides.deleted_at ?? null,
		deleted_by: overrides.deleted_by ?? null,
	};

	const coverage = await db
		.insertInto('claim_coverage')
		.values(data)
		.returningAll()
		.executeTakeFirstOrThrow();

	// Update claim.total_incurred via delta increment (matches production behavior)
	if (overrides.amount_reserved !== null && overrides.amount_reserved !== undefined && !overrides.deleted_at) {
		const amount = typeof overrides.amount_reserved === 'string'
			? parseFloat(overrides.amount_reserved)
			: overrides.amount_reserved;

		if (amount !== 0) {
			await db
				.updateTable('claim')
				.set({
					total_incurred: sql`COALESCE(total_incurred::numeric, 0) + ${amount}`,
				})
				.where('id', '=', overrides.claim_id)
				.where('client_id', '=', overrides.client_id)
				.execute();
		}
	}

	return coverage;
}
