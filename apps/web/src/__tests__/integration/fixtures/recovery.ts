/**
 * Recovery Event Fixtures
 */

import { Kysely, sql } from 'kysely';
import type { DB } from '@/api/database/types';

/**
 * Create a test recovery event
 * Note: settlement_id is required - a recovery event must be linked to a settlement
 *
 * Also updates claim.actual_recovery via delta increment to match production behavior
 * (see createRecoveryEvent in recoveryQueries.ts).
 */
export async function createTestRecoveryEvent(
	db: Kysely<DB>,
	overrides: {
		client_id: string;
		claim_id: string;
		settlement_id: string;
		created_by: string;
		recovery_date?: Date | string;
		recovery_amount?: string | number;
		recovery_source?: string | null;
		notes?: string | null;
	}
) {
	const recoveryAmount = overrides.recovery_amount?.toString() || '1000.00';

	const data = {
		client_id: overrides.client_id,
		claim_id: overrides.claim_id,
		settlement_id: overrides.settlement_id,
		created_by: overrides.created_by,
		recovery_date: overrides.recovery_date || new Date(),
		recovery_amount: recoveryAmount,
		recovery_source: overrides.recovery_source ?? null,
		notes: overrides.notes ?? null,
	};

	const event = await db.insertInto('recovery_event').values(data).returningAll().executeTakeFirstOrThrow();

	// Mirror production behavior: increment claim.actual_recovery by the recovery amount
	await db
		.updateTable('claim')
		.set({
			actual_recovery: sql`COALESCE(actual_recovery::numeric, 0) + ${recoveryAmount}::numeric`,
		})
		.where('id', '=', overrides.claim_id)
		.where('client_id', '=', overrides.client_id)
		.execute();

	return event;
}
