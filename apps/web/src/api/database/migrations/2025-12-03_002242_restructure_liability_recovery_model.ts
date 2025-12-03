import { Kysely, sql } from 'kysely';

/**
 * Migration: restructure_liability_recovery_model
 * Created: 2025-12-03T00:22:42.599Z
 *
 * Restructures the liability and recovery data model:
 * 1. Moves liability_percentage from claim_liability to claim_party
 * 2. Renames paid_recovery to amount_paid on claim_liability
 * 3. Removes reserved_recovery from claim_liability
 * 4. Adds amount_reserved to claim_coverage
 *
 * Note: Both expected_recovery and total_incurred are kept as cached calculated fields on claim:
 * - expected_recovery: updated when party liability_percentage or liability amount_paid changes
 * - total_incurred: updated when coverage amount_reserved changes (sum of all coverage reserves)
 */

export async function up(db: Kysely<any>): Promise<void> {
	// 1. Add liability_percentage to claim_party
	await sql`ALTER TABLE claim_party ADD COLUMN liability_percentage NUMERIC(5,2)`.execute(db);

	await sql`
		ALTER TABLE claim_party ADD CONSTRAINT claim_party_liability_percentage_check
		CHECK (liability_percentage IS NULL OR (liability_percentage >= 0 AND liability_percentage <= 100))
	`.execute(db);

	// Migrate existing data: sum liabilities' percentages for each claim_party
	await sql`
		UPDATE claim_party cp SET liability_percentage = (
			SELECT COALESCE(SUM(cl.liability_percentage), 0)
			FROM claim_liability cl
			WHERE cl.claim_party_id = cp.id AND cl.deleted_at IS NULL
		)
	`.execute(db);

	// 2. Rename paid_recovery to amount_paid on claim_liability
	await sql`ALTER TABLE claim_liability RENAME COLUMN paid_recovery TO amount_paid`.execute(db);

	// 3. Remove reserved_recovery from claim_liability
	await db.schema.alterTable('claim_liability').dropColumn('reserved_recovery').execute();

	// 4. Drop liability_percentage from claim_liability (data already migrated)
	await sql`ALTER TABLE claim_liability DROP CONSTRAINT IF EXISTS claim_liability_liability_check`.execute(db);
	await db.schema.alterTable('claim_liability').dropColumn('liability_percentage').execute();

	// 5. Add amount_reserved to claim_coverage
	await sql`ALTER TABLE claim_coverage ADD COLUMN amount_reserved NUMERIC(15,2)`.execute(db);

	// Note: total_incurred is kept as a cached calculated field on claim,
	// updated transactionally when coverage amount_reserved changes.
}

export async function down(db: Kysely<any>): Promise<void> {
	// 5. Remove amount_reserved from claim_coverage
	await db.schema.alterTable('claim_coverage').dropColumn('amount_reserved').execute();

	// 4. Restore liability_percentage to claim_liability
	await sql`ALTER TABLE claim_liability ADD COLUMN liability_percentage NUMERIC(5,2)`.execute(db);

	await sql`
		ALTER TABLE claim_liability ADD CONSTRAINT claim_liability_liability_check
		CHECK (liability_percentage IS NULL OR (liability_percentage >= 0 AND liability_percentage <= 100))
	`.execute(db);

	// Migrate data back from claim_party to claim_liability (set all liabilities to party's percentage)
	await sql`
		UPDATE claim_liability cl SET liability_percentage = (
			SELECT cp.liability_percentage
			FROM claim_party cp
			WHERE cp.id = cl.claim_party_id
		)
	`.execute(db);

	// 3. Restore reserved_recovery to claim_liability
	await sql`ALTER TABLE claim_liability ADD COLUMN reserved_recovery NUMERIC(12,2)`.execute(db);

	// 2. Rename amount_paid back to paid_recovery
	await sql`ALTER TABLE claim_liability RENAME COLUMN amount_paid TO paid_recovery`.execute(db);

	// 1. Remove liability_percentage from claim_party
	await sql`ALTER TABLE claim_party DROP CONSTRAINT IF EXISTS claim_party_liability_percentage_check`.execute(db);
	await db.schema.alterTable('claim_party').dropColumn('liability_percentage').execute();
}
