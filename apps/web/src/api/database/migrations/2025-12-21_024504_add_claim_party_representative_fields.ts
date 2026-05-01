import { Kysely, sql } from 'kysely';

/**
 * Migration: add_claim_party_representative_fields
 * Created: 2025-12-21T02:45:04.896Z
 *
 * Adds fields to support differentiated representative handling:
 * - For entities: Free-form representative info (name, title, email, phone)
 * - For facilitators: Link to specific office/address (address_id)
 *
 * This enables:
 * - Entity representatives to be captured as simple text without database records
 * - Facilitator representatives to be properly linked to specific offices for correspondence routing
 */

export async function up(db: Kysely<any>): Promise<void> {
	// Add free-form representative fields for entity representatives
	await db.schema
		.alterTable('claim_party')
		.addColumn('representative_name', 'text')
		.addColumn('representative_title', 'text')
		.addColumn('representative_email', 'text')
		.addColumn('representative_phone', 'text')
		.execute();

	// Add address reference for facilitator office linking
	await db.schema.alterTable('claim_party').addColumn('address_id', 'integer').execute();

	// Add foreign key constraint to party_address
	await db.schema
		.alterTable('claim_party')
		.addForeignKeyConstraint('claim_party_address_id_fkey', ['address_id'], 'party_address', ['id'])
		.onDelete('set null')
		.execute();

	// Add column comments
	await sql`
		COMMENT ON COLUMN claim_party.representative_name IS 'Free-form representative name (entities only - for facilitators use representative_id)';
		COMMENT ON COLUMN claim_party.representative_title IS 'Free-form representative title (entities only)';
		COMMENT ON COLUMN claim_party.representative_email IS 'Free-form representative email (entities only)';
		COMMENT ON COLUMN claim_party.representative_phone IS 'Free-form representative phone (entities only)';
		COMMENT ON COLUMN claim_party.address_id IS 'Office/address for facilitator representatives (required when representative_id is set for facilitators)';
	`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
	// Drop foreign key constraint
	await sql`
		ALTER TABLE claim_party DROP CONSTRAINT IF EXISTS claim_party_address_id_fkey
	`.execute(db);

	// Drop columns
	await db.schema
		.alterTable('claim_party')
		.dropColumn('address_id')
		.dropColumn('representative_phone')
		.dropColumn('representative_email')
		.dropColumn('representative_title')
		.dropColumn('representative_name')
		.execute();
}
