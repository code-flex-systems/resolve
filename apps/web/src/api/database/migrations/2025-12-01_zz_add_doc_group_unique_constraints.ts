import { Kysely, sql } from 'kysely';

/**
 * Migration: add_doc_group_unique_constraints
 * Created: 2025-12-01T00:00:00.000Z
 *
 * Adds unique constraints to doc_group table to prevent duplicate system folders.
 * These constraints were in the baseline schema but missing from production.
 *
 * Cleans up any existing duplicates before adding the constraints.
 * 
 * Uses zz_ prefix to ensure this runs AFTER other 12/1 migrations.
 */

export async function up(db: Kysely<any>): Promise<void> {
	// Clean up duplicate Shared folders before adding unique constraint
	// Keep the oldest one per client, delete duplicates
	await sql`
		DELETE FROM doc_group
		WHERE id IN (
			SELECT id
			FROM (
				SELECT id,
					ROW_NUMBER() OVER (
						PARTITION BY client_id
						ORDER BY created_at ASC, id ASC
					) AS rn
				FROM doc_group
				WHERE name = 'Shared'
					AND group_type = 'category'
					AND parent_group_id IS NULL
			) dupes
			WHERE rn > 1
		)
	`.execute(db);

	// Clean up duplicate Users folders before adding unique constraint
	await sql`
		DELETE FROM doc_group
		WHERE id IN (
			SELECT id
			FROM (
				SELECT id,
					ROW_NUMBER() OVER (
						PARTITION BY client_id
						ORDER BY created_at ASC, id ASC
					) AS rn
				FROM doc_group
				WHERE name = 'Users'
					AND group_type = 'category'
					AND parent_group_id IS NULL
			) dupes
			WHERE rn > 1
		)
	`.execute(db);

	// Clean up duplicate user folders before adding unique constraint
	await sql`
		DELETE FROM doc_group
		WHERE id IN (
			SELECT id
			FROM (
				SELECT id,
					ROW_NUMBER() OVER (
						PARTITION BY client_id, user_id
						ORDER BY created_at ASC, id ASC
					) AS rn
				FROM doc_group
				WHERE group_type = 'user'
					AND user_id IS NOT NULL
			) dupes
			WHERE rn > 1
		)
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
}

export async function down(db: Kysely<any>): Promise<void> {
	// Drop unique constraints for system folders
	await sql`DROP INDEX IF EXISTS idx_doc_group_shared_folder`.execute(db);
	await sql`DROP INDEX IF EXISTS idx_doc_group_user_folder`.execute(db);
	await sql`DROP INDEX IF EXISTS idx_doc_group_users_folder`.execute(db);
}
