/**
 * Integration Test Setup
 *
 * This file is loaded before integration tests run.
 * It configures the test database connection and provides
 * global hooks for test isolation.
 */

import { beforeAll, afterAll, beforeEach } from 'vitest';
import { getTestDb, closeTestDb, truncateAllTables } from './testDb';

// Set test environment variables
beforeAll(() => {
	process.env.DB_SCHEMA = 'test';
	process.env.DB_HOST = 'localhost';
	process.env.DB_PORT = '5432';
	process.env.DB_DATABASE = 'manifest_test';
	process.env.DB_USER = 'postgres';
	process.env.DB_PASSWORD = 'password';
});

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
