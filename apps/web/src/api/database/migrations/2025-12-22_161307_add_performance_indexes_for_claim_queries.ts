import { Kysely, sql } from 'kysely';

/**
 * Migration: add_performance_indexes_for_claim_queries
 * Created: 2025-12-22T16:13:07.953Z
 */

export async function up(db: Kysely<any>): Promise<void> {
	// Index for contributor scoping - checklist_claim assignee lookups (Phase 1)
	await sql`
		CREATE INDEX IF NOT EXISTS idx_checklist_claim_assignee
		ON checklist_claim(assignee) WHERE assignee IS NOT NULL
	`.execute(db);

	// Index for contributor scoping - user desk location lookups (Phase 1)
	await sql`
		CREATE INDEX IF NOT EXISTS idx_user_desk_location_user_desk
		ON user_desk_location(user_id, desk_location_id) WHERE removed_at IS NULL
	`.execute(db);

	// Index for primary party lookup optimization (Phase 2)
	await sql`
		CREATE INDEX IF NOT EXISTS idx_claim_party_claim_primary
		ON claim_party(claim_id) WHERE is_primary = true AND deleted_at IS NULL
	`.execute(db);

	// Index for ROW_NUMBER() window function in listMyClaims (Phase 5)
	await sql`
		CREATE INDEX IF NOT EXISTS idx_checklist_claim_assignee_created
		ON checklist_claim(assignee, created_at DESC)
	`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
	// Drop all indexes in reverse order
	await sql`DROP INDEX IF EXISTS idx_checklist_claim_assignee_created`.execute(db);
	await sql`DROP INDEX IF EXISTS idx_claim_party_claim_primary`.execute(db);
	await sql`DROP INDEX IF EXISTS idx_user_desk_location_user_desk`.execute(db);
	await sql`DROP INDEX IF EXISTS idx_checklist_claim_assignee`.execute(db);
}
