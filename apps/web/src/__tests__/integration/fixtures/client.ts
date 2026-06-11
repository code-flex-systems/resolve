/**
 * Client & User Fixtures
 */

import { Kysely } from 'kysely';
import { randomUUID } from 'crypto';
import type { DB } from '@/api/database/types';

/**
 * Create a test client
 */
export async function createTestClient(
	db: Kysely<DB>,
	overrides: { id?: string; name?: string } = {}
) {
	const data = {
		id: overrides.id || randomUUID(),
		name: overrides.name || 'Test Client',
	};

	return db.insertInto('client').values(data).returningAll().executeTakeFirstOrThrow();
}

/**
 * Create a test user
 */
export async function createTestUser(
	db: Kysely<DB>,
	overrides: {
		id?: string;
		client_id: string;
		email?: string;
		first?: string;
		last?: string;
		role?: string;
		disabled?: boolean;
		created_by?: string | null;
	}
) {
	const data = {
		id: overrides.id || randomUUID(),
		client_id: overrides.client_id,
		email: overrides.email || `test-${randomUUID()}@example.com`,
		first: overrides.first || 'Test',
		last: overrides.last || 'User',
		role: overrides.role || 'Admin',
		disabled: overrides.disabled ?? false,
		created_by: overrides.created_by ?? null,
	};

	return db.insertInto('users').values(data).returningAll().executeTakeFirstOrThrow();
}
