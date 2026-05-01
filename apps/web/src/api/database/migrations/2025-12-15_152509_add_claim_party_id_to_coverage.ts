import { Kysely, sql } from 'kysely';

/**
 * Migration: add_claim_party_id_to_coverage
 * Created: 2025-12-15T15:25:09.594Z
 *
 * Links coverages to specific claim_party records (Entity-type parties).
 * This enables party-based coverage tracking on the "Claimants & Coverage" tab.
 */

export async function up(db: Kysely<any>): Promise<void> {
	// Add claim_party_id FK to link coverages to specific parties
	await db.schema
		.alterTable('claim_coverage')
		.addColumn('claim_party_id', 'integer', (col) => col.references('claim_party.id'))
		.execute();

	// Add soft delete columns (align with claim_liability pattern)
	await db.schema.alterTable('claim_coverage').addColumn('deleted_at', 'timestamp').execute();

	await db.schema.alterTable('claim_coverage').addColumn('deleted_by', 'text').execute();

	// Index for FK queries (only active coverages)
	await sql`CREATE INDEX idx_claim_coverage_claim_party_id ON claim_coverage(claim_party_id) WHERE deleted_at IS NULL`.execute(
		db
	);
}

export async function down(db: Kysely<any>): Promise<void> {
	// Drop index first
	await sql`DROP INDEX IF EXISTS idx_claim_coverage_claim_party_id`.execute(db);

	// Drop columns
	await db.schema.alterTable('claim_coverage').dropColumn('deleted_by').execute();
	await db.schema.alterTable('claim_coverage').dropColumn('deleted_at').execute();
	await db.schema.alterTable('claim_coverage').dropColumn('claim_party_id').execute();
}
