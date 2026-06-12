/**
 * Integration Test Setup
 *
 * This file is loaded before integration tests run.
 * It configures the test database connection and provides
 * global hooks for test isolation.
 */

import { afterAll, beforeEach } from 'vitest';
import { getTestDb, closeTestDb, truncateAllTables } from './testDb';

// DB_* env vars are pinned to the local test database in setup-env.ts,
// which runs before this file (and before any app module is imported).

// Clean up database state before each test file
// Note: This runs once per file, not per test
beforeEach(async () => {
	const db = getTestDb();
	// Set search_path to 'test' schema so raw SQL queries find the right tables
	await db.executeQuery({
		sql: `SET search_path TO test, public`,
		parameters: [],
		query: { kind: 'RawNode' } as any,
	});
	await truncateAllTables(db);
});

// Close database connection after all tests
afterAll(async () => {
	await closeTestDb();
});
