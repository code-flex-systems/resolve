import { Kysely, sql } from 'kysely';

/**
 * Migration: remove_liability_add_facilitator_fields
 * Created: 2025-12-18T20:43:50.850Z
 *
 * Restructures the liability model:
 * 1. Adds loss_type and policy_limit to claim_party (for facilitators)
 * 2. Drops the claim_liability table entirely
 *
 * This simplifies the model since each facilitator has exactly one loss type
 * and one policy limit (1:1 relationship vs the old 1:N liability model).
 *
 * Data model after migration:
 * - claim_party (entity): liability_percentage (0-100%)
 * - claim_party (facilitator): loss_type, policy_limit
 */

export async function up(db: Kysely<any>): Promise<void> {
	// 1. Add loss_type to claim_party (for facilitators to specify which type of loss they cover)
	await sql`ALTER TABLE claim_party ADD COLUMN loss_type VARCHAR(50)`.execute(db);

	await sql`
		ALTER TABLE claim_party ADD CONSTRAINT claim_party_loss_type_check
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

	// 2. Add policy_limit to claim_party (adverse carrier's max payout)
	await sql`ALTER TABLE claim_party ADD COLUMN policy_limit NUMERIC(15,2)`.execute(db);

	await sql`
		ALTER TABLE claim_party ADD CONSTRAINT claim_party_policy_limit_check
		CHECK (policy_limit IS NULL OR policy_limit >= 0)
	`.execute(db);

	// 3. Create indexes for new columns
	await db.schema
		.createIndex('idx_claim_party_loss_type')
		.on('claim_party')
		.column('loss_type')
		.where(sql.ref('loss_type'), 'is not', null)
		.execute();

	// 4. Add column comments
	await sql`COMMENT ON COLUMN claim_party.loss_type IS 'For facilitators: type of loss this carrier covers (bodily_injury, property_damage, etc.)'`.execute(
		db
	);
	await sql`COMMENT ON COLUMN claim_party.policy_limit IS 'For facilitators: maximum amount the adverse carrier will pay (policy limit)'`.execute(
		db
	);

	// 5. Drop the claim_liability table entirely
	// Note: CASCADE will handle foreign key constraints
	await db.schema.dropTable('claim_liability').cascade().execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	// 1. Recreate the claim_liability table with full structure
	await sql`
		CREATE TABLE claim_liability (
			id SERIAL PRIMARY KEY,
			claim_party_id INTEGER NOT NULL REFERENCES claim_party(id) ON DELETE CASCADE,
			client_id UUID NOT NULL REFERENCES client(id),
			coverage_amount NUMERIC(15,2),
			line_of_business TEXT,
			loss_type TEXT,
			amount_paid NUMERIC(15,2),
			notes TEXT,
			feed_id INTEGER REFERENCES feeds(id),
			external_reference TEXT,
			last_synced_at TIMESTAMPTZ,
			manually_overridden BOOLEAN DEFAULT false,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			created_by UUID REFERENCES users(id),
			updated_at TIMESTAMPTZ,
			updated_by UUID REFERENCES users(id),
			deleted_at TIMESTAMPTZ,
			deleted_by UUID REFERENCES users(id)
		)
	`.execute(db);

	// 2. Add CHECK constraints
	await sql`
		ALTER TABLE claim_liability
		ADD CONSTRAINT claim_liability_coverage_amount_check
		CHECK (coverage_amount IS NULL OR coverage_amount >= 0)
	`.execute(db);

	await sql`
		ALTER TABLE claim_liability
		ADD CONSTRAINT claim_liability_amount_paid_check
		CHECK (amount_paid IS NULL OR amount_paid >= 0)
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

	// 3. Create indexes
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

	// 4. Add column comments
	await sql`COMMENT ON COLUMN claim_liability.feed_id IS 'Which feed sourced this liability'`.execute(
		db
	);
	await sql`COMMENT ON COLUMN claim_liability.external_reference IS 'External ID from source system (for upsert logic)'`.execute(
		db
	);
	await sql`COMMENT ON COLUMN claim_liability.last_synced_at IS 'When feed last updated this record'`.execute(
		db
	);
	await sql`COMMENT ON COLUMN claim_liability.manually_overridden IS 'User edited after feed sync - prevents feed overwrites'`.execute(
		db
	);

	// 5. Drop loss_type and policy_limit from claim_party
	await db.schema.dropIndex('idx_claim_party_loss_type').ifExists().execute();

	await sql`ALTER TABLE claim_party DROP CONSTRAINT IF EXISTS claim_party_loss_type_check`.execute(
		db
	);
	await sql`ALTER TABLE claim_party DROP CONSTRAINT IF EXISTS claim_party_policy_limit_check`.execute(
		db
	);

	await db.schema.alterTable('claim_party').dropColumn('loss_type').execute();
	await db.schema.alterTable('claim_party').dropColumn('policy_limit').execute();
}
