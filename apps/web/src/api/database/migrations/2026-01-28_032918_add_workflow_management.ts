import { Kysely, sql } from 'kysely';

/**
 * Migration: add_workflow_management
 * Created: 2026-01-28
 *
 * Creates workflow management tables:
 *   1. claim_desk_location_transition - Tracks claim movements between desk locations
 *   2. workflow_definition - Defines workflows (global or location-scoped)
 *   3. workflow_threshold - SLA and capacity thresholds for workflows
 *   4. workflow_rule - Automation rules (triggers, conditions, actions)
 */

export async function up(db: Kysely<any>): Promise<void> {
	// ========================================================================
	// 1. CLAIM DESK LOCATION TRANSITION
	// ========================================================================
	await db.schema
		.createTable('claim_desk_location_transition')
		.addColumn('id', 'serial', (col) => col.primaryKey())
		.addColumn('client_id', 'uuid', (col) => col.notNull())
		.addColumn('claim_id', 'integer', (col) => col.notNull())
		.addColumn('desk_location_id', 'integer', (col) => col.notNull())
		.addColumn('entered_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
		.addColumn('entered_by', 'uuid')
		.addColumn('entered_reason', 'text')
		.addColumn('previous_desk_location_id', 'integer')
		.addColumn('deleted_at', 'timestamptz')
		.addColumn('deleted_by', 'uuid')
		.addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
		.execute();

	// Foreign keys
	await db.schema
		.alterTable('claim_desk_location_transition')
		.addForeignKeyConstraint('cdlt_client_id_fkey', ['client_id'], 'client', ['id'])
		.execute();

	await db.schema
		.alterTable('claim_desk_location_transition')
		.addForeignKeyConstraint('cdlt_claim_id_fkey', ['claim_id'], 'claim', ['id'])
		.execute();

	await db.schema
		.alterTable('claim_desk_location_transition')
		.addForeignKeyConstraint('cdlt_desk_location_id_fkey', ['desk_location_id'], 'desk_location', ['id'])
		.execute();

	await db.schema
		.alterTable('claim_desk_location_transition')
		.addForeignKeyConstraint('cdlt_previous_desk_location_id_fkey', ['previous_desk_location_id'], 'desk_location', ['id'])
		.execute();

	// Indexes
	await sql`
		CREATE INDEX idx_cdlt_latest
		ON claim_desk_location_transition (client_id, claim_id, entered_at DESC)
		WHERE deleted_at IS NULL
	`.execute(db);

	await sql`
		CREATE INDEX idx_cdlt_location
		ON claim_desk_location_transition (client_id, desk_location_id, entered_at)
		WHERE deleted_at IS NULL
	`.execute(db);

	await sql`
		CREATE INDEX idx_cdlt_claim_history
		ON claim_desk_location_transition (claim_id, entered_at DESC)
		WHERE deleted_at IS NULL
	`.execute(db);

	// ========================================================================
	// 2. WORKFLOW DEFINITION
	// ========================================================================
	await db.schema
		.createTable('workflow_definition')
		.addColumn('id', 'serial', (col) => col.primaryKey())
		.addColumn('client_id', 'uuid', (col) => col.notNull())
		.addColumn('name', 'varchar(255)', (col) => col.notNull())
		.addColumn('description', 'text')
		.addColumn('desk_location_id', 'integer')
		.addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
		.addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
		.addColumn('created_by', 'uuid')
		.addColumn('updated_at', 'timestamptz')
		.addColumn('updated_by', 'uuid')
		.addColumn('deleted_at', 'timestamptz')
		.addColumn('deleted_by', 'uuid')
		.execute();

	// Foreign keys
	await db.schema
		.alterTable('workflow_definition')
		.addForeignKeyConstraint('wd_client_id_fkey', ['client_id'], 'client', ['id'])
		.execute();

	await db.schema
		.alterTable('workflow_definition')
		.addForeignKeyConstraint('wd_desk_location_id_fkey', ['desk_location_id'], 'desk_location', ['id'])
		.execute();

	// Unique: one active workflow per desk location
	await sql`
		CREATE UNIQUE INDEX idx_workflow_definition_location
		ON workflow_definition (client_id, desk_location_id)
		WHERE is_active = true AND deleted_at IS NULL AND desk_location_id IS NOT NULL
	`.execute(db);

	// Unique: one active global workflow per client
	await sql`
		CREATE UNIQUE INDEX idx_workflow_definition_global
		ON workflow_definition (client_id)
		WHERE desk_location_id IS NULL AND is_active = true AND deleted_at IS NULL
	`.execute(db);

	// Lookup for SLA resolution
	await sql`
		CREATE INDEX idx_workflow_definition_location_lookup
		ON workflow_definition (client_id, desk_location_id)
		WHERE is_active = true AND deleted_at IS NULL
	`.execute(db);

	// ========================================================================
	// 3. WORKFLOW THRESHOLD
	// ========================================================================
	await db.schema
		.createTable('workflow_threshold')
		.addColumn('id', 'serial', (col) => col.primaryKey())
		.addColumn('client_id', 'uuid', (col) => col.notNull())
		.addColumn('workflow_definition_id', 'integer', (col) => col.notNull())
		.addColumn('threshold_type', 'varchar(100)', (col) => col.notNull())
		.addColumn('threshold_value', 'integer', (col) => col.notNull())
		.addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
		.addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
		.addColumn('created_by', 'uuid')
		.addColumn('updated_at', 'timestamptz')
		.addColumn('updated_by', 'uuid')
		.addColumn('deleted_at', 'timestamptz')
		.addColumn('deleted_by', 'uuid')
		.execute();

	// Foreign keys
	await db.schema
		.alterTable('workflow_threshold')
		.addForeignKeyConstraint('wt_client_id_fkey', ['client_id'], 'client', ['id'])
		.execute();

	await db.schema
		.alterTable('workflow_threshold')
		.addForeignKeyConstraint('wt_workflow_definition_id_fkey', ['workflow_definition_id'], 'workflow_definition', ['id'])
		.execute();

	// One active threshold per type per workflow
	await sql`
		CREATE UNIQUE INDEX idx_workflow_threshold_unique
		ON workflow_threshold (workflow_definition_id, threshold_type)
		WHERE is_active = true AND deleted_at IS NULL
	`.execute(db);

	// Lookup by workflow and type
	await sql`
		CREATE INDEX idx_workflow_threshold_type
		ON workflow_threshold (workflow_definition_id, threshold_type)
		WHERE is_active = true AND deleted_at IS NULL
	`.execute(db);

	// ========================================================================
	// 4. WORKFLOW RULE
	// ========================================================================
	await db.schema
		.createTable('workflow_rule')
		.addColumn('id', 'serial', (col) => col.primaryKey())
		.addColumn('client_id', 'uuid', (col) => col.notNull())
		.addColumn('workflow_definition_id', 'integer', (col) => col.notNull())
		.addColumn('name', 'varchar(255)', (col) => col.notNull())
		.addColumn('description', 'text')
		.addColumn('trigger_type', 'varchar(100)', (col) => col.notNull())
		.addColumn('action_type', 'varchar(100)', (col) => col.notNull())
		.addColumn('action_config', 'jsonb', (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
		.addColumn('conditions', 'jsonb', (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
		.addColumn('execution_mode', 'varchar(50)', (col) => col.notNull().defaultTo('suggest'))
		.addColumn('priority', 'integer', (col) => col.notNull().defaultTo(100))
		.addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
		.addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
		.addColumn('created_by', 'uuid')
		.addColumn('updated_at', 'timestamptz')
		.addColumn('updated_by', 'uuid')
		.addColumn('deleted_at', 'timestamptz')
		.addColumn('deleted_by', 'uuid')
		.execute();

	// Foreign keys
	await db.schema
		.alterTable('workflow_rule')
		.addForeignKeyConstraint('wr_client_id_fkey', ['client_id'], 'client', ['id'])
		.execute();

	await db.schema
		.alterTable('workflow_rule')
		.addForeignKeyConstraint('wr_workflow_definition_id_fkey', ['workflow_definition_id'], 'workflow_definition', ['id'])
		.execute();

	// Rules for a specific workflow
	await sql`
		CREATE INDEX idx_workflow_rule_workflow
		ON workflow_rule (workflow_definition_id)
		WHERE is_active = true AND deleted_at IS NULL
	`.execute(db);

	// Rules by trigger type (for event-driven evaluation)
	await sql`
		CREATE INDEX idx_workflow_rule_trigger
		ON workflow_rule (client_id, trigger_type)
		WHERE is_active = true AND deleted_at IS NULL
	`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('workflow_rule').execute();
	await db.schema.dropTable('workflow_threshold').execute();
	await db.schema.dropTable('workflow_definition').execute();
	await db.schema.dropTable('claim_desk_location_transition').execute();
}
