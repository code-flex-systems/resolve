import { Kysely, sql } from 'kysely';

/**
 * Migration: drop_started_by_completed_by
 * Created: 2026-01-30T16:22:50.657Z
 *
 * Drops started_by and completed_by columns from the task table.
 * These are redundant with assigned_to — the assigned user is always
 * the one who starts and completes the task.
 */

export async function up(db: Kysely<any>): Promise<void> {
	// Drop indexes on started_by first
	await sql`DROP INDEX IF EXISTS idx_task_started_by`.execute(db);

	// Drop the columns
	await db.schema
		.alterTable('task')
		.dropColumn('started_by')
		.execute();

	await db.schema
		.alterTable('task')
		.dropColumn('completed_by')
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	// Re-add the columns
	await sql`ALTER TABLE task ADD COLUMN started_by uuid REFERENCES users(id)`.execute(db);
	await sql`ALTER TABLE task ADD COLUMN completed_by uuid REFERENCES users(id)`.execute(db);

	// Backfill from assigned_to for tasks that were started/completed
	await sql`UPDATE task SET started_by = assigned_to WHERE started_at IS NOT NULL`.execute(db);
	await sql`UPDATE task SET completed_by = assigned_to WHERE completed_at IS NOT NULL`.execute(db);

	// Recreate index
	await sql`CREATE INDEX idx_task_started_by ON task(started_by)`.execute(db);
}
