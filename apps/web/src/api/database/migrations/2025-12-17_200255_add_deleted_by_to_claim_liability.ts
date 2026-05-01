import { Kysely, sql } from 'kysely';

/**
 * Migration: add_deleted_by_to_claim_liability
 * Created: 2025-12-17T20:02:55.223Z
 */

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema.alterTable('claim_liability').addColumn('deleted_by', 'uuid').execute();

	// Add foreign key constraint
	await sql`ALTER TABLE claim_liability ADD CONSTRAINT claim_liability_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id)`.execute(
		db
	);
}

export async function down(db: Kysely<any>): Promise<void> {
	await sql`ALTER TABLE claim_liability DROP CONSTRAINT IF EXISTS claim_liability_deleted_by_fkey`.execute(
		db
	);
	await db.schema.alterTable('claim_liability').dropColumn('deleted_by').execute();
}
