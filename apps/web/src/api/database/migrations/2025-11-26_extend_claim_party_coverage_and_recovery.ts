import { Kysely, sql } from 'kysely';

/**
 * Migration: extend_claim_party_coverage_and_recovery
 * Created: 2025-11-26T00:00:00.000Z
 *
 * Extends claim_party table to support:
 * - Line of business per liability (moved from claim table)
 * - Coverage type categorization
 * - Paid/reserved recovery tracking per liability
 */

export async function up(db: Kysely<any>): Promise<void> {
	// 1. Add new columns to claim_party table
	await db.schema.alterTable('claim_party').addColumn('line_of_business', 'text').execute();

	await db.schema.alterTable('claim_party').addColumn('coverage_type', 'text').execute();

	await db.schema.alterTable('claim_party').addColumn('paid_recovery', 'numeric').execute();

	await db.schema.alterTable('claim_party').addColumn('reserved_recovery', 'numeric').execute();

	// 2. Add CHECK constraints for enums
	await sql`
		ALTER TABLE claim_party
		ADD CONSTRAINT claim_party_line_of_business_check
		CHECK (line_of_business IS NULL OR line_of_business = ANY(ARRAY[
			'auto',
			'property',
			'general_liability',
			'workers_comp',
			'professional_liability'
		]))
	`.execute(db);

	await sql`
		ALTER TABLE claim_party
		ADD CONSTRAINT claim_party_coverage_type_check
		CHECK (coverage_type IS NULL OR coverage_type = ANY(ARRAY[
			'property',
			'injury',
			'auto_liability',
			'general_liability',
			'professional_liability',
			'other'
		]))
	`.execute(db);

	// 3. Migrate existing claim.line_of_business to ALL claim_party records
	await sql`
		UPDATE claim_party cp
		SET line_of_business = c.line_of_business
		FROM claim c
		WHERE cp.claim_id = c.id
		AND c.line_of_business IS NOT NULL
	`.execute(db);

	// 4. Remove line_of_business from claim table
	// Drop index first
	await db.schema.dropIndex('idx_claim_line_of_business').ifExists().execute();

	// Drop CHECK constraint
	await sql`ALTER TABLE claim DROP CONSTRAINT IF EXISTS claim_line_of_business_check`.execute(db);

	// Drop column
	await db.schema.alterTable('claim').dropColumn('line_of_business').execute();

	// 5. Add indexes on claim_party for filtering
	await db.schema
		.createIndex('idx_claim_party_line_of_business')
		.on('claim_party')
		.column('line_of_business')
		.execute();

	await db.schema
		.createIndex('idx_claim_party_coverage_type')
		.on('claim_party')
		.column('coverage_type')
		.execute();

	// 6. Add column comments
	await sql`COMMENT ON COLUMN claim_party.line_of_business IS 'Line of business for this liability (LineOfBusiness enum)'`.execute(
		db
	);
	await sql`COMMENT ON COLUMN claim_party.coverage_type IS 'Coverage type category for this liability (LiabilityCoverageType enum)'`.execute(
		db
	);
	await sql`COMMENT ON COLUMN claim_party.paid_recovery IS 'Paid recovery tracked for this specific liability'`.execute(
		db
	);
	await sql`COMMENT ON COLUMN claim_party.reserved_recovery IS 'Reserved recovery tracked for this specific liability'`.execute(
		db
	);
}

export async function down(db: Kysely<any>): Promise<void> {
	// 1. Restore line_of_business to claim table
	await db.schema.alterTable('claim').addColumn('line_of_business', 'text').execute();

	// 2. Migrate line_of_business back to claim (take first alphabetically if multiple distinct values)
	await sql`
		UPDATE claim c
		SET line_of_business = (
			SELECT line_of_business
			FROM claim_party cp
			WHERE cp.claim_id = c.id
			AND cp.line_of_business IS NOT NULL
			AND cp.deleted_at IS NULL
			ORDER BY cp.line_of_business
			LIMIT 1
		)
	`.execute(db);

	// 3. Restore CHECK constraint on claim.line_of_business
	await sql`
		ALTER TABLE claim
		ADD CONSTRAINT claim_line_of_business_check
		CHECK (line_of_business IS NULL OR line_of_business = ANY(ARRAY[
			'auto',
			'property',
			'general_liability',
			'workers_comp',
			'professional_liability'
		]))
	`.execute(db);

	// 4. Restore index on claim.line_of_business
	await db.schema
		.createIndex('idx_claim_line_of_business')
		.on('claim')
		.column('line_of_business')
		.execute();

	// 5. Drop indexes from claim_party
	await db.schema.dropIndex('idx_claim_party_coverage_type').execute();
	await db.schema.dropIndex('idx_claim_party_line_of_business').execute();

	// 6. Drop CHECK constraints from claim_party
	await sql`ALTER TABLE claim_party DROP CONSTRAINT IF EXISTS claim_party_coverage_type_check`.execute(
		db
	);
	await sql`ALTER TABLE claim_party DROP CONSTRAINT IF EXISTS claim_party_line_of_business_check`.execute(
		db
	);

	// 7. Drop columns from claim_party
	await db.schema.alterTable('claim_party').dropColumn('reserved_recovery').execute();

	await db.schema.alterTable('claim_party').dropColumn('paid_recovery').execute();

	await db.schema.alterTable('claim_party').dropColumn('coverage_type').execute();

	await db.schema.alterTable('claim_party').dropColumn('line_of_business').execute();
}
