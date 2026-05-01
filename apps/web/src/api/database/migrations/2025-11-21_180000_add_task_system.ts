import { Kysely, sql } from 'kysely';

/**
 * Migration: add_task_system
 * Created: 2025-11-21
 *
 * Implements the task system for workflow management.
 * Tasks enable multi-desk collaboration: a claim stays with one desk (ownership)
 * while tasks can be assigned to other desks for specific work.
 *
 * Also adds daily_work_units capacity to desk_location for workload management.
 */

export async function up(db: Kysely<any>): Promise<void> {
	// 1. Add daily_work_units column to desk_location
	await db.schema.alterTable('desk_location').addColumn('daily_work_units', 'integer').execute();

	await sql`COMMENT ON COLUMN desk_location.daily_work_units IS 'Maximum work units per day for this location (NULL = unlimited). 1 unit = 5 minutes.'`.execute(
		db
	);

	// 2. Create task table
	await db.schema
		.createTable('task')
		.addColumn('id', 'serial', (col) => col.primaryKey())
		.addColumn('client_id', 'uuid', (col) => col.notNull())

		// What this task is for (composite key to checklist_claim)
		.addColumn('checklist_id', 'integer', (col) => col.notNull())
		.addColumn('claim_id', 'integer', (col) => col.notNull())

		// Where this task should be worked
		.addColumn('desk_location_id', 'integer', (col) => col.notNull())

		// Task definition (enum value stored as string)
		.addColumn('task_type', 'text', (col) => col.notNull().defaultTo('generic'))

		// Work measurement
		.addColumn('work_units', 'integer', (col) => col.notNull().defaultTo(2))

		// Task details
		.addColumn('title', 'text', (col) => col.notNull())
		.addColumn('description', 'text')
		.addColumn('due_date', 'date')

		// Status tracking (enum value stored as string)
		.addColumn('status', 'text', (col) => col.notNull().defaultTo('pending'))

		// Assignment tracking
		.addColumn('assigned_by', 'uuid', (col) => col.notNull())
		.addColumn('assigned_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))

		// Who is currently working on this task
		.addColumn('claimed_by', 'uuid')
		.addColumn('claimed_at', 'timestamp')

		// Completion tracking
		.addColumn('completed_by', 'uuid')
		.addColumn('completed_at', 'timestamp')
		.addColumn('completion_notes', 'text')

		// Cancellation tracking
		.addColumn('cancelled_by', 'uuid')
		.addColumn('cancelled_at', 'timestamp')
		.addColumn('cancellation_reason', 'text')

		// Standard audit columns
		.addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
		.addColumn('updated_at', 'timestamp')
		.execute();

	// 3. Add foreign key constraints
	await db.schema
		.alterTable('task')
		.addForeignKeyConstraint('task_client_id_fkey', ['client_id'], 'client', ['id'])
		.execute();

	await db.schema
		.alterTable('task')
		.addForeignKeyConstraint(
			'task_checklist_claim_fkey',
			['checklist_id', 'claim_id'],
			'checklist_claim',
			['checklist_id', 'claim_id']
		)
		.execute();

	await db.schema
		.alterTable('task')
		.addForeignKeyConstraint('task_desk_location_id_fkey', ['desk_location_id'], 'desk_location', [
			'id',
		])
		.execute();

	await db.schema
		.alterTable('task')
		.addForeignKeyConstraint('task_assigned_by_fkey', ['assigned_by'], 'users', ['id'])
		.execute();

	await db.schema
		.alterTable('task')
		.addForeignKeyConstraint('task_claimed_by_fkey', ['claimed_by'], 'users', ['id'])
		.execute();

	await db.schema
		.alterTable('task')
		.addForeignKeyConstraint('task_completed_by_fkey', ['completed_by'], 'users', ['id'])
		.execute();

	await db.schema
		.alterTable('task')
		.addForeignKeyConstraint('task_cancelled_by_fkey', ['cancelled_by'], 'users', ['id'])
		.execute();

	// 4. Add indexes for performance
	await db.schema.createIndex('idx_task_client_id').on('task').column('client_id').execute();

	await db.schema
		.createIndex('idx_task_checklist_claim')
		.on('task')
		.columns(['checklist_id', 'claim_id'])
		.execute();

	await db.schema
		.createIndex('idx_task_desk_location_id')
		.on('task')
		.column('desk_location_id')
		.execute();

	await db.schema
		.createIndex('idx_task_status')
		.on('task')
		.column('status')
		.where('cancelled_at' as any, 'is', null)
		.execute();

	await db.schema
		.createIndex('idx_task_due_date')
		.on('task')
		.column('due_date')
		.where('status' as any, '=', 'pending')
		.execute();

	await db.schema.createIndex('idx_task_assigned_by').on('task').column('assigned_by').execute();

	await db.schema.createIndex('idx_task_claimed_by').on('task').column('claimed_by').execute();

	// 5. Add CHECK constraints
	await sql`
		ALTER TABLE task
		ADD CONSTRAINT task_title_check
		CHECK (title IS NOT NULL AND length(trim(title)) > 0)
	`.execute(db);

	await sql`
		ALTER TABLE task
		ADD CONSTRAINT task_work_units_check
		CHECK (work_units >= 1 AND work_units <= 100)
	`.execute(db);

	await sql`
		ALTER TABLE task
		ADD CONSTRAINT task_status_check
		CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'))
	`.execute(db);

	// 6. Add column comments
	await sql`COMMENT ON COLUMN task.id IS 'Primary key'`.execute(db);
	await sql`COMMENT ON COLUMN task.client_id IS 'Client scope for multi-tenancy'`.execute(db);
	await sql`COMMENT ON COLUMN task.checklist_id IS 'The checklist this task is associated with (part of composite FK to checklist_claim)'`.execute(
		db
	);
	await sql`COMMENT ON COLUMN task.claim_id IS 'The claim this task is associated with (part of composite FK to checklist_claim)'`.execute(
		db
	);
	await sql`COMMENT ON COLUMN task.desk_location_id IS 'The desk location where this task should be worked'`.execute(
		db
	);
	await sql`COMMENT ON COLUMN task.task_type IS 'Type of task (enum value from TaskType)'`.execute(
		db
	);
	await sql`COMMENT ON COLUMN task.work_units IS 'Work units for capacity tracking (1 unit = 5 minutes)'`.execute(
		db
	);
	await sql`COMMENT ON COLUMN task.title IS 'Brief description of the task'`.execute(db);
	await sql`COMMENT ON COLUMN task.description IS 'Detailed task instructions'`.execute(db);
	await sql`COMMENT ON COLUMN task.due_date IS 'Optional deadline for task completion'`.execute(db);
	await sql`COMMENT ON COLUMN task.status IS 'Current task status (pending, in_progress, completed, cancelled)'`.execute(
		db
	);
	await sql`COMMENT ON COLUMN task.assigned_by IS 'User who created/assigned the task'`.execute(db);
	await sql`COMMENT ON COLUMN task.claimed_by IS 'User currently working on the task'`.execute(db);
	await sql`COMMENT ON COLUMN task.completed_by IS 'User who completed the task'`.execute(db);
	await sql`COMMENT ON COLUMN task.completion_notes IS 'Notes added when completing the task'`.execute(
		db
	);
	await sql`COMMENT ON COLUMN task.cancelled_by IS 'User who cancelled the task'`.execute(db);
	await sql`COMMENT ON COLUMN task.cancellation_reason IS 'Reason for cancellation'`.execute(db);

	// 7. Add table comment
	await sql`COMMENT ON TABLE task IS 'Tasks for workflow management - enables multi-desk collaboration on claims'`.execute(
		db
	);
}

export async function down(db: Kysely<any>): Promise<void> {
	// Drop task table
	await db.schema.dropTable('task').execute();

	// Remove daily_work_units column from desk_location
	await db.schema.alterTable('desk_location').dropColumn('daily_work_units').execute();
}
