/**
 * Task Fixtures
 */

import { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';

/**
 * Create a test task
 */
export async function createTestTask(
	db: Kysely<DB>,
	overrides: {
		client_id: string;
		claim_id: number;
		desk_location_id: number;
		assigned_by: string;
		title?: string;
		description?: string | null;
		status?: string;
		claimed_by?: string | null;
		completed_by?: string | null;
		completed_at?: Date | string | null;
	}
) {
	const data = {
		client_id: overrides.client_id,
		claim_id: overrides.claim_id,
		desk_location_id: overrides.desk_location_id,
		assigned_by: overrides.assigned_by,
		title: overrides.title || `Test Task ${Date.now()}`,
		description: overrides.description ?? null,
		status: overrides.status || 'pending',
		claimed_by: overrides.claimed_by ?? null,
		completed_by: overrides.completed_by ?? null,
		completed_at: overrides.completed_at ?? null,
	};

	return db
		.insertInto('task')
		.values(data)
		.returningAll()
		.executeTakeFirstOrThrow();
}
