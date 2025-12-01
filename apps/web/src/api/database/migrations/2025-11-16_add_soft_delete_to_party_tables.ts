import { Kysely, sql } from 'kysely';

/**
 * Migration: add_soft_delete_to_party_tables
 * Created: 2025-11-16T00:00:00.000Z
 *
 * Adds soft delete support to party, party_office, and party_representative tables.
 * Must run BEFORE 2025-11-17_add_deleted_at_to_claim_party.ts
 */

export async function up(db: Kysely<any>): Promise<void> {
	// Add deleted_at and deleted_by to party table
	await db.schema
		.alterTable('party')
		.addColumn('deleted_at', 'timestamptz')
		.execute();

	await db.schema
		.alterTable('party')
		.addColumn('deleted_by', 'uuid')
		.execute();

	await db.schema
		.alterTable('party')
		.addForeignKeyConstraint(
			'party_deleted_by_fkey',
			['deleted_by'],
			'users',
			['id']
		)
		.onDelete('set null')
		.execute();

	// Add deleted_at and deleted_by to party_office table
	await db.schema
		.alterTable('party_office')
		.addColumn('deleted_at', 'timestamptz')
		.execute();

	await db.schema
		.alterTable('party_office')
		.addColumn('deleted_by', 'uuid')
		.execute();

	await db.schema
		.alterTable('party_office')
		.addForeignKeyConstraint(
			'party_office_deleted_by_fkey',
			['deleted_by'],
			'users',
			['id']
		)
		.onDelete('set null')
		.execute();

	// Add deleted_at and deleted_by to party_representative table
	await db.schema
		.alterTable('party_representative')
		.addColumn('deleted_at', 'timestamptz')
		.execute();

	await db.schema
		.alterTable('party_representative')
		.addColumn('deleted_by', 'uuid')
		.execute();

	await db.schema
		.alterTable('party_representative')
		.addForeignKeyConstraint(
			'party_representative_deleted_by_fkey',
			['deleted_by'],
			'users',
			['id']
		)
		.onDelete('set null')
		.execute();

	// Add column comments
	await sql`COMMENT ON COLUMN party.deleted_at IS 'Soft delete timestamp - party is archived when not null'`.execute(db);
	await sql`COMMENT ON COLUMN party.deleted_by IS 'Email of user who archived this party'`.execute(db);
	await sql`COMMENT ON COLUMN party_office.deleted_at IS 'Soft delete timestamp - cascades from party deletion'`.execute(db);
	await sql`COMMENT ON COLUMN party_office.deleted_by IS 'Email of user who archived this office'`.execute(db);
	await sql`COMMENT ON COLUMN party_representative.deleted_at IS 'Soft delete timestamp - cascades from party deletion'`.execute(db);
	await sql`COMMENT ON COLUMN party_representative.deleted_by IS 'Email of user who archived this representative'`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
	// Drop foreign key constraints
	await db.schema
		.alterTable('party_representative')
		.dropConstraint('party_representative_deleted_by_fkey')
		.execute();

	await db.schema
		.alterTable('party_office')
		.dropConstraint('party_office_deleted_by_fkey')
		.execute();

	await db.schema
		.alterTable('party')
		.dropConstraint('party_deleted_by_fkey')
		.execute();

	// Drop columns from party_representative
	await db.schema
		.alterTable('party_representative')
		.dropColumn('deleted_by')
		.execute();

	await db.schema
		.alterTable('party_representative')
		.dropColumn('deleted_at')
		.execute();

	// Drop columns from party_office
	await db.schema
		.alterTable('party_office')
		.dropColumn('deleted_by')
		.execute();

	await db.schema
		.alterTable('party_office')
		.dropColumn('deleted_at')
		.execute();

	// Drop columns from party
	await db.schema
		.alterTable('party')
		.dropColumn('deleted_by')
		.execute();

	await db.schema
		.alterTable('party')
		.dropColumn('deleted_at')
		.execute();
}
