import { Kysely, sql } from 'kysely';

/**
 * Migration: add_settlement_table
 * Created: 2025-12-18T03:53:31.016Z
 *
 * Creates the settlement table for tracking demands sent to adverse carriers.
 * Settlements are parent entities to recovery_event - every recovery must
 * reference a settlement.
 */

export async function up(db: Kysely<any>): Promise<void> {
	// Step 1: Clear existing recovery events (not in production, only test data)
	await sql`DELETE FROM recovery_event`.execute(db);

	// Step 2: Create settlement table using raw SQL for numeric types with precision
	await sql`
		CREATE TABLE settlement (
			id SERIAL PRIMARY KEY,
			client_id UUID NOT NULL REFERENCES client(id),
			claim_id INTEGER NOT NULL REFERENCES claim(id) ON DELETE CASCADE,
			claim_party_id INTEGER NOT NULL REFERENCES claim_party(id),
			coverage_id INTEGER NOT NULL REFERENCES claim_coverage(id),

			-- Demand phase
			demand_amount NUMERIC(15,2) NOT NULL,
			demand_date DATE NOT NULL,

			-- Settlement phase (nullable until settled)
			agreed_liability_percentage NUMERIC(5,2),
			settlement_amount NUMERIC(15,2),
			settlement_date DATE,

			-- Status
			status VARCHAR NOT NULL DEFAULT 'sent',

			-- Standard fields
			notes TEXT,
			created_by UUID NOT NULL REFERENCES users(id),
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_by UUID REFERENCES users(id),
			updated_at TIMESTAMPTZ
		)
	`.execute(db);

	// Add constraint for agreed_liability_percentage
	await sql`
		ALTER TABLE settlement
		ADD CONSTRAINT settlement_agreed_liability_percentage_check
		CHECK (agreed_liability_percentage IS NULL OR (agreed_liability_percentage >= 0 AND agreed_liability_percentage <= 100))
	`.execute(db);

	// Step 3: Add indexes for settlement
	await db.schema.createIndex('idx_settlement_client').on('settlement').column('client_id').execute();
	await db.schema.createIndex('idx_settlement_claim').on('settlement').column('claim_id').execute();
	await db.schema.createIndex('idx_settlement_party').on('settlement').column('claim_party_id').execute();
	await db.schema.createIndex('idx_settlement_coverage').on('settlement').column('coverage_id').execute();
	await db.schema.createIndex('idx_settlement_status').on('settlement').column('status').execute();

	// Step 4: Drop coverage_id from recovery_event (if exists from earlier testing)
	await sql`DROP INDEX IF EXISTS idx_recovery_event_coverage_id`.execute(db);

	const hasColumn = await sql`
		SELECT column_name
		FROM information_schema.columns
		WHERE table_name = 'recovery_event' AND column_name = 'coverage_id'
	`.execute(db);

	if (hasColumn.rows.length > 0) {
		await db.schema.alterTable('recovery_event').dropColumn('coverage_id').execute();
	}

	// Step 5: Add settlement_id to recovery_event (NOT NULL since all recovery events require a settlement)
	await db.schema
		.alterTable('recovery_event')
		.addColumn('settlement_id', 'integer', (col) => col.notNull().references('settlement.id').onDelete('cascade'))
		.execute();

	// Add index for settlement_id
	await db.schema
		.createIndex('idx_recovery_event_settlement')
		.on('recovery_event')
		.column('settlement_id')
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	// Drop settlement_id from recovery_event
	await sql`DROP INDEX IF EXISTS idx_recovery_event_settlement`.execute(db);
	await db.schema.alterTable('recovery_event').dropColumn('settlement_id').execute();

	// Drop settlement table (indexes will be dropped automatically)
	await db.schema.dropTable('settlement').execute();
}
