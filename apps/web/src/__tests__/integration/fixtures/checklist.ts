/**
 * Checklist Fixtures
 */

import { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';

/**
 * Create a test checklist
 */
export async function createTestChecklist(
	db: Kysely<DB>,
	overrides: {
		client_id: string;
		created_by: string;
		name?: string;
		description?: string | null;
		published?: boolean;
	}
) {
	const data = {
		client_id: overrides.client_id,
		name: overrides.name || `Test Checklist ${Date.now()}`,
		description: overrides.description ?? null,
		published: overrides.published ?? false,
		created_by: overrides.created_by,
	};

	return db
		.insertInto('checklist')
		.values(data)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Create a test checklist-claim association
 */
export async function createTestChecklistClaim(
	db: Kysely<DB>,
	overrides: {
		client_id: string;
		checklist_id: number;
		claim_id: number;
		created_by: string;
		assignee?: string | null;
		status?: string;
	}
) {
	const data = {
		client_id: overrides.client_id,
		checklist_id: overrides.checklist_id,
		claim_id: overrides.claim_id,
		created_by: overrides.created_by,
		assignee: overrides.assignee ?? null,
		status: overrides.status || 'in_progress',
	};

	return db
		.insertInto('checklist_claim')
		.values(data)
		.returningAll()
		.executeTakeFirstOrThrow();
}
