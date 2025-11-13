import 'dotenv/config';
import { migrator } from './migrator';
import { db } from './kysely';

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
		await db.destroy();
		process.exit(1);
	}

	if (!results || results.length === 0) {
		console.log('✓ No pending migrations - database is up to date');
	} else {
		console.log(`\n✓ Successfully executed ${results.length} migration(s)`);
	}

	await db.destroy();
}

migrateToLatest();
