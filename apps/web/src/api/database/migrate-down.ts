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
async function migrateDown(targetMigrationName?: string) {
	if (!targetMigrationName) {
		throw new Error('Missing target migration. Usage: migrate-down --to <migration_name>');
	}

	const { error, results } = await migrator.migrateTo(targetMigrationName);

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

function parseArgs() {
	const args = process.argv.slice(2);

	// Example: node migrate-down.js --to 20260126_add_table
	const toIndex = args.indexOf('--to');
	if (toIndex === -1 || !args[toIndex + 1]) {
		return { to: undefined };
	}

	return { to: args[toIndex + 1] };
}

const { to } = parseArgs();

migrateDown(to).catch((err) => {
	console.error(err);
	process.exit(1);
});
