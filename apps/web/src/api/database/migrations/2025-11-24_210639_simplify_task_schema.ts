import { Kysely, sql } from 'kysely';

/**
 * Migration: simplify_task_schema
 * Created: 2025-11-24T21:06:39.341Z
 *
 * Simplifies task table by removing timeline and cancellation fields.
 * These responsibilities are moved to the deadline table via polymorphic linking.
 *
 * Removes:
 * - due_date: Moved to deadline.deadline_date
 * - cancelled_at/cancelled_by/cancellation_reason: Moved to deadline table
 *
 * Keeps:
 * - status: Task workflow state (pending, in_progress, completed, cancelled)
 */

export async function up(db: Kysely<any>): Promise<void> {
	// Drop existing tasks (will be reseeded after migration)
	await sql`TRUNCATE TABLE task CASCADE`.execute(db);

	// Drop timeline and cancellation columns (but keep status)
	await db.schema
		.alterTable('task')
		.dropColumn('due_date')
		.dropColumn('cancelled_at')
		.dropColumn('cancelled_by')
		.dropColumn('cancellation_reason')
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	// Re-add the dropped columns
	await db.schema
		.alterTable('task')
		.addColumn('due_date', 'date')
		.addColumn('cancelled_at', 'timestamp')
		.addColumn('cancelled_by', sql`uuid`)
		.addColumn('cancellation_reason', 'text')
		.execute();

	// Add foreign key for cancelled_by
	await db.schema
		.alterTable('task')
		.addForeignKeyConstraint(
			'fk_task_cancelled_by',
			['cancelled_by'],
			'users',
			['id']
		)
		.execute();
}
