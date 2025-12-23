import { type Kysely, sql } from 'kysely';

/**
 * Migration: Cleanup reference_list and rename coverage_type to loss_type
 *
 * This migration:
 * 1. Removes simple enum types from reference_list (should use CHECK constraints instead)
 *    - address_status, address_type, phone_status, phone_type, email_type
 * 2. Removes deprecated entity types from reference_list
 *    - entity_category, facilitator_category (removed in party role refactor)
 *    - claim_party_role (superseded by claimant_party_role/adverse_party_role)
 *    - coverage_type (consolidating with loss_type)
 * 3. Renames claim_coverage.coverage_type column to loss_type
 */
export async function up(db: Kysely<unknown>): Promise<void> {
	// List of entities to remove from reference_list
	const entitiesToRemove = [
		// Simple enums (should be CHECK constraints only)
		'address_status',
		'address_type',
		'phone_status',
		'phone_type',
		'email_type',
		// Deprecated entities
		'entity_category',
		'facilitator_category',
		'claim_party_role',
		'coverage_type',
	];

	// Delete reference_options first (foreign key constraint)
	await sql`
		DELETE FROM reference_option
		WHERE reference_list_id IN (
			SELECT id FROM reference_list WHERE entity = ANY(${entitiesToRemove}::text[])
		)
	`.execute(db);

	// Delete reference_lists
	await sql`
		DELETE FROM reference_list
		WHERE entity = ANY(${entitiesToRemove}::text[])
	`.execute(db);

	// Rename claim_coverage.coverage_type to loss_type
	// First, drop the existing CHECK constraint
	await sql`ALTER TABLE claim_coverage DROP CONSTRAINT IF EXISTS claim_coverage_coverage_type_check`.execute(db);

	// Rename the column
	await sql`ALTER TABLE claim_coverage RENAME COLUMN coverage_type TO loss_type`.execute(db);

	// Add the new CHECK constraint with the loss_type values
	// These match the values from the loss_type reference list
	await sql`
		ALTER TABLE claim_coverage ADD CONSTRAINT claim_coverage_loss_type_check
		CHECK (loss_type = ANY(ARRAY[
			'collision', 'comprehensive', 'fire', 'theft', 'water_damage', 'wind',
			'vandalism', 'bodily_injury', 'property_damage', 'uninsured_motorist',
			'medical_payments', 'personal_injury_protection', 'liability',
			'dwelling', 'personal_property', 'loss_of_use', 'other'
		]::text[]))
	`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
	// Rename loss_type back to coverage_type
	await sql`ALTER TABLE claim_coverage DROP CONSTRAINT IF EXISTS claim_coverage_loss_type_check`.execute(db);
	await sql`ALTER TABLE claim_coverage RENAME COLUMN loss_type TO coverage_type`.execute(db);

	// Restore the original CHECK constraint
	await sql`
		ALTER TABLE claim_coverage ADD CONSTRAINT claim_coverage_coverage_type_check
		CHECK (coverage_type = ANY(ARRAY[
			'collision', 'comprehensive', 'liability', 'uninsured_motorist',
			'medical_payments', 'personal_injury_protection', 'dwelling',
			'personal_property', 'loss_of_use', 'other'
		]::text[]))
	`.execute(db);

	// Note: We don't restore the reference_list entries in down()
	// because they were incorrectly added in the first place.
	// If needed, they can be manually re-added through the admin UI.
}
