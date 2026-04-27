/**
 * Recovery Event Fixtures
 */

import { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';

/**
 * Create a test recovery event
 * Note: settlement_id is required - a recovery event must be linked to a settlement
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
	const data = {
		client_id: overrides.client_id,
		claim_id: overrides.claim_id,
		settlement_id: overrides.settlement_id,
		created_by: overrides.created_by,
		recovery_date: overrides.recovery_date || new Date(),
		recovery_amount: overrides.recovery_amount?.toString() || '1000.00',
		recovery_source: overrides.recovery_source ?? null,
		notes: overrides.notes ?? null,
	};

	return db.insertInto('recovery_event').values(data).returningAll().executeTakeFirstOrThrow();
}
