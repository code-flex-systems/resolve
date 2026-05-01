/**
 * Setup Test Database
 *
 * This script creates the manifest_test database and test schema,
 * then runs all migrations to set up the schema structure.
 *
 * Run with: npx tsx src/__tests__/integration/setup-test-db.ts
 */

import { Pool } from 'pg';
import { promises as fs } from 'fs';
import path from 'path';
import { Kysely, PostgresDialect, Migrator, FileMigrationProvider } from 'kysely';

const POSTGRES_CONFIG = {
	user: process.env.DB_USER || 'postgres',
	password: process.env.DB_PASSWORD || 'password',
	host: process.env.DB_HOST || 'localhost',
	port: parseInt(process.env.DB_PORT || '5432', 10),
};

const TEST_DB_NAME = 'manifest_test';
const TEST_SCHEMA = 'test';

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

async function setupSchema(): Promise<void> {
	const testPool = new Pool({
		...POSTGRES_CONFIG,
		database: TEST_DB_NAME,
	});

	try {
		// Drop existing test schema if it exists
		console.log(`Dropping schema if exists: ${TEST_SCHEMA}`);
		await testPool.query(`DROP SCHEMA IF EXISTS ${TEST_SCHEMA} CASCADE`);

		// Drop analytics schema too — the dump from manifest DB will recreate it,
		// and CREATE SCHEMA without IF NOT EXISTS will fail if it already exists.
		console.log('Dropping schema if exists: analytics');
		await testPool.query(`DROP SCHEMA IF EXISTS analytics CASCADE`);

		// Create fresh test schema
		console.log(`Creating schema: ${TEST_SCHEMA}`);
		await testPool.query(`CREATE SCHEMA ${TEST_SCHEMA}`);
		console.log(`Schema ${TEST_SCHEMA} created successfully`);

		// Clone schema from production manifest database
		console.log('Cloning schema from manifest database...');
		const { execSync } = await import('child_process');

		// Dump schema only from manifest database
		const pgDumpCmd = `pg_dump -h ${POSTGRES_CONFIG.host} -p ${POSTGRES_CONFIG.port} -U ${POSTGRES_CONFIG.user} -d manifest --schema-only --no-owner --no-privileges 2>&1`;
		let schemaSql: string;
		try {
			schemaSql = execSync(pgDumpCmd, {
				env: { ...process.env, PGPASSWORD: POSTGRES_CONFIG.password },
				maxBuffer: 10 * 1024 * 1024, // 10MB
			}).toString();
		} catch (err: any) {
			console.error('pg_dump failed:', err.stderr?.toString() || err.message);
			throw err;
		}

		// Replace public schema references with test schema
		schemaSql = schemaSql
			.replace(/CREATE SCHEMA public;/g, '') // Remove public schema creation
			.replace(/COMMENT ON SCHEMA public/g, '-- COMMENT ON SCHEMA public')
			.replace(/SET search_path = public/g, `SET search_path = ${TEST_SCHEMA}`)
			.replace(/public\./g, `${TEST_SCHEMA}.`)
			.replace(/SCHEMA public/g, `SCHEMA ${TEST_SCHEMA}`);

		// Set search path and run schema SQL
		await testPool.query(`SET search_path TO ${TEST_SCHEMA}`);
		await testPool.query(schemaSql);
		console.log('Schema cloned successfully');

		// Mark all migrations as executed (since schema is already at latest)
		const migrationFiles = await fs.readdir(path.join(__dirname, '../../api/database/migrations'));
		const migrations = migrationFiles
			.filter((f) => f.endsWith('.ts'))
			.map((f) => f.replace('.ts', ''));

		for (const migration of migrations) {
			await testPool.query(
				`
				INSERT INTO ${TEST_SCHEMA}.kysely_migration (name, timestamp)
				VALUES ($1, $2)
				ON CONFLICT (name) DO NOTHING
			`,
				[migration, new Date().toISOString()]
			);
		}
		console.log(`Marked ${migrations.length} migrations as executed`);
	} finally {
		await testPool.end();
	}
}

async function runMigrations(): Promise<void> {
	const testPool = new Pool({
		...POSTGRES_CONFIG,
		database: TEST_DB_NAME,
	});

	// Set search path for the pool
	testPool.on('connect', (client) => {
		client.query(`SET search_path TO ${TEST_SCHEMA}, public`);
	});

	const db = new Kysely<any>({
		dialect: new PostgresDialect({ pool: testPool }),
	}).withSchema(TEST_SCHEMA);

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
			if (result.status === 'Success') {
				console.log(`  ✓ ${result.migrationName}`);
			} else if (result.status === 'Error') {
				console.error(`  ✗ ${result.migrationName}`);
			}
		});

		if (error) {
			console.error('Migration failed:', error);
			throw error;
		}

		console.log('Migrations completed successfully');
	} finally {
		await db.destroy();
	}
}

async function main(): Promise<void> {
	console.log('=== Setting up Integration Test Database ===\n');

	await createTestDatabase();
	await setupSchema();
	// Note: runMigrations() is not needed since we clone the schema from manifest
	// and mark all migrations as executed

	console.log('\n=== Test database setup complete ===');
	console.log(`Database: ${TEST_DB_NAME}`);
	console.log(`Schema: ${TEST_SCHEMA}`);
}

main().catch((err) => {
	console.error('Setup failed:', err);
	process.exit(1);
});
