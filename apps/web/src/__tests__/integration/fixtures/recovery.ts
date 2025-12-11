/**
 * Recovery Event Fixtures
 */

import { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';

/**
 * Create a test recovery event
 */
export async function createTestRecoveryEvent(
	db: Kysely<DB>,
	overrides: {
		client_id: string;
		claim_id: number;
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
		created_by: overrides.created_by,
		recovery_date: overrides.recovery_date || new Date(),
		recovery_amount: overrides.recovery_amount?.toString() || '1000.00',
		recovery_source: overrides.recovery_source ?? null,
		notes: overrides.notes ?? null,
	};

	return db
		.insertInto('recovery_event')
		.values(data)
		.returningAll()
		.executeTakeFirstOrThrow();
}
