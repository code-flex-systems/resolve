import { Kysely } from 'kysely';

/**
 * Migration: add_claim_activity_logs_pagination_index
 * Created: 2026-01-19T16:10:51.325Z
 */

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.createIndex('idx_claim_activity_client_created_id')
		.on('claim_activity_logs')
		.columns(['client_id', 'created_at', 'id'])
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropIndex('idx_claim_activity_client_created_id').execute();
}
