import { Kysely, sql } from 'kysely';

/**
 * Migration: restructure_address_fields
 * Created: 2025-12-15T20:52:22.130Z
 *
 * Replaces free-form address fields with structured address components
 * to support statutory restrictions, policy business logic, and time zones.
 *
 * Tables affected:
 * - claim: loss_location → loss_street_address, loss_city, loss_state, loss_postal_code, loss_country
 * - party: address → street_address, city, state, postal_code, country
 * - party_office: address → street_address, city, state, postal_code, country
 */

export async function up(db: Kysely<any>): Promise<void> {
	// ============================================================================
	// CLAIM TABLE - Replace loss_location
	// ============================================================================

	// Drop old column
	await db.schema.alterTable('claim').dropColumn('loss_location').execute();

	// Add new structured columns
	await db.schema.alterTable('claim').addColumn('loss_street_address', 'text').execute();
	await db.schema.alterTable('claim').addColumn('loss_city', 'text').execute();
	await db.schema.alterTable('claim').addColumn('loss_state', 'text').execute();
	await db.schema.alterTable('claim').addColumn('loss_postal_code', 'text').execute();
	await db.schema.alterTable('claim').addColumn('loss_country', 'text').execute();

	// Index on state for policy/statutory queries
	await sql`CREATE INDEX idx_claim_loss_state ON claim(loss_state) WHERE loss_state IS NOT NULL`.execute(
		db
	);

	// ============================================================================
	// PARTY TABLE - Replace address
	// ============================================================================

	// Drop old column
	await db.schema.alterTable('party').dropColumn('address').execute();

	// Add new structured columns
	await db.schema.alterTable('party').addColumn('street_address', 'text').execute();
	await db.schema.alterTable('party').addColumn('city', 'text').execute();
	await db.schema.alterTable('party').addColumn('state', 'text').execute();
	await db.schema.alterTable('party').addColumn('postal_code', 'text').execute();
	await db.schema.alterTable('party').addColumn('country', 'text').execute();

	// Index on state for filtering/searching
	await sql`CREATE INDEX idx_party_state ON party(state) WHERE state IS NOT NULL AND deleted_at IS NULL`.execute(
		db
	);

	// ============================================================================
	// PARTY_OFFICE TABLE - Replace address
	// ============================================================================

	// Drop old column
	await db.schema.alterTable('party_office').dropColumn('address').execute();

	// Add new structured columns
	await db.schema.alterTable('party_office').addColumn('street_address', 'text').execute();
	await db.schema.alterTable('party_office').addColumn('city', 'text').execute();
	await db.schema.alterTable('party_office').addColumn('state', 'text').execute();
	await db.schema.alterTable('party_office').addColumn('postal_code', 'text').execute();
	await db.schema.alterTable('party_office').addColumn('country', 'text').execute();

	// Index on state and city for filtering/searching
	await sql`CREATE INDEX idx_party_office_state ON party_office(state) WHERE state IS NOT NULL AND deleted_at IS NULL`.execute(
		db
	);
	await sql`CREATE INDEX idx_party_office_city ON party_office(city) WHERE city IS NOT NULL AND deleted_at IS NULL`.execute(
		db
	);
}

export async function down(db: Kysely<any>): Promise<void> {
	// ============================================================================
	// PARTY_OFFICE TABLE - Restore address
	// ============================================================================

	// Drop indexes
	await sql`DROP INDEX IF EXISTS idx_party_office_city`.execute(db);
	await sql`DROP INDEX IF EXISTS idx_party_office_state`.execute(db);

	// Drop new columns
	await db.schema.alterTable('party_office').dropColumn('country').execute();
	await db.schema.alterTable('party_office').dropColumn('postal_code').execute();
	await db.schema.alterTable('party_office').dropColumn('state').execute();
	await db.schema.alterTable('party_office').dropColumn('city').execute();
	await db.schema.alterTable('party_office').dropColumn('street_address').execute();

	// Restore old column
	await db.schema.alterTable('party_office').addColumn('address', 'text').execute();

	// ============================================================================
	// PARTY TABLE - Restore address
	// ============================================================================

	// Drop index
	await sql`DROP INDEX IF EXISTS idx_party_state`.execute(db);

	// Drop new columns
	await db.schema.alterTable('party').dropColumn('country').execute();
	await db.schema.alterTable('party').dropColumn('postal_code').execute();
	await db.schema.alterTable('party').dropColumn('state').execute();
	await db.schema.alterTable('party').dropColumn('city').execute();
	await db.schema.alterTable('party').dropColumn('street_address').execute();

	// Restore old column
	await db.schema.alterTable('party').addColumn('address', 'text').execute();

	// ============================================================================
	// CLAIM TABLE - Restore loss_location
	// ============================================================================

	// Drop index
	await sql`DROP INDEX IF EXISTS idx_claim_loss_state`.execute(db);

	// Drop new columns
	await db.schema.alterTable('claim').dropColumn('loss_country').execute();
	await db.schema.alterTable('claim').dropColumn('loss_postal_code').execute();
	await db.schema.alterTable('claim').dropColumn('loss_state').execute();
	await db.schema.alterTable('claim').dropColumn('loss_city').execute();
	await db.schema.alterTable('claim').dropColumn('loss_street_address').execute();

	// Restore old column
	await db.schema.alterTable('claim').addColumn('loss_location', 'text').execute();
}
