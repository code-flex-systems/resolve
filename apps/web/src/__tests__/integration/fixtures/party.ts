/**
 * Party Fixtures
 */

import { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';

/**
 * Create a test party (company/organization)
 */
export async function createTestParty(
	db: Kysely<DB>,
	overrides: {
		client_id: string;
		created_by: string;
		name?: string;
		party_type?: string;
		party_category?: string;
		email?: string | null;
		phone?: string | null;
		address?: string | null;
	}
) {
	const data = {
		client_id: overrides.client_id,
		name: overrides.name || `Test Party ${Date.now()}`,
		party_type: overrides.party_type || 'facilitator',
		party_category: overrides.party_category || 'adverse_carrier',
		email: overrides.email ?? null,
		phone: overrides.phone ?? null,
		address: overrides.address ?? null,
		created_by: overrides.created_by,
	};

	return db
		.insertInto('party')
		.values(data)
		.returningAll()
		.executeTakeFirstOrThrow();
}
