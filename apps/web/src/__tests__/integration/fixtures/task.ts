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
		claim_id: string;
		desk_location_id: string;
		assigned_to?: string | null;
		title?: string;
		description?: string | null;
		status?: string;
		started_at?: Date | string | null;
		completed_at?: Date | string | null;
	}
) {
	const data = {
		client_id: overrides.client_id,
		claim_id: overrides.claim_id,
		desk_location_id: overrides.desk_location_id,
		assigned_to: overrides.assigned_to ?? null,
		title: overrides.title || `Test Task ${Date.now()}`,
		description: overrides.description ?? null,
		status: overrides.status || 'pending',
		started_at: overrides.started_at ?? null,
		completed_at: overrides.completed_at ?? null,
	};

	return db.insertInto('task').values(data).returningAll().executeTakeFirstOrThrow();
}
