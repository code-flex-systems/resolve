import { Kysely, sql } from 'kysely';

/**
 * Migration: add_lob_and_loss_type
 * Created: 2025-11-14T19:45:30.817Z
 */

export async function up(db: Kysely<any>): Promise<void> {
	// Add line_of_business field
	await db.schema
		.alterTable('claim')
		.addColumn('line_of_business', 'text')
		.execute();

	// Add loss_type field
	await db.schema
		.alterTable('claim')
		.addColumn('loss_type', 'text')
		.execute();

	// Add CHECK constraint for line_of_business
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

	// Add CHECK constraint for loss_type
	await sql`
		ALTER TABLE claim
		ADD CONSTRAINT claim_loss_type_check
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

	// Add indexes for filtering/reporting
	await db.schema
		.createIndex('idx_claim_line_of_business')
		.on('claim')
		.column('line_of_business')
		.execute();

	await db.schema
		.createIndex('idx_claim_loss_type')
		.on('claim')
		.column('loss_type')
		.execute();

	// Add column comments
	await sql`COMMENT ON COLUMN claim.line_of_business IS 'Line of business for the claim (LineOfBusiness enum enforced in TypeScript)'`.execute(db);
	await sql`COMMENT ON COLUMN claim.loss_type IS 'Type of loss for the claim (LossType enum enforced in TypeScript)'`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
	// Drop indexes
	await db.schema.dropIndex('idx_claim_loss_type').execute();
	await db.schema.dropIndex('idx_claim_line_of_business').execute();

	// Drop CHECK constraints
	await sql`ALTER TABLE claim DROP CONSTRAINT IF EXISTS claim_loss_type_check`.execute(db);
	await sql`ALTER TABLE claim DROP CONSTRAINT IF EXISTS claim_line_of_business_check`.execute(db);

	// Drop columns
	await db.schema
		.alterTable('claim')
		.dropColumn('loss_type')
		.execute();

	await db.schema
		.alterTable('claim')
		.dropColumn('line_of_business')
		.execute();
}
