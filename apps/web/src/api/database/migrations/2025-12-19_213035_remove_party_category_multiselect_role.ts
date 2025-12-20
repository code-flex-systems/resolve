import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
	// 1. Remove party_category from party table
	await db.schema.alterTable('party').dropColumn('party_category').execute();

	// 2. Convert claim_party.role from TEXT to TEXT[]
	// First, rename the old column
	await sql`ALTER TABLE claim_party RENAME COLUMN role TO role_old`.execute(db);

	// Add new array column
	await db.schema
		.alterTable('claim_party')
		.addColumn('role', sql`TEXT[]`, (col) => col.notNull().defaultTo(sql`'{}'::TEXT[]`))
		.execute();

	// Migrate existing role values to array (wrap single value in array)
	await sql`UPDATE claim_party SET role = ARRAY[role_old] WHERE role_old IS NOT NULL`.execute(db);

	// Drop the old column
	await db.schema.alterTable('claim_party').dropColumn('role_old').execute();

	// Note: entity_category and facilitator_category reference data will be removed from frontend code
}

export async function down(db: Kysely<any>): Promise<void> {
	// 1. Convert claim_party.role back from TEXT[] to TEXT
	// Rename the array column
	await sql`ALTER TABLE claim_party RENAME COLUMN role TO role_old`.execute(db);

	// Add scalar column back
	await db.schema.alterTable('claim_party').addColumn('role', 'text', (col) => col.notNull()).execute();

	// Migrate first element of array back to scalar
	await sql`UPDATE claim_party SET role = role_old[1] WHERE array_length(role_old, 1) > 0`.execute(db);

	// Drop the array column
	await db.schema.alterTable('claim_party').dropColumn('role_old').execute();

	// 2. Re-add party_category to party table
	await db.schema.alterTable('party').addColumn('party_category', 'text').execute();

	// Note: Reference data would need to be re-seeded manually if rolling back
}
