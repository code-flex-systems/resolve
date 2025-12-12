/**
 * Deadline Fixtures
 */

import { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';

/**
 * Create a test deadline
 */
export async function createTestDeadline(
	db: Kysely<DB>,
	overrides: {
		client_id: string;
		claim_id: number;
		created_by: string;
		deadline_type?: string;
		deadline_date?: Date | string;
		description?: string | null;
		status?: string;
		entity_type?: string;
		entity_id?: number;
	}
) {
	const data = {
		client_id: overrides.client_id,
		claim_id: overrides.claim_id,
		created_by: overrides.created_by,
		deadline_type: overrides.deadline_type || 'custom',
		deadline_date: overrides.deadline_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
		description: overrides.description ?? null,
		status: overrides.status || 'pending',
		entity_type: overrides.entity_type ?? null,
		entity_id: overrides.entity_id ?? null,
	};

	return db
		.insertInto('deadline')
		.values(data)
		.returningAll()
		.executeTakeFirstOrThrow();
}
