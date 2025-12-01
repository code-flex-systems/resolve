import { Kysely } from 'kysely';

/**
 * Migration: add_deleted_at_to_claim_party
 * Created: 2025-11-17T00:00:00.000Z
 *
 * Adds soft delete support to claim_party table.
 * This column was added manually in development but missing from migrations.
 * Must run BEFORE 2025-11-18_200000_add_representative_to_claim_party.ts
 * which references this column.
 */

export async function up(db: Kysely<any>): Promise<void> {
	// Add deleted_at column for soft deletes
	await db.schema
		.alterTable('claim_party')
		.addColumn('deleted_at', 'timestamptz')
		.execute();

	// Add deleted_by column to track who unlinked the party
	await db.schema
		.alterTable('claim_party')
		.addColumn('deleted_by', 'uuid')
		.execute();

	// Add foreign key constraint for deleted_by
	await db.schema
		.alterTable('claim_party')
		.addForeignKeyConstraint(
			'claim_party_deleted_by_fkey',
			['deleted_by'],
			'users',
			['id']
		)
		.onDelete('set null')
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	// Drop foreign key constraint
	await db.schema
		.alterTable('claim_party')
		.dropConstraint('claim_party_deleted_by_fkey')
		.execute();

	// Drop columns
	await db.schema
		.alterTable('claim_party')
		.dropColumn('deleted_by')
		.execute();

	await db.schema
		.alterTable('claim_party')
		.dropColumn('deleted_at')
		.execute();
}
