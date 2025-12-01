import { Kysely, sql } from 'kysely';

/**
 * Migration: add_task_status_column
 * Created: 2025-11-25
 *
 * Re-adds the status column to the task table.
 * The status column tracks the workflow state of a task:
 * - pending: Task created, not yet claimed
 * - in_progress: Task claimed and being worked on
 * - completed: Task completed
 * - cancelled: Task cancelled
 */

export async function up(db: Kysely<any>): Promise<void> {
	// Add status column back to task table
	await db.schema
		.alterTable('task')
		.addColumn('status', 'text', (col) => col.notNull().defaultTo('pending'))
		.execute();

	// Update existing tasks to have appropriate status based on their state
	// Tasks with completed_at should be 'completed'
	await sql`
		UPDATE task
		SET status = 'completed'
		WHERE completed_at IS NOT NULL
	`.execute(db);

	// Tasks with claimed_by but no completed_at should be 'in_progress'
	await sql`
		UPDATE task
		SET status = 'in_progress'
		WHERE claimed_by IS NOT NULL
		AND completed_at IS NULL
		AND status = 'pending'
	`.execute(db);

	// Check for tasks with cancelled deadlines and mark them as cancelled
	await sql`
		UPDATE task
		SET status = 'cancelled'
		WHERE id IN (
			SELECT entity_id
			FROM deadline
			WHERE entity_type = 'task'
			AND status = 'cancelled'
		)
	`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
	// Drop status column
	await db.schema
		.alterTable('task')
		.dropColumn('status')
		.execute();
}
