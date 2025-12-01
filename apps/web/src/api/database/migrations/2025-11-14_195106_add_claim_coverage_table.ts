import { Kysely, sql } from 'kysely';

/**
 * Migration: add_claim_coverage_table
 * Created: 2025-11-14T19:51:06.355Z
 */

export async function up(db: Kysely<any>): Promise<void> {
	// Create claim_coverage table
	await sql`
		CREATE TABLE claim_coverage (
			id SERIAL PRIMARY KEY,
			claim_id INTEGER NOT NULL,
			client_id UUID NOT NULL,
			coverage_type TEXT NOT NULL,
			coverage_amount NUMERIC(15, 2),
			created_by UUID,
			created_at TIMESTAMP DEFAULT now(),
			updated_by UUID,
			updated_at TIMESTAMP
		)
	`.execute(db);

	// Add foreign key constraint to claim table
	await sql`
		ALTER TABLE claim_coverage
		ADD CONSTRAINT claim_coverage_claim_id_fkey
		FOREIGN KEY (claim_id) REFERENCES claim(id) ON DELETE CASCADE
	`.execute(db);

	// Add foreign key constraint to users table for created_by
	await db.schema
		.alterTable('claim_coverage')
		.addForeignKeyConstraint('claim_coverage_created_by_fkey', ['created_by'], 'users', ['id'])
		.execute();

	// Add foreign key constraint to users table for updated_by
	await db.schema
		.alterTable('claim_coverage')
		.addForeignKeyConstraint('claim_coverage_updated_by_fkey', ['updated_by'], 'users', ['id'])
		.execute();

	// Add CHECK constraint for coverage_type
	await sql`
		ALTER TABLE claim_coverage
		ADD CONSTRAINT claim_coverage_coverage_type_check
		CHECK (coverage_type = ANY(ARRAY[
			'collision',
			'comprehensive',
			'liability',
			'uninsured_motorist',
			'medical_payments',
			'personal_injury_protection',
			'dwelling',
			'personal_property',
			'loss_of_use',
			'other'
		]))
	`.execute(db);

	// Add indexes for performance
	await db.schema.createIndex('idx_claim_coverage_claim_id').on('claim_coverage').column('claim_id').execute();

	await db.schema
		.createIndex('idx_claim_coverage_client_id')
		.on('claim_coverage')
		.column('client_id')
		.execute();

	// Add column comment
	await sql`COMMENT ON COLUMN claim_coverage.coverage_type IS 'Type of coverage (CoverageType enum enforced in TypeScript)'`.execute(
		db
	);
	await sql`COMMENT ON TABLE claim_coverage IS 'Tracks coverage types and amounts for each claim'`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
	// Drop the table (cascades to foreign keys and indexes)
	await db.schema.dropTable('claim_coverage').execute();
}
