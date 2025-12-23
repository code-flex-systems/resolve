import { Kysely, sql } from 'kysely';

/**
 * Migration: add_client_id_to_claim_party
 * Created: 2025-12-22T18:25:35.659Z
 *
 * Adds client_id column to claim_party table for direct tenant isolation.
 * Previously relied on JOIN to claim table for client_id filtering.
 * This follows the standard of including client_id on all multi-tenant tables.
 */

export async function up(db: Kysely<any>): Promise<void> {
	// Step 1: Add client_id column as nullable uuid (allows backfill)
	await db.schema
		.alterTable('claim_party')
		.addColumn('client_id', 'uuid')
		.execute();

	// Step 2: Backfill client_id from claim table
	await sql`
		UPDATE claim_party
		SET client_id = claim.client_id
		FROM claim
		WHERE claim_party.claim_id = claim.id
	`.execute(db);

	// Step 3: Make client_id NOT NULL (all rows should be backfilled)
	await db.schema
		.alterTable('claim_party')
		.alterColumn('client_id', (col) => col.setNotNull())
		.execute();

	// Step 4: Add foreign key constraint to client table
	await db.schema
		.alterTable('claim_party')
		.addForeignKeyConstraint(
			'claim_party_client_id_fkey',
			['client_id'],
			'client',
			['id']
		)
		.execute();

	// Step 5: Add index for performance (client_id + claim_id is common filter pattern)
	await db.schema
		.createIndex('idx_claim_party_client_claim')
		.on('claim_party')
		.columns(['client_id', 'claim_id'])
		.execute();

	// Step 6: Add index for client_id + party_id (used in party queries)
	await db.schema
		.createIndex('idx_claim_party_client_party')
		.on('claim_party')
		.columns(['client_id', 'party_id'])
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	// Drop indexes
	await db.schema.dropIndex('idx_claim_party_client_party').execute();
	await db.schema.dropIndex('idx_claim_party_client_claim').execute();

	// Drop foreign key constraint
	await db.schema
		.alterTable('claim_party')
		.dropConstraint('claim_party_client_id_fkey')
		.execute();

	// Drop column
	await db.schema
		.alterTable('claim_party')
		.dropColumn('client_id')
		.execute();
}
