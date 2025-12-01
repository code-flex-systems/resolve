import { Kysely, sql } from 'kysely';

/**
 * Migration: add_missing_baseline_columns
 * Created: 2025-12-01T00:00:00.000Z
 *
 * Adds columns that should have been in the baseline schema but were missing
 * in the production database. This handles the case where production was
 * partially initialized before migrations were properly set up.
 *
 * Uses IF NOT EXISTS to safely add columns even if they already exist.
 */

export async function up(db: Kysely<any>): Promise<void> {
	// Add system column to doc_group if it doesn't exist
	await sql`
		ALTER TABLE doc_group
		ADD COLUMN IF NOT EXISTS system BOOLEAN DEFAULT false
	`.execute(db);

	// Add index for system folders
	await sql`
		CREATE INDEX IF NOT EXISTS idx_doc_group_system
		ON doc_group (system)
		WHERE system = true
	`.execute(db);

	// Add unique constraints for system folders (prevents duplicates)
	await sql`
		CREATE UNIQUE INDEX IF NOT EXISTS idx_doc_group_users_folder
		ON doc_group (client_id, name)
		WHERE name = 'Users' AND group_type = 'category' AND parent_group_id IS NULL
	`.execute(db);

	await sql`
		CREATE UNIQUE INDEX IF NOT EXISTS idx_doc_group_user_folder
		ON doc_group (client_id, user_id)
		WHERE group_type = 'user' AND user_id IS NOT NULL
	`.execute(db);

	await sql`
		CREATE UNIQUE INDEX IF NOT EXISTS idx_doc_group_shared_folder
		ON doc_group (client_id, name)
		WHERE name = 'Shared' AND group_type = 'category' AND parent_group_id IS NULL
	`.execute(db);

	// Add column comment
	await sql`COMMENT ON COLUMN doc_group.system IS 'System-managed folder that cannot be edited or deleted by regular admins'`.execute(
		db
	);
}

export async function down(db: Kysely<any>): Promise<void> {
	// Drop unique constraints for system folders
	await sql`DROP INDEX IF EXISTS idx_doc_group_shared_folder`.execute(db);
	await sql`DROP INDEX IF EXISTS idx_doc_group_user_folder`.execute(db);
	await sql`DROP INDEX IF EXISTS idx_doc_group_users_folder`.execute(db);

	// Drop system folder index
	await sql`DROP INDEX IF EXISTS idx_doc_group_system`.execute(db);

	// Drop column
	await sql`ALTER TABLE doc_group DROP COLUMN IF EXISTS system`.execute(db);
}
