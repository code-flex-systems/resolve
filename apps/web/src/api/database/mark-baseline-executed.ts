import 'dotenv/config';
import { sql } from 'kysely';
import { db } from './kysely';

/**
 * ONE-TIME SCRIPT: Mark baseline migration as executed for existing databases.
 *
 * This script is used ONLY for existing databases that already have the schema.
 * It inserts the baseline migration into kysely_migration table to mark it as executed,
 * preventing it from running again.
 *
 * DO NOT run this on fresh databases - let the migration run naturally instead.
 *
 * Usage: tsx src/api/database/mark-baseline-executed.ts
 */
async function markBaselineExecuted() {
	const BASELINE_NAME = '2025-11-12_baseline';

	try {
		// First, ensure kysely_migration table exists
		await sql`
			CREATE TABLE IF NOT EXISTS kysely_migration (
				name VARCHAR(255) PRIMARY KEY,
				timestamp TIMESTAMP NOT NULL DEFAULT NOW()
			)
		`.execute(db);

		// Check if baseline is already marked
		const existing = await db
			.selectFrom('kysely_migration' as any)
			.selectAll()
			.where('name' as any, '=', BASELINE_NAME)
			.executeTakeFirst();

		if (existing) {
			console.log(`ℹ Baseline migration "${BASELINE_NAME}" is already marked as executed`);
			await db.destroy();
			return;
		}

		// Insert baseline migration as executed
		await db
			.insertInto('kysely_migration' as any)
			.values({
				name: BASELINE_NAME,
				timestamp: new Date(),
			} as any)
			.execute();

		console.log(`✓ Marked baseline migration "${BASELINE_NAME}" as executed`);
		console.log(`\nYour existing database is now ready for Kysely migrations.`);
		console.log(`Future migrations will be tracked automatically.`);
	} catch (error) {
		console.error('❌ Failed to mark baseline as executed');
		console.error(error);
		process.exit(1);
	}

	await db.destroy();
}

markBaselineExecuted();
