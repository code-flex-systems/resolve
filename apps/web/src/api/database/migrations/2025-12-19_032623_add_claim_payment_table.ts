import { Kysely, sql } from 'kysely';

/**
 * Migration: add_claim_payment_table
 * Created: 2025-12-19T03:26:23.851Z
 *
 * Creates the claim_payment table for tracking payments made by the insurance company
 * on claims. These are outgoing payments TO insured parties, vendors, and service providers.
 */

export async function up(db: Kysely<any>): Promise<void> {
	// Create claim_payment table using raw SQL for numeric types with precision
	await sql`
		CREATE TABLE claim_payment (
			id SERIAL PRIMARY KEY,
			client_id UUID NOT NULL REFERENCES client(id),
			claim_id INTEGER NOT NULL REFERENCES claim(id) ON DELETE CASCADE,
			coverage_id INTEGER NOT NULL REFERENCES claim_coverage(id),

			-- Core payment fields
			payment_date DATE NOT NULL,
			payment_amount NUMERIC(15,2) NOT NULL,
			is_subrogable BOOLEAN NOT NULL DEFAULT true,
			is_expense BOOLEAN NOT NULL DEFAULT false,

			-- Optional fields
			payee_claim_party_id INTEGER REFERENCES claim_party(id),
			description TEXT,

			-- Data feed fields (for future processing)
			external_reference VARCHAR(100),
			feed_id VARCHAR(100),
			payment_code VARCHAR(50),
			manually_overridden BOOLEAN DEFAULT false,

			-- Audit fields
			created_by UUID NOT NULL REFERENCES users(id),
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_by UUID REFERENCES users(id),
			updated_at TIMESTAMPTZ,
			deleted_at TIMESTAMPTZ,
			deleted_by UUID REFERENCES users(id)
		)
	`.execute(db);

	// Add indexes
	await db.schema
		.createIndex('idx_claim_payment_client')
		.on('claim_payment')
		.column('client_id')
		.execute();
	await db.schema
		.createIndex('idx_claim_payment_claim')
		.on('claim_payment')
		.column('claim_id')
		.execute();
	await db.schema
		.createIndex('idx_claim_payment_coverage')
		.on('claim_payment')
		.column('coverage_id')
		.execute();
	await db.schema
		.createIndex('idx_claim_payment_payee')
		.on('claim_payment')
		.column('payee_claim_party_id')
		.execute();

	// Partial index for active (non-deleted) payments - optimizes common queries
	await sql`CREATE INDEX idx_claim_payment_active ON claim_payment (claim_id, client_id) WHERE deleted_at IS NULL`.execute(
		db
	);
}

export async function down(db: Kysely<any>): Promise<void> {
	// Drop claim_payment table (indexes will be dropped automatically)
	await db.schema.dropTable('claim_payment').execute();
}
