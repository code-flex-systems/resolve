import { Kysely, sql } from 'kysely';

/**
 * Migration: add_capacity_threshold_rename_task_fields
 * Created: 2026-01-30T01:22:59.293Z
 *
 * 1. Adds capacity_threshold to desk_location (non-nullable, default 100)
 * 2. Renames task columns: assigned_by → assigned_to, claimed_by → started_by, claimed_at → started_at
 * 3. Makes assigned_to nullable (was NOT NULL as assigned_by)
 * 4. Updates FK constraints and indexes to match new column names
 */

export async function up(db: Kysely<any>): Promise<void> {
	// 1. Add capacity_threshold to desk_location
	await db.schema
		.alterTable('desk_location')
		.addColumn('capacity_threshold', 'integer', (col) => col.notNull().defaultTo(100))
		.execute();

	await sql`COMMENT ON COLUMN desk_location.capacity_threshold IS 'Work unit threshold for this location. Used for capacity alerting and workflow analytics.'`.execute(
		db
	);

	// 2. Rename task columns
	await sql`ALTER TABLE task RENAME COLUMN assigned_by TO assigned_to`.execute(db);
	await sql`ALTER TABLE task RENAME COLUMN claimed_by TO started_by`.execute(db);
	await sql`ALTER TABLE task RENAME COLUMN claimed_at TO started_at`.execute(db);

	// 3. Make assigned_to nullable (was NOT NULL as assigned_by)
	await sql`ALTER TABLE task ALTER COLUMN assigned_to DROP NOT NULL`.execute(db);

	// 4. Update FK constraints to match new column names
	await db.schema.alterTable('task').dropConstraint('task_assigned_by_fkey').execute();
	await db.schema.alterTable('task').dropConstraint('task_claimed_by_fkey').execute();

	await db.schema
		.alterTable('task')
		.addForeignKeyConstraint('task_assigned_to_fkey', ['assigned_to'], 'users', ['id'])
		.execute();

	await db.schema
		.alterTable('task')
		.addForeignKeyConstraint('task_started_by_fkey', ['started_by'], 'users', ['id'])
		.execute();

	// 5. Update indexes to match new column names
	await db.schema.dropIndex('idx_task_assigned_by').execute();
	await db.schema.dropIndex('idx_task_claimed_by').execute();

	await db.schema.createIndex('idx_task_assigned_to').on('task').column('assigned_to').execute();
	await db.schema.createIndex('idx_task_started_by').on('task').column('started_by').execute();

	// 6. Update column comments
	await sql`COMMENT ON COLUMN task.assigned_to IS 'User this task is assigned to (nullable - unassigned tasks are available to anyone)'`.execute(
		db
	);
	await sql`COMMENT ON COLUMN task.started_by IS 'User who started working on the task'`.execute(
		db
	);
	await sql`COMMENT ON COLUMN task.started_at IS 'When the user started working on the task'`.execute(
		db
	);
}

export async function down(db: Kysely<any>): Promise<void> {
	// Reverse index changes
	await db.schema.dropIndex('idx_task_started_by').execute();
	await db.schema.dropIndex('idx_task_assigned_to').execute();

	await db.schema.createIndex('idx_task_claimed_by').on('task').column('started_by').execute();
	await db.schema.createIndex('idx_task_assigned_by').on('task').column('assigned_to').execute();

	// Reverse FK constraint changes
	await db.schema.alterTable('task').dropConstraint('task_started_by_fkey').execute();
	await db.schema.alterTable('task').dropConstraint('task_assigned_to_fkey').execute();

	await db.schema
		.alterTable('task')
		.addForeignKeyConstraint('task_claimed_by_fkey', ['started_by'], 'users', ['id'])
		.execute();

	await db.schema
		.alterTable('task')
		.addForeignKeyConstraint('task_assigned_by_fkey', ['assigned_to'], 'users', ['id'])
		.execute();

	// Make assigned_to NOT NULL again
	await sql`ALTER TABLE task ALTER COLUMN assigned_to SET NOT NULL`.execute(db);

	// Reverse column renames
	await sql`ALTER TABLE task RENAME COLUMN started_at TO claimed_at`.execute(db);
	await sql`ALTER TABLE task RENAME COLUMN started_by TO claimed_by`.execute(db);
	await sql`ALTER TABLE task RENAME COLUMN assigned_to TO assigned_by`.execute(db);

	// Remove capacity_threshold
	await db.schema.alterTable('desk_location').dropColumn('capacity_threshold').execute();
}
