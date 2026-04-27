/**
 * Integration Test Database Utilities
 *
 * Provides isolated database connections for integration tests using a dedicated
 * test database and schema isolation.
 *
 * Strategy:
 * - Uses `manifest_test` database with `test` schema
 * - Each test file gets a fresh database state via table truncation
 * - Real Kysely instance for actual query execution
 */

import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import type { DB } from '@/api/database/types';
import type { ProtectedContext } from '@/server/trpc/trpc';

const TEST_DB_CONFIG = {
	user: process.env.DB_USER || 'postgres',
	password: process.env.DB_PASSWORD || 'password',
	database: process.env.DB_DATABASE || 'manifest_test',
	host: process.env.DB_HOST || 'localhost',
	port: parseInt(process.env.DB_PORT || '5432', 10),
};

const TEST_SCHEMA = process.env.DB_SCHEMA || 'test';

let testPool: Pool | null = null;
let testDb: Kysely<DB> | null = null;

/**
 * Get or create the test database pool and Kysely instance
 */
export function getTestDb(): Kysely<DB> {
	if (!testDb) {
		testPool = new Pool(TEST_DB_CONFIG);
		// Set search_path on every new connection so raw SQL fragments resolve
		// unqualified table names against the test schema (Kysely's withSchema
		// only applies to the query builder, not raw `sql` template literals).
		testPool.on('connect', (client) => {
			client.query(`SET search_path TO ${TEST_SCHEMA}, public`);
		});
		testDb = new Kysely<DB>({
			dialect: new PostgresDialect({ pool: testPool }),
		}).withSchema(TEST_SCHEMA);
	}
	return testDb;
}

/**
 * Close the test database connection
 */
let isClosing = false;
export async function closeTestDb(): Promise<void> {
	// Prevent double-close
	if (isClosing) return;
	isClosing = true;

	if (testDb) {
		await testDb.destroy();
		testDb = null;
	}
	if (testPool) {
		try {
			await testPool.end();
		} catch (err) {
			// Ignore "Called end on pool more than once" errors
		}
		testPool = null;
	}

	isClosing = false;
}

/**
 * Truncate all tables to reset database state
 * Preserves schema structure but removes all data
 */
export async function truncateAllTables(db: Kysely<DB>): Promise<void> {
	// Get all table names in the schema
	const tables = await sql<{ tablename: string }>`
		SELECT tablename
		FROM pg_tables
		WHERE schemaname = ${TEST_SCHEMA}
		AND tablename NOT LIKE 'kysely_%'
	`.execute(db);

	if (tables.rows.length === 0) {
		return;
	}

	// Disable triggers temporarily to avoid FK constraint issues
	await sql`SET session_replication_role = 'replica'`.execute(db);

	// Truncate all tables
	const tableNames = tables.rows.map((t) => `"${TEST_SCHEMA}"."${t.tablename}"`).join(', ');
	await sql.raw(`TRUNCATE ${tableNames} RESTART IDENTITY CASCADE`).execute(db);

	// Re-enable triggers
	await sql`SET session_replication_role = 'origin'`.execute(db);
}

/**
 * Create a test context that mimics ProtectedContext with real database
 */
export function createTestContext(
	db: Kysely<DB>,
	userOverrides: {
		id?: string;
		clerkId?: string;
		name?: string;
		email?: string;
		phone?: string | null;
		role?: string;
		client_id?: string;
	} = {}
): ProtectedContext {
	return {
		session: {
			user: {
				id: userOverrides.id || randomUUID(),
				clerkId: userOverrides.clerkId || `clerk_${randomUUID()}`,
				name: userOverrides.name || 'Test User',
				email: userOverrides.email || 'test@example.com',
				phone: userOverrides.phone ?? null,
				role: userOverrides.role || 'Admin',
				client_id: userOverrides.client_id || randomUUID(),
			},
		},
		db,
	} as ProtectedContext;
}

/**
 * Helper to run a function within a transaction that rolls back
 * Useful for tests that need isolation but don't modify much data
 */
export async function withRollback<T>(
	db: Kysely<DB>,
	fn: (trx: Kysely<DB>) => Promise<T>
): Promise<T> {
	return db.transaction().execute(async (trx) => {
		const result = await fn(trx);
		// Force rollback by throwing
		throw { __rollback: true, result };
	}).catch((err) => {
		if (err && err.__rollback) {
			return err.result as T;
		}
		throw err;
	});
}
