import { Kysely, sql } from 'kysely';

/**
 * Migration: add_coverage_subrogation_fields
 * Created: 2025-12-23T01:27:21.766Z
 */

export async function up(db: Kysely<any>): Promise<void> {
	// Add deductible_amount column
	await db.schema
		.alterTable('claim_coverage')
		.addColumn('deductible_amount', sql`numeric(15,2)`)
		.execute();

	// Add deductible_status column with default
	await db.schema
		.alterTable('claim_coverage')
		.addColumn('deductible_status', 'text', (col) =>
			col.notNull().defaultTo('not_confirmed')
		)
		.execute();

	// Add CHECK constraint for deductible_status
	await sql`
		ALTER TABLE claim_coverage
		ADD CONSTRAINT check_deductible_status
		CHECK (deductible_status IN (
			'not_confirmed',
			'applies',
			'waived',
			'reimbursed_by_client',
			'reimbursed_by_adverse',
			'no_deductible'
		))
	`.execute(db);

	// Add subro_applicable column with default
	await db.schema
		.alterTable('claim_coverage')
		.addColumn('subro_applicable', 'boolean', (col) =>
			col.notNull().defaultTo(false)
		)
		.execute();

	// Add statute_date column
	await db.schema
		.alterTable('claim_coverage')
		.addColumn('statute_date', 'date')
		.execute();

	// Add statute_preserved column with default
	await db.schema
		.alterTable('claim_coverage')
		.addColumn('statute_preserved', 'boolean', (col) =>
			col.notNull().defaultTo(false)
		)
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	// Drop CHECK constraint first
	await sql`
		ALTER TABLE claim_coverage
		DROP CONSTRAINT check_deductible_status
	`.execute(db);

	// Drop columns in reverse order
	await db.schema
		.alterTable('claim_coverage')
		.dropColumn('statute_preserved')
		.execute();

	await db.schema
		.alterTable('claim_coverage')
		.dropColumn('statute_date')
		.execute();

	await db.schema
		.alterTable('claim_coverage')
		.dropColumn('subro_applicable')
		.execute();

	await db.schema
		.alterTable('claim_coverage')
		.dropColumn('deductible_status')
		.execute();

	await db.schema
		.alterTable('claim_coverage')
		.dropColumn('deductible_amount')
		.execute();
}
