import { Kysely, sql } from 'kysely';

/**
 * Migration: drop_loss_type_from_claim
 * Created: 2025-12-02T18:59:03.753Z
 *
 * Removes loss_type column from the claim table.
 * Loss type is now stored per claim_liability record and aggregated from there.
 */

export async function up(db: Kysely<any>): Promise<void> {
	// Drop the index on loss_type
	await sql`DROP INDEX IF EXISTS idx_claim_loss_type`.execute(db);

	// Drop the check constraint
	await sql`ALTER TABLE claim DROP CONSTRAINT IF EXISTS claim_loss_type_check`.execute(db);

	// Drop the loss_type column
	await db.schema.alterTable('claim').dropColumn('loss_type').execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	// Recreate the loss_type column
	await db.schema.alterTable('claim').addColumn('loss_type', 'text').execute();

	// Recreate the check constraint
	await sql`
		ALTER TABLE claim ADD CONSTRAINT claim_loss_type_check
		CHECK (loss_type IS NULL OR (loss_type = ANY (ARRAY[
			'collision'::text, 'comprehensive'::text, 'fire'::text, 'theft'::text,
			'water_damage'::text, 'wind'::text, 'vandalism'::text, 'bodily_injury'::text,
			'property_damage'::text, 'uninsured_motorist'::text, 'medical_payments'::text,
			'personal_injury_protection'::text, 'other'::text
		])))
	`.execute(db);

	// Recreate the index
	await sql`CREATE INDEX idx_claim_loss_type ON claim (loss_type)`.execute(db);
}
