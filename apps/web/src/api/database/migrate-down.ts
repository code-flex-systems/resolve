import 'dotenv/config';
import { migrator } from './migrator';
import { db } from './kysely';

/**
 * Rollback the last migration.
 *
 * This script rolls back the most recently executed migration by running its down() function.
 * Useful during development when you need to undo a migration.
 *
 * Usage: tsx src/api/database/migrate-down.ts
 * Or via npm: npm run db:migrate:down
 */
async function migrateDown() {
	const { error, results } = await migrator.migrateDown();

	results?.forEach((it) => {
		if (it.status === 'Success') {
			console.log(`✓ Migration "${it.migrationName}" was rolled back successfully`);
		} else if (it.status === 'Error') {
			console.error(`✗ Failed to rollback migration "${it.migrationName}"`);
		}
	});

	if (error) {
		console.error('❌ Rollback failed');
		console.error(error);
		await db.destroy();
		process.exit(1);
	}

	if (!results || results.length === 0) {
		console.log('ℹ No migrations to roll back');
	}

	await db.destroy();
}

migrateDown();
