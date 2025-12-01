import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
	// Step 1: Add new fields as nullable
	await db.schema
		.alterTable('claim')
		.addColumn('reserved_recovery', 'numeric', (col) => col.defaultTo(null))
		.addColumn('paid_recovery', 'numeric', (col) => col.defaultTo(null))
		.execute();

	// Step 2: Copy existing expected_recovery values to reserved_recovery
	await sql`
		UPDATE claim
		SET reserved_recovery = expected_recovery
		WHERE expected_recovery IS NOT NULL
	`.execute(db);

	// Step 3: Clear expected_recovery to repurpose it (team's forecast)
	await sql`UPDATE claim SET expected_recovery = NULL`.execute(db);

	console.log('Recovery fields migration completed:');
	console.log('- Added reserved_recovery (populated from old expected_recovery)');
	console.log('- Added paid_recovery (starts NULL)');
	console.log('- Cleared expected_recovery for team forecasting (starts NULL)');
}

export async function down(db: Kysely<any>): Promise<void> {
	// Step 1: Restore original expected_recovery from reserved_recovery
	await sql`
		UPDATE claim
		SET expected_recovery = reserved_recovery
		WHERE reserved_recovery IS NOT NULL
	`.execute(db);

	// Step 2: Drop the new columns
	await db.schema.alterTable('claim').dropColumn('reserved_recovery').execute();

	await db.schema.alterTable('claim').dropColumn('paid_recovery').execute();

	console.log('Recovery fields migration rolled back');
}
