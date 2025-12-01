import { Kysely, sql } from 'kysely';

/**
 * Migration: add_deleted_at_to_claim_liability
 * Created: 2025-11-29T14:16:57.880Z
 *
 * Adds soft delete support to claim_liability table
 */

export async function up(db: Kysely<any>): Promise<void> {
	// Add deleted_at column to claim_liability table for soft deletes
	await db.schema
		.alterTable('claim_liability')
		.addColumn('deleted_at', 'timestamptz')
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	// Remove deleted_at column from claim_liability table
	await db.schema
		.alterTable('claim_liability')
		.dropColumn('deleted_at')
		.execute();
}
