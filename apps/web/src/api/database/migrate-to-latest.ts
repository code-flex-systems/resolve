import 'dotenv/config';
import { migrator } from './migrator';
import { db } from './kysely';
import { sql } from 'kysely';

/**
 * Migrate to the latest schema version.
 *
 * This script runs all pending migrations in order.
 * Kysely automatically tracks which migrations have been executed
 * in the kysely_migration table.
 *
 * Usage: tsx src/api/database/migrate-to-latest.ts
 * Or via npm: npm run db:migrate
 */
async function migrateToLatest() {
	const lockKey = 91502411;
	await sql`select pg_advisory_lock(${lockKey})`.execute(db);

	try {
		const { error, results } = await migrator.migrateToLatest();

		results?.forEach((it) => {
			if (it.status === 'Success') {
				console.log(`✓ Migration "${it.migrationName}" was executed successfully`);
			} else if (it.status === 'Error') {
				console.error(`✗ Failed to execute migration "${it.migrationName}"`);
			}
		});

		if (error) {
			console.error('❌ Migration failed');
			console.error(error);
			throw error;
		}

		if (!results || results.length === 0) {
			console.log('✓ No pending migrations - database is up to date');
		} else {
			console.log(`\n✓ Successfully executed ${results.length} migration(s)`);
		}
	} finally {
		await sql`select pg_advisory_unlock(${lockKey})`.execute(db);
		await db.destroy();
	}
}

migrateToLatest();
