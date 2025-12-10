/**
 * Feed Fixtures
 */

import { Kysely } from 'kysely';
import type { DB } from '@/api/database/types';

/**
 * Create a test feed
 */
export async function createTestFeed(
	db: Kysely<DB>,
	overrides: {
		client_id: string;
		created_by: string;
		name?: string;
		feed_type?: string;
		schedule?: number;
		status?: string;
		connection_options?: Record<string, unknown>;
	}
) {
	const data = {
		client_id: overrides.client_id,
		created_by: overrides.created_by,
		name: overrides.name || `Test Feed ${Date.now()}`,
		feed_type: overrides.feed_type || 'sftp',
		schedule: overrides.schedule ?? 0,
		status: overrides.status || 'Inactive',
		connection_options: JSON.stringify(overrides.connection_options || { host: 'test.example.com' }),
	};

	return db
		.insertInto('feeds')
		.values(data)
		.returningAll()
		.executeTakeFirstOrThrow();
}
