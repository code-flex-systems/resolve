/**
 * Setup Test Database
 *
 * Creates the resolve_test database and `test` schema, building the schema
 * from the repo (baseline SQL + all Kysely migrations).
 *
 * Uses dedicated TEST_DB_* environment variables (defaulting to local
 * postgres) and never reads the app's DB_* values, so it cannot target the
 * real (Supabase) database by accident.
 *
 * Strategy: migrations only run correctly against the `public` schema
 * (e.g. serial_to_uuid introspects table_schema = 'public'), so the schema
 * is built in `public` of the resolve_test database and then renamed to
 * `test`, which is what the integration tests use.
 *
 * Run with: npx tsx src/__tests__/integration/setup-test-db.ts
 */

// Load .env so machine-specific TEST_DB_* overrides apply
import 'dotenv/config';
import { Pool } from 'pg';
import { promises as fs, readFileSync } from 'fs';
import path from 'path';
import { Kysely, PostgresDialect, Migrator, FileMigrationProvider } from 'kysely';

const POSTGRES_CONFIG = {
	user: process.env.TEST_DB_USER || 'postgres',
	password: process.env.TEST_DB_PASSWORD || 'password',
	host: process.env.TEST_DB_HOST || 'localhost',
	port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
};

const TEST_DB_NAME = process.env.TEST_DB_DATABASE || 'resolve_test';
const TEST_SCHEMA = 'test';
const BASELINE_MIGRATION = '2025-11-12_baseline';

async function createTestDatabase(): Promise<void> {
	const adminPool = new Pool({
		...POSTGRES_CONFIG,
		database: 'postgres',
	});

	try {
		const result = await adminPool.query('SELECT 1 FROM pg_database WHERE datname = $1', [
			TEST_DB_NAME,
		]);

		if (result.rows.length === 0) {
			console.log(`Creating database: ${TEST_DB_NAME}`);
			await adminPool.query(`CREATE DATABASE ${TEST_DB_NAME}`);
			console.log(`Database ${TEST_DB_NAME} created successfully`);
		} else {
			console.log(`Database ${TEST_DB_NAME} already exists`);
		}
	} finally {
		await adminPool.end();
	}
}

async function buildSchema(): Promise<void> {
	const testPool = new Pool({
		...POSTGRES_CONFIG,
		database: TEST_DB_NAME,
	});

	try {
		// Start from a clean slate
		console.log('Resetting schemas...');
		await testPool.query(`DROP SCHEMA IF EXISTS ${TEST_SCHEMA} CASCADE`);
		await testPool.query(`DROP SCHEMA IF EXISTS analytics CASCADE`);
		await testPool.query(`DROP SCHEMA IF EXISTS public CASCADE`);
		await testPool.query(`CREATE SCHEMA public`);

		// Apply the baseline schema (same path as a fresh production database)
		console.log('Applying baseline SQL...');
		const baselineSql = readFileSync(
			path.join(__dirname, '../../api/sql/initial_tables_and_sql.sql'),
			'utf8'
		);
		await testPool.query(baselineSql);

		// Mark the baseline migration as executed
		await testPool.query(`
			CREATE TABLE IF NOT EXISTS kysely_migration (
				name VARCHAR(255) PRIMARY KEY,
				timestamp TIMESTAMP NOT NULL DEFAULT NOW()
			)
		`);
		await testPool.query(
			`INSERT INTO kysely_migration (name, timestamp) VALUES ($1, NOW()) ON CONFLICT (name) DO NOTHING`,
			[BASELINE_MIGRATION]
		);
	} finally {
		await testPool.end();
	}
}

async function runMigrations(): Promise<void> {
	const testPool = new Pool({
		...POSTGRES_CONFIG,
		database: TEST_DB_NAME,
	});

	const db = new Kysely<any>({
		dialect: new PostgresDialect({ pool: testPool }),
	});

	const migrator = new Migrator({
		db,
		provider: new FileMigrationProvider({
			fs,
			path,
			migrationFolder: path.join(__dirname, '../../api/database/migrations'),
		}),
	});

	try {
		console.log('Running migrations...');
		const { error, results } = await migrator.migrateToLatest();

		results?.forEach((result) => {
			if (result.status === 'Error') {
				console.error(`  ✗ ${result.migrationName}`);
			}
		});

		if (error) {
			console.error('Migration failed:', error);
			throw error;
		}

		console.log(`Migrations completed successfully (${results?.length ?? 0} executed)`);
	} finally {
		await db.destroy();
	}
}

async function renameToTestSchema(): Promise<void> {
	const testPool = new Pool({
		...POSTGRES_CONFIG,
		database: TEST_DB_NAME,
	});

	try {
		// Tests run against the `test` schema; move the built schema there
		// and leave a fresh empty `public` behind.
		console.log(`Renaming public schema to ${TEST_SCHEMA}...`);
		await testPool.query(`ALTER SCHEMA public RENAME TO ${TEST_SCHEMA}`);
		await testPool.query(`CREATE SCHEMA public`);
	} finally {
		await testPool.end();
	}
}

async function main(): Promise<void> {
	console.log('=== Setting up Integration Test Database ===\n');
	console.log(`Target: ${POSTGRES_CONFIG.host}:${POSTGRES_CONFIG.port}/${TEST_DB_NAME}\n`);

	await createTestDatabase();
	await buildSchema();
	await runMigrations();
	await renameToTestSchema();

	console.log('\n=== Test database setup complete ===');
	console.log(`Database: ${TEST_DB_NAME}`);
	console.log(`Schema: ${TEST_SCHEMA}`);
}

main().catch((err) => {
	console.error('Setup failed:', err);
	process.exit(1);
});
