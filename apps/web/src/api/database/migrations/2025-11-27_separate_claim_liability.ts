import { Kysely, sql } from 'kysely';

/**
 * Migration: separate_claim_liability
 * Created: 2025-11-27T00:00:00.000Z
 *
 * Separates liability data from party relationship data:
 * - Creates claim_liability table for one-to-many liability tracking
 * - Adds source tracking fields for feed integration (feed_id, external_reference, manually_overridden)
 * - Adds external_reference to claim_party for feed matching
 * - Migrates existing liability data from claim_party to claim_liability
 * - Removes unique constraint on claim_party to allow multiple liabilities per party
 * - Drops paid_recovery and reserved_recovery from claim table (calculate from liabilities)
 * - Replaces coverage_type with loss_type (reuses LossType enum)
 */

export async function up(db: Kysely<any>): Promise<void> {
	// 1. Add external_reference to claim_party for feed matching
	await db.schema
		.alterTable('claim_party')
		.addColumn('external_reference', 'text')
		.execute();

	await db.schema
		.createIndex('idx_claim_party_external_ref')
		.on('claim_party')
		.column('external_reference')
		.where(sql.ref('external_reference'), 'is not', null)
		.execute();

	// 2. Create claim_liability table
	await db.schema
		.createTable('claim_liability')
		.addColumn('id', 'serial', (col) => col.primaryKey())
		.addColumn('claim_party_id', 'integer', (col) =>
			col.notNull().references('claim_party.id').onDelete('cascade')
		)
		.addColumn('client_id', 'uuid', (col) =>
			col.notNull().references('client.id')
		)
		// Liability fields
		.addColumn('liability_percentage', 'numeric(5,2)')
		.addColumn('coverage_amount', 'numeric(12,2)')
		.addColumn('line_of_business', 'text')
		.addColumn('loss_type', 'text')
		.addColumn('paid_recovery', 'numeric(12,2)')
		.addColumn('reserved_recovery', 'numeric(12,2)')
		.addColumn('notes', 'text')
		// Source tracking for feed integration
		.addColumn('feed_id', 'integer', (col) => col.references('feeds.id'))
		.addColumn('external_reference', 'text')
		.addColumn('last_synced_at', 'timestamptz')
		.addColumn('manually_overridden', 'boolean', (col) => col.defaultTo(false))
		// Audit fields
		.addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
		.addColumn('created_by', 'uuid', (col) => col.references('users.id'))
		.addColumn('updated_at', 'timestamptz')
		.addColumn('updated_by', 'uuid', (col) => col.references('users.id'))
		.execute();

	// 3. Add CHECK constraints
	await sql`
		ALTER TABLE claim_liability
		ADD CONSTRAINT claim_liability_percentage_check
		CHECK (liability_percentage IS NULL OR (liability_percentage >= 0 AND liability_percentage <= 100))
	`.execute(db);

	await sql`
		ALTER TABLE claim_liability
		ADD CONSTRAINT claim_liability_coverage_amount_check
		CHECK (coverage_amount IS NULL OR coverage_amount >= 0)
	`.execute(db);

	await sql`
		ALTER TABLE claim_liability
		ADD CONSTRAINT claim_liability_paid_recovery_check
		CHECK (paid_recovery IS NULL OR paid_recovery >= 0)
	`.execute(db);

	await sql`
		ALTER TABLE claim_liability
		ADD CONSTRAINT claim_liability_reserved_recovery_check
		CHECK (reserved_recovery IS NULL OR reserved_recovery >= 0)
	`.execute(db);

	await sql`
		ALTER TABLE claim_liability
		ADD CONSTRAINT claim_liability_line_of_business_check
		CHECK (line_of_business IS NULL OR line_of_business = ANY(ARRAY[
			'auto',
			'property',
			'general_liability',
			'workers_comp',
			'professional_liability'
		]))
	`.execute(db);

	await sql`
		ALTER TABLE claim_liability
		ADD CONSTRAINT claim_liability_loss_type_check
		CHECK (loss_type IS NULL OR loss_type = ANY(ARRAY[
			'collision',
			'comprehensive',
			'fire',
			'theft',
			'water_damage',
			'wind',
			'vandalism',
			'bodily_injury',
			'property_damage',
			'uninsured_motorist',
			'medical_payments',
			'personal_injury_protection',
			'other'
		]))
	`.execute(db);

	// 4. Create indexes
	await db.schema
		.createIndex('idx_claim_liability_claim_party')
		.on('claim_liability')
		.column('claim_party_id')
		.execute();

	await db.schema
		.createIndex('idx_claim_liability_client')
		.on('claim_liability')
		.column('client_id')
		.execute();

	await db.schema
		.createIndex('idx_claim_liability_feed')
		.on('claim_liability')
		.column('feed_id')
		.where(sql.ref('feed_id'), 'is not', null)
		.execute();

	await db.schema
		.createIndex('idx_claim_liability_external_ref')
		.on('claim_liability')
		.column('external_reference')
		.where(sql.ref('external_reference'), 'is not', null)
		.execute();

	await db.schema
		.createIndex('idx_claim_liability_lob')
		.on('claim_liability')
		.column('line_of_business')
		.where(sql.ref('line_of_business'), 'is not', null)
		.execute();

	await db.schema
		.createIndex('idx_claim_liability_loss_type')
		.on('claim_liability')
		.column('loss_type')
		.where(sql.ref('loss_type'), 'is not', null)
		.execute();

	// 5. Migrate existing liability data from claim_party to claim_liability
	await sql`
		INSERT INTO claim_liability (
			claim_party_id,
			client_id,
			liability_percentage,
			coverage_amount,
			line_of_business,
			loss_type,
			paid_recovery,
			reserved_recovery,
			created_at,
			created_by,
			feed_id,
			manually_overridden
		)
		SELECT
			cp.id,
			c.client_id,
			cp.liability_percentage,
			cp.coverage_amount,
			cp.line_of_business,
			cp.coverage_type,  -- Map coverage_type to loss_type
			cp.paid_recovery,
			cp.reserved_recovery,
			cp.created_at,
			cp.created_by,
			c.feed_id,  -- Inherit feed_id from claim
			false  -- Assume existing data is manual
		FROM claim_party cp
		INNER JOIN claim c ON c.id = cp.claim_id
		WHERE cp.deleted_at IS NULL
		AND (
			cp.liability_percentage IS NOT NULL
			OR cp.coverage_amount IS NOT NULL
			OR cp.line_of_business IS NOT NULL
			OR cp.coverage_type IS NOT NULL
			OR cp.paid_recovery IS NOT NULL
			OR cp.reserved_recovery IS NOT NULL
		)
	`.execute(db);

	// 6. Drop indexes before dropping columns
	await db.schema.dropIndex('idx_claim_party_line_of_business').ifExists().execute();
	await db.schema.dropIndex('idx_claim_party_coverage_type').ifExists().execute();

	// 7. Drop CHECK constraints from claim_party
	await sql`ALTER TABLE claim_party DROP CONSTRAINT IF EXISTS claim_party_line_of_business_check`.execute(db);
	await sql`ALTER TABLE claim_party DROP CONSTRAINT IF EXISTS claim_party_coverage_type_check`.execute(db);

	// 8. Drop liability columns from claim_party
	await db.schema
		.alterTable('claim_party')
		.dropColumn('liability_percentage')
		.execute();

	await db.schema
		.alterTable('claim_party')
		.dropColumn('coverage_amount')
		.execute();

	await db.schema
		.alterTable('claim_party')
		.dropColumn('line_of_business')
		.execute();

	await db.schema
		.alterTable('claim_party')
		.dropColumn('coverage_type')
		.execute();

	await db.schema
		.alterTable('claim_party')
		.dropColumn('paid_recovery')
		.execute();

	await db.schema
		.alterTable('claim_party')
		.dropColumn('reserved_recovery')
		.execute();

	// 9. Drop unique constraint from claim_party (allows multiple liabilities per party-role)
	await sql`ALTER TABLE claim_party DROP CONSTRAINT IF EXISTS unique_claim_party_role`.execute(db);

	// 10. Drop paid_recovery and reserved_recovery from claim table (calculate from liabilities instead)
	await db.schema
		.alterTable('claim')
		.dropColumn('paid_recovery')
		.ifExists()
		.execute();

	await db.schema
		.alterTable('claim')
		.dropColumn('reserved_recovery')
		.ifExists()
		.execute();

	// 11. Add column comments
	await sql`COMMENT ON COLUMN claim_party.external_reference IS 'External ID from source system for feed matching'`.execute(db);
	await sql`COMMENT ON COLUMN claim_liability.feed_id IS 'Which feed sourced this liability'`.execute(db);
	await sql`COMMENT ON COLUMN claim_liability.external_reference IS 'External ID from source system (for upsert logic)'`.execute(db);
	await sql`COMMENT ON COLUMN claim_liability.last_synced_at IS 'When feed last updated this record'`.execute(db);
	await sql`COMMENT ON COLUMN claim_liability.manually_overridden IS 'User edited after feed sync - prevents feed overwrites'`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
	// 1. Restore paid_recovery and reserved_recovery to claim table
	await db.schema
		.alterTable('claim')
		.addColumn('paid_recovery', 'numeric')
		.execute();

	await db.schema
		.alterTable('claim')
		.addColumn('reserved_recovery', 'numeric')
		.execute();

	// 2. Restore unique constraint on claim_party
	await sql`
		ALTER TABLE claim_party
		ADD CONSTRAINT unique_claim_party_role
		UNIQUE (claim_id, party_id, role)
	`.execute(db);

	// 3. Restore liability columns to claim_party
	await db.schema
		.alterTable('claim_party')
		.addColumn('liability_percentage', 'numeric(5,2)')
		.execute();

	await db.schema
		.alterTable('claim_party')
		.addColumn('coverage_amount', 'numeric(12,2)')
		.execute();

	await db.schema
		.alterTable('claim_party')
		.addColumn('line_of_business', 'text')
		.execute();

	await db.schema
		.alterTable('claim_party')
		.addColumn('coverage_type', 'text')
		.execute();

	await db.schema
		.alterTable('claim_party')
		.addColumn('paid_recovery', 'numeric(12,2)')
		.execute();

	await db.schema
		.alterTable('claim_party')
		.addColumn('reserved_recovery', 'numeric(12,2)')
		.execute();

	// 4. Restore CHECK constraints
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

	// 5. Migrate first liability back to claim_party (DISTINCT ON to handle multiple liabilities)
	await sql`
		UPDATE claim_party cp
		SET
			liability_percentage = cl.liability_percentage,
			coverage_amount = cl.coverage_amount,
			line_of_business = cl.line_of_business,
			coverage_type = cl.loss_type,  -- Map loss_type back to coverage_type
			paid_recovery = cl.paid_recovery,
			reserved_recovery = cl.reserved_recovery
		FROM (
			SELECT DISTINCT ON (claim_party_id)
				claim_party_id,
				liability_percentage,
				coverage_amount,
				line_of_business,
				loss_type,
				paid_recovery,
				reserved_recovery
			FROM claim_liability
			ORDER BY claim_party_id, created_at
		) cl
		WHERE cp.id = cl.claim_party_id
	`.execute(db);

	// 6. Restore indexes
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

	// 7. Drop external_reference from claim_party
	await db.schema.dropIndex('idx_claim_party_external_ref').ifExists().execute();

	await db.schema
		.alterTable('claim_party')
		.dropColumn('external_reference')
		.execute();

	// 8. Drop claim_liability table (cascade will handle references)
	await db.schema.dropTable('claim_liability').cascade().execute();
}
