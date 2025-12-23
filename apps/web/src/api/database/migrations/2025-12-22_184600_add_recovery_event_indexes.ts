import { Kysely, sql } from 'kysely';

/**
 * Migration: add_recovery_event_indexes
 * Created: 2025-12-22T18:46:00.000Z
 *
 * Adds indexes to support efficient filtering on recovery_event table:
 * - B-tree index on recovery_source for ILIKE prefix search (recovery_source ILIKE 'term%')
 * - Composite index on (client_id, claim_id, recovery_date) for common query patterns
 */

export async function up(db: Kysely<any>): Promise<void> {
	// Add B-tree index on recovery_source for prefix search (ILIKE 'term%')
	// This enables index usage for queries like: WHERE recovery_source ILIKE 'Check%'
	await db.schema
		.createIndex('idx_recovery_event_source_prefix')
		.on('recovery_event')
		.column('recovery_source')
		.expression(sql`recovery_source text_pattern_ops`)
		.execute();

	// Add composite index for common query pattern: filter by client + claim + order by date
	await db.schema
		.createIndex('idx_recovery_event_client_claim_date')
		.on('recovery_event')
		.columns(['client_id', 'claim_id', 'recovery_date'])
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	// Drop indexes in reverse order
	await db.schema.dropIndex('idx_recovery_event_client_claim_date').execute();
	await db.schema.dropIndex('idx_recovery_event_source_prefix').execute();
}
