import { Kysely, sql } from 'kysely';

/**
 * Migration: add_representative_to_claim_party
 * Created: 2025-11-18T20:00:00.000Z
 *
 * Adds representative_id to claim_party table to track which specific representative
 * from a party is handling a claim. Also adds partial unique index to enforce
 * one primary party per role per claim at the database level.
 */

export async function up(db: Kysely<any>): Promise<void> {
	// Add representative_id column
	await db.schema
		.alterTable('claim_party')
		.addColumn('representative_id', 'integer')
		.execute();

	// Add foreign key constraint to party_representative
	await db.schema
		.alterTable('claim_party')
		.addForeignKeyConstraint(
			'claim_party_representative_id_fkey',
			['representative_id'],
			'party_representative',
			['id']
		)
		.onDelete('set null')
		.execute();

	// Clean up existing data: ensure only one primary party per role per claim
	// Keep the most recently created one, set others to is_primary = false
	await sql`
		WITH ranked_primaries AS (
			SELECT
				id,
				claim_id,
				role,
				is_primary,
				ROW_NUMBER() OVER (
					PARTITION BY claim_id, role
					ORDER BY created_at DESC, id DESC
				) AS rn
			FROM claim_party
			WHERE is_primary = true
				AND deleted_at IS NULL
		)
		UPDATE claim_party
		SET is_primary = false
		WHERE id IN (
			SELECT id
			FROM ranked_primaries
			WHERE rn > 1
		)
	`.execute(db);

	// Add partial unique index to enforce one primary party per role per claim
	// This prevents multiple primary adverse_carriers, primary attorneys, etc.
	await sql`
		CREATE UNIQUE INDEX idx_claim_party_unique_primary_per_role
		ON claim_party (claim_id, role)
		WHERE is_primary = true AND deleted_at IS NULL
	`.execute(db);

	// Add column comments
	await sql`
		COMMENT ON COLUMN claim_party.representative_id IS 'Specific representative from the party handling this claim (optional)'
	`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
	// Drop partial unique index
	await db.schema.dropIndex('idx_claim_party_unique_primary_per_role').execute();

	// Drop foreign key constraint
	await sql`
		ALTER TABLE claim_party DROP CONSTRAINT IF EXISTS claim_party_representative_id_fkey
	`.execute(db);

	// Drop column
	await db.schema.alterTable('claim_party').dropColumn('representative_id').execute();
}
