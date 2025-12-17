import { Kysely, sql } from 'kysely';

/**
 * Migration: restructure_party_roles
 * Created: 2025-12-17T14:19:21.585Z
 *
 * Restructures party roles for the claim detail view:
 * 1. Adds parent_claim_party_id to claim_party for entity-facilitator hierarchy
 * 2. Creates two new reference_list entities for role categorization:
 *    - claimant_party_role (Claimants & Coverage tab)
 *    - adverse_party_role (Adverse Parties & Liability tab)
 */

export async function up(db: Kysely<any>): Promise<void> {
	// 1. Add parent_claim_party_id column to claim_party for entity-facilitator hierarchy
	await db.schema
		.alterTable('claim_party')
		.addColumn('parent_claim_party_id', 'integer', (col) => col.references('claim_party.id').onDelete('set null'))
		.execute();

	// 2. Add index for parent lookups
	await sql`CREATE INDEX idx_claim_party_parent ON claim_party(parent_claim_party_id) WHERE deleted_at IS NULL`.execute(
		db
	);

	// 3. Add the two new role reference lists for all existing clients
	await sql`
		DO $$
		DECLARE
			client_rec RECORD;
			list_id INTEGER;
		BEGIN
			-- Loop through all clients
			FOR client_rec IN SELECT id FROM client LOOP

				-- CLAIMANT PARTY ROLE (Claimants & Coverage tab)
				INSERT INTO reference_list (entity, display_name, description, client_id)
				VALUES ('claimant_party_role', 'Claimant Party Role', 'Roles for parties on the Claimants & Coverage tab', client_rec.id)
				RETURNING id INTO list_id;

				INSERT INTO reference_option (reference_list_id, value, display_label, icon_emoji, is_system_default, client_id, sort_order) VALUES
					(list_id, 'claimant', 'Claimant', '📋', true, client_rec.id, 1),
					(list_id, 'insured', 'Insured', '🛡️', true, client_rec.id, 2),
					(list_id, 'property_owner', 'Property Owner', '🏠', true, client_rec.id, 3),
					(list_id, 'witness', 'Witness', '👁️', true, client_rec.id, 4),
					(list_id, 'our_attorney', 'Our Attorney', '⚖️', true, client_rec.id, 5);

				-- ADVERSE PARTY ROLE (Adverse Parties & Liability tab)
				INSERT INTO reference_list (entity, display_name, description, client_id)
				VALUES ('adverse_party_role', 'Adverse Party Role', 'Roles for parties on the Adverse Parties & Liability tab', client_rec.id)
				RETURNING id INTO list_id;

				INSERT INTO reference_option (reference_list_id, value, display_label, icon_emoji, is_system_default, client_id, sort_order) VALUES
					(list_id, 'responsible_party', 'Responsible Party', '👤', true, client_rec.id, 1),
					(list_id, 'adverse_carrier', 'Adverse Carrier', '🏢', true, client_rec.id, 2),
					(list_id, 'their_attorney', 'Their Attorney', '👔', true, client_rec.id, 3),
					(list_id, 'expert', 'Expert', '🎓', true, client_rec.id, 4),
					(list_id, 'other', 'Other', '📌', true, client_rec.id, 5);

			END LOOP;
		END $$;
	`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
	// 1. Drop the index first
	await sql`DROP INDEX IF EXISTS idx_claim_party_parent`.execute(db);

	// 2. Drop the parent_claim_party_id column
	await db.schema.alterTable('claim_party').dropColumn('parent_claim_party_id').execute();

	// 3. Delete the new reference_list entries (and their options via cascade or manual delete)
	await sql`
		DELETE FROM reference_option
		WHERE reference_list_id IN (
			SELECT id FROM reference_list
			WHERE entity IN ('claimant_party_role', 'adverse_party_role')
		)
	`.execute(db);

	await sql`
		DELETE FROM reference_list
		WHERE entity IN ('claimant_party_role', 'adverse_party_role')
	`.execute(db);
}
