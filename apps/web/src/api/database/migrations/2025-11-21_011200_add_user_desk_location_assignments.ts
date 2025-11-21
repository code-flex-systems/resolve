import { Kysely, sql } from 'kysely';

/**
 * Migration: add_user_desk_location_assignments
 * Created: 2025-11-21T01:12:00.020Z
 *
 * Phase 2: User Assignments & Priorities
 *
 * Creates the user_desk_location junction table for assigning users to desk locations
 * with priority ordering (1-5). Supports collaborative work pools where multiple users
 * can be assigned to the same desk location.
 */

export async function up(db: Kysely<any>): Promise<void> {
	// 1. Create user_desk_location table
	await db.schema
		.createTable('user_desk_location')
		.addColumn('id', 'serial', (col) => col.primaryKey())
		.addColumn('user_id', 'uuid', (col) => col.notNull())
		.addColumn('desk_location_id', 'integer', (col) => col.notNull())
		.addColumn('priority', 'integer', (col) => col.notNull())
		.addColumn('assigned_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
		.addColumn('assigned_by', 'uuid')
		.addColumn('removed_at', 'timestamp')
		.addColumn('removed_by', 'uuid')
		.execute();

	// 2. Add foreign key constraints
	await db.schema
		.alterTable('user_desk_location')
		.addForeignKeyConstraint(
			'user_desk_location_user_id_fkey',
			['user_id'],
			'users',
			['id']
		)
		.execute();

	await db.schema
		.alterTable('user_desk_location')
		.addForeignKeyConstraint(
			'user_desk_location_desk_location_id_fkey',
			['desk_location_id'],
			'desk_location',
			['id']
		)
		.execute();

	await db.schema
		.alterTable('user_desk_location')
		.addForeignKeyConstraint(
			'user_desk_location_assigned_by_fkey',
			['assigned_by'],
			'users',
			['id']
		)
		.execute();

	await db.schema
		.alterTable('user_desk_location')
		.addForeignKeyConstraint(
			'user_desk_location_removed_by_fkey',
			['removed_by'],
			'users',
			['id']
		)
		.execute();

	// 3. Add CHECK constraint for priority range (1-5)
	await sql`
		ALTER TABLE user_desk_location
		ADD CONSTRAINT user_desk_location_priority_check
		CHECK (priority >= 1 AND priority <= 5)
	`.execute(db);

	// 4. Add unique constraints (partial indexes for soft deletion support)
	// Prevent duplicate user-desk location associations
	await db.schema
		.createIndex('idx_user_desk_location_unique_user_desk')
		.unique()
		.on('user_desk_location')
		.columns(['user_id', 'desk_location_id'])
		.where('removed_at' as any, 'is', null)
		.execute();

	// Prevent duplicate priorities for same user
	await db.schema
		.createIndex('idx_user_desk_location_unique_user_priority')
		.unique()
		.on('user_desk_location')
		.columns(['user_id', 'priority'])
		.where('removed_at' as any, 'is', null)
		.execute();

	// 5. Add indexes for performance
	await db.schema
		.createIndex('idx_user_desk_location_user_id')
		.on('user_desk_location')
		.column('user_id')
		.execute();

	await db.schema
		.createIndex('idx_user_desk_location_desk_location_id')
		.on('user_desk_location')
		.column('desk_location_id')
		.execute();

	await db.schema
		.createIndex('idx_user_desk_location_priority')
		.on('user_desk_location')
		.columns(['user_id', 'priority'])
		.where('removed_at' as any, 'is', null)
		.execute();

	// 6. Add column comments
	await sql`COMMENT ON COLUMN user_desk_location.id IS 'Primary key'`.execute(db);
	await sql`COMMENT ON COLUMN user_desk_location.user_id IS 'User assigned to this desk location'`.execute(db);
	await sql`COMMENT ON COLUMN user_desk_location.desk_location_id IS 'Desk location the user is assigned to'`.execute(db);
	await sql`COMMENT ON COLUMN user_desk_location.priority IS 'Priority level (1-5) for this desk location assignment, 1 being highest'`.execute(db);
	await sql`COMMENT ON COLUMN user_desk_location.assigned_at IS 'When the user was assigned to this desk location'`.execute(db);
	await sql`COMMENT ON COLUMN user_desk_location.assigned_by IS 'User who made the assignment'`.execute(db);
	await sql`COMMENT ON COLUMN user_desk_location.removed_at IS 'Soft deletion timestamp - when assignment was removed'`.execute(db);
	await sql`COMMENT ON COLUMN user_desk_location.removed_by IS 'User who removed the assignment'`.execute(db);

	// 7. Add table comment
	await sql`COMMENT ON TABLE user_desk_location IS 'Junction table assigning users to desk locations with priority ordering. Supports collaborative work pools where multiple users can access the same desk location. Priority determines which desk work appears first in user queues.'`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
	// Drop the user_desk_location table (foreign keys and indexes drop automatically)
	await db.schema
		.dropTable('user_desk_location')
		.execute();
}
