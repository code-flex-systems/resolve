import { Kysely, sql } from 'kysely';

/**
 * Migration: add_desk_location_hierarchy
 * Created: 2025-11-20T19:22:27.571Z
 *
 * Implements the desk location hierarchy system for claims management.
 * Two-level hierarchy: Desk Location Type → Desk Location
 *
 * Phase 1: Basic structure (types and locations only)
 * Future phases will add user-desk associations with priority ordering
 */

export async function up(db: Kysely<any>): Promise<void> {
	// 1. Create desk_location_type table
	await db.schema
		.createTable('desk_location_type')
		.addColumn('id', 'serial', (col) => col.primaryKey())
		.addColumn('name', 'text', (col) => col.notNull())
		.addColumn('client_id', 'uuid', (col) => col.notNull())
		.addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
		.addColumn('created_by', 'uuid')
		.addColumn('updated_at', 'timestamp')
		.addColumn('updated_by', 'uuid')
		.addColumn('deleted_at', 'timestamp')
		.execute();

	// 2. Create desk_location table
	await db.schema
		.createTable('desk_location')
		.addColumn('id', 'serial', (col) => col.primaryKey())
		.addColumn('name', 'text', (col) => col.notNull())
		.addColumn('desk_location_type_id', 'integer', (col) => col.notNull())
		.addColumn('client_id', 'uuid', (col) => col.notNull())
		.addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
		.addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`now()`))
		.addColumn('created_by', 'uuid')
		.addColumn('updated_at', 'timestamp')
		.addColumn('updated_by', 'uuid')
		.addColumn('deleted_at', 'timestamp')
		.execute();

	// 3. Add desk_location_id to checklist_claim table (for future use)
	await db.schema
		.alterTable('checklist_claim')
		.addColumn('desk_location_id', 'integer')
		.execute();

	// 4. Add foreign key constraints
	await db.schema
		.alterTable('desk_location_type')
		.addForeignKeyConstraint(
			'desk_location_type_client_id_fkey',
			['client_id'],
			'client',
			['id']
		)
		.execute();

	await db.schema
		.alterTable('desk_location_type')
		.addForeignKeyConstraint(
			'desk_location_type_created_by_fkey',
			['created_by'],
			'users',
			['id']
		)
		.execute();

	await db.schema
		.alterTable('desk_location_type')
		.addForeignKeyConstraint(
			'desk_location_type_updated_by_fkey',
			['updated_by'],
			'users',
			['id']
		)
		.execute();

	await db.schema
		.alterTable('desk_location')
		.addForeignKeyConstraint(
			'desk_location_type_id_fkey',
			['desk_location_type_id'],
			'desk_location_type',
			['id']
		)
		.execute();

	await db.schema
		.alterTable('desk_location')
		.addForeignKeyConstraint(
			'desk_location_client_id_fkey',
			['client_id'],
			'client',
			['id']
		)
		.execute();

	await db.schema
		.alterTable('desk_location')
		.addForeignKeyConstraint(
			'desk_location_created_by_fkey',
			['created_by'],
			'users',
			['id']
		)
		.execute();

	await db.schema
		.alterTable('desk_location')
		.addForeignKeyConstraint(
			'desk_location_updated_by_fkey',
			['updated_by'],
			'users',
			['id']
		)
		.execute();

	await db.schema
		.alterTable('checklist_claim')
		.addForeignKeyConstraint(
			'checklist_claim_desk_location_id_fkey',
			['desk_location_id'],
			'desk_location',
			['id']
		)
		.execute();

	// 5. Add indexes for performance
	await db.schema
		.createIndex('idx_desk_location_type_client_id')
		.on('desk_location_type')
		.column('client_id')
		.execute();

	await db.schema
		.createIndex('idx_desk_location_client_id')
		.on('desk_location')
		.column('client_id')
		.execute();

	await db.schema
		.createIndex('idx_desk_location_type_id')
		.on('desk_location')
		.column('desk_location_type_id')
		.execute();

	await db.schema
		.createIndex('idx_checklist_claim_desk_location_id')
		.on('checklist_claim')
		.column('desk_location_id')
		.execute();

	// 6. Add CHECK constraints
	await sql`
		ALTER TABLE desk_location_type
		ADD CONSTRAINT desk_location_type_name_check
		CHECK (name IS NOT NULL AND length(trim(name)) > 0)
	`.execute(db);

	await sql`
		ALTER TABLE desk_location
		ADD CONSTRAINT desk_location_name_check
		CHECK (name IS NOT NULL AND length(trim(name)) > 0)
	`.execute(db);

	// 7. Add uniqueness constraint (name unique within client for types)
	await db.schema
		.createIndex('idx_desk_location_type_unique_name_client')
		.unique()
		.on('desk_location_type')
		.columns(['client_id', 'name'])
		.where('deleted_at' as any, 'is', null)
		.execute();

	// 8. Add uniqueness constraint (name unique within type+client for locations)
	await db.schema
		.createIndex('idx_desk_location_unique_name_type_client')
		.unique()
		.on('desk_location')
		.columns(['client_id', 'desk_location_type_id', 'name'])
		.where('deleted_at' as any, 'is', null)
		.execute();

	// 9. Add column comments
	await sql`COMMENT ON COLUMN desk_location_type.id IS 'Primary key'`.execute(db);
	await sql`COMMENT ON COLUMN desk_location_type.name IS 'Name of the desk location type (e.g., "Documentation and Demand Packages")'`.execute(db);
	await sql`COMMENT ON COLUMN desk_location_type.deleted_at IS 'Soft delete timestamp'`.execute(db);

	await sql`COMMENT ON COLUMN desk_location.id IS 'Primary key'`.execute(db);
	await sql`COMMENT ON COLUMN desk_location.name IS 'Name of the desk location (e.g., "Pending", "Transactional", "Closed")'`.execute(db);
	await sql`COMMENT ON COLUMN desk_location.desk_location_type_id IS 'Parent desk location type'`.execute(db);
	await sql`COMMENT ON COLUMN desk_location.is_active IS 'Whether this desk location is currently active and accepting work'`.execute(db);
	await sql`COMMENT ON COLUMN desk_location.deleted_at IS 'Soft delete timestamp'`.execute(db);

	await sql`COMMENT ON COLUMN checklist_claim.desk_location_id IS 'Desk location assignment (mutually exclusive with assignee - for future use in claiming workflow)'`.execute(db);

	// 10. Add table comments
	await sql`COMMENT ON TABLE desk_location_type IS 'Top-level organizational categories for desk locations (e.g., team names, workflow types)'`.execute(db);
	await sql`COMMENT ON TABLE desk_location IS 'Specific desk locations within a type where work can be assigned (e.g., status queues, priority levels)'`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
	// Reverse all operations in reverse order

	// 1. Drop column from checklist_claim
	await db.schema
		.alterTable('checklist_claim')
		.dropColumn('desk_location_id')
		.execute();

	// 2. Drop desk_location table (foreign keys drop automatically in PostgreSQL with CASCADE)
	await db.schema
		.dropTable('desk_location')
		.execute();

	// 3. Drop desk_location_type table
	await db.schema
		.dropTable('desk_location_type')
		.execute();
}
