import { Kysely, sql } from 'kysely';

/**
 * Migration: add_line_of_business_to_claim
 * Created: 2026-01-26T15:32:07.847Z
 *
 * Adds line_of_business column to the claim table.
 * Now supporting a single LOB per claim instead of per-liability aggregation.
 * Values are managed via reference_data tables, so no CHECK constraint.
 */

export async function up(db: Kysely<any>): Promise<void> {
	// Add line_of_business column to claim table
	await db.schema
		.alterTable('claim')
		.addColumn('line_of_business', 'text')
		.execute();

	// Add index for filtering
	await db.schema
		.createIndex('idx_claim_line_of_business')
		.on('claim')
		.column('line_of_business')
		.execute();

	// Add column comment
	await sql`COMMENT ON COLUMN claim.line_of_business IS 'Line of business for this claim (values managed via reference_data)'`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
	// Drop index
	await db.schema.dropIndex('idx_claim_line_of_business').ifExists().execute();

	// Drop column
	await db.schema
		.alterTable('claim')
		.dropColumn('line_of_business')
		.execute();
}
