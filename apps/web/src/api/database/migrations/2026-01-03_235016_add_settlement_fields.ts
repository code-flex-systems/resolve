import { Kysely, sql } from 'kysely';

/**
 * Migration: add_settlement_fields
 * Created: 2026-01-03T23:50:16.669Z
 *
 * Adds new fields to settlement table:
 * - adverse_party_reference: Adverse party's claim/reference number
 * - settlement_structure: 'lump_sum' or 'payment_plan'
 * - payment_amount: Per-installment amount for payment plans
 * - payment_frequency: weekly/bi_weekly/monthly/quarterly
 * - settled_by: FK to users table (who achieved the settlement)
 * - is_drop_check: Boolean for when adverse party issued check without direct contact
 */

export async function up(db: Kysely<any>): Promise<void> {
	// Add new columns
	await db.schema
		.alterTable('settlement')
		.addColumn('adverse_party_reference', 'varchar(255)')
		.execute();

	await db.schema
		.alterTable('settlement')
		.addColumn('settlement_structure', 'varchar(20)', (col) => col.defaultTo('lump_sum'))
		.execute();

	await db.schema
		.alterTable('settlement')
		.addColumn('payment_amount', 'numeric(15, 2)')
		.execute();

	await db.schema
		.alterTable('settlement')
		.addColumn('payment_frequency', 'varchar(20)')
		.execute();

	await db.schema
		.alterTable('settlement')
		.addColumn('settled_by', 'uuid', (col) => col.references('users.id'))
		.execute();

	await db.schema
		.alterTable('settlement')
		.addColumn('is_drop_check', 'boolean', (col) => col.defaultTo(false))
		.execute();

	// Add CHECK constraint for settlement_structure values
	await sql`
		ALTER TABLE settlement
		ADD CONSTRAINT settlement_structure_check
		CHECK (settlement_structure IS NULL OR settlement_structure IN ('lump_sum', 'payment_plan'))
	`.execute(db);

	// Add CHECK constraint for payment_frequency values
	await sql`
		ALTER TABLE settlement
		ADD CONSTRAINT payment_frequency_check
		CHECK (payment_frequency IS NULL OR payment_frequency IN ('weekly', 'bi_weekly', 'monthly', 'quarterly'))
	`.execute(db);

	// Add CHECK constraint: if settlement_structure = 'payment_plan', payment fields are required
	await sql`
		ALTER TABLE settlement
		ADD CONSTRAINT payment_plan_fields_check
		CHECK (
			settlement_structure != 'payment_plan'
			OR (payment_amount IS NOT NULL AND payment_frequency IS NOT NULL)
		)
	`.execute(db);

	// Add CHECK constraint: settled_by and is_drop_check are mutually exclusive
	await sql`
		ALTER TABLE settlement
		ADD CONSTRAINT settled_by_drop_check_exclusive
		CHECK (
			NOT (settled_by IS NOT NULL AND is_drop_check = true)
		)
	`.execute(db);

	// Add index for settled_by (for filtering/reporting)
	await sql`
		CREATE INDEX idx_settlement_settled_by ON settlement(settled_by) WHERE settled_by IS NOT NULL
	`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
	// Drop index
	await sql`DROP INDEX IF EXISTS idx_settlement_settled_by`.execute(db);

	// Drop CHECK constraints
	await sql`ALTER TABLE settlement DROP CONSTRAINT IF EXISTS settled_by_drop_check_exclusive`.execute(db);
	await sql`ALTER TABLE settlement DROP CONSTRAINT IF EXISTS payment_plan_fields_check`.execute(db);
	await sql`ALTER TABLE settlement DROP CONSTRAINT IF EXISTS payment_frequency_check`.execute(db);
	await sql`ALTER TABLE settlement DROP CONSTRAINT IF EXISTS settlement_structure_check`.execute(db);

	// Drop columns
	await db.schema.alterTable('settlement').dropColumn('is_drop_check').execute();
	await db.schema.alterTable('settlement').dropColumn('settled_by').execute();
	await db.schema.alterTable('settlement').dropColumn('payment_frequency').execute();
	await db.schema.alterTable('settlement').dropColumn('payment_amount').execute();
	await db.schema.alterTable('settlement').dropColumn('settlement_structure').execute();
	await db.schema.alterTable('settlement').dropColumn('adverse_party_reference').execute();
}
