import { Kysely, sql } from 'kysely';

/**
 * Migration: z_restructure_logging_tables
 * Created: 2025-11-26T02:11:11.982Z
 */

export async function up(db: Kysely<any>): Promise<void> {
	// Create admin_config_logs table
	await db.schema
		.createTable('admin_config_logs')
		.addColumn('id', 'serial', (col) => col.primaryKey())
		.addColumn('client_id', 'uuid', (col) => col.notNull().references('client.id'))
		.addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id'))
		.addColumn('entity_id', 'text', (col) => col.notNull())
		.addColumn('entity_name', 'text', (col) => col.notNull())
		.addColumn('action', 'text', (col) =>
			col
				.notNull()
				.check(sql`action IN ('CREATE', 'UPDATE', 'DELETE', 'BULK_UPDATE', 'BULK_DELETE')`)
		)
		.addColumn('value', 'jsonb')
		.addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
		.execute();

	// Create indexes for admin_config_logs
	await db.schema
		.createIndex('idx_admin_config_entity')
		.on('admin_config_logs')
		.columns(['client_id', 'entity_name', 'entity_id'])
		.execute();

	await db.schema
		.createIndex('idx_admin_config_user')
		.on('admin_config_logs')
		.columns(['client_id', 'user_id', 'created_at'])
		.execute();

	// Create claim_activity_logs table
	await db.schema
		.createTable('claim_activity_logs')
		.addColumn('id', 'serial', (col) => col.primaryKey())
		.addColumn('client_id', 'uuid', (col) => col.notNull().references('client.id'))
		.addColumn('claim_id', 'integer', (col) =>
			col.notNull().references('claim.id').onDelete('cascade')
		)
		.addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id'))
		.addColumn('entity_id', 'text', (col) => col.notNull())
		.addColumn('entity_name', 'text', (col) => col.notNull())
		.addColumn('action', 'text', (col) =>
			col
				.notNull()
				.check(
					sql`action IN ('CREATE', 'UPDATE', 'DELETE', 'CLAIM', 'UNCLAIM', 'COMPLETE', 'CANCEL')`
				)
		)
		.addColumn('actor_type', 'text', (col) =>
			col.notNull().check(sql`actor_type IN ('admin', 'user')`)
		)
		.addColumn('value', 'jsonb')
		.addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
		.execute();

	// Create indexes for claim_activity_logs - CRITICAL for performance
	await db.schema
		.createIndex('idx_claim_activity_claim')
		.on('claim_activity_logs')
		.columns(['claim_id', 'created_at'])
		.execute();

	await db.schema
		.createIndex('idx_claim_activity_user_claim')
		.on('claim_activity_logs')
		.columns(['client_id', 'user_id', 'claim_id', 'created_at'])
		.execute();

	await db.schema
		.createIndex('idx_claim_activity_actor')
		.on('claim_activity_logs')
		.columns(['claim_id', 'actor_type', 'created_at'])
		.execute();

	await db.schema
		.createIndex('idx_claim_activity_entity')
		.on('claim_activity_logs')
		.columns(['client_id', 'entity_name', 'entity_id'])
		.execute();

	// Backfill admin_config_logs from admin_action_logs
	await sql`
		INSERT INTO admin_config_logs (client_id, user_id, entity_id, entity_name, action, value, created_at)
		SELECT client_id, user_id, entity_id, entity_name, action, value, created_at
		FROM admin_action_logs
		WHERE entity_name IN (
			'user', 'client', 'checklist', 'page', 'question', 'answer', 'feed', 'action',
			'desk_location_type', 'desk_location', 'user_desk_location',
			'party', 'party_office', 'party_representative', 'page_instance', 'doc_group'
		)
	`.execute(db);

	// Backfill claim_activity_logs from admin_action_logs (requires claim_id derivation)
	await sql`
		INSERT INTO claim_activity_logs (client_id, user_id, entity_id, entity_name, action, value, claim_id, actor_type, created_at)
		SELECT
			aal.client_id,
			aal.user_id,
			aal.entity_id,
			aal.entity_name,
			aal.action,
			aal.value,
			CASE
				WHEN aal.entity_name = 'claim' THEN aal.entity_id::integer
				WHEN aal.entity_name = 'task' THEN t.claim_id
				WHEN aal.entity_name = 'deadline' THEN d.claim_id
				WHEN aal.entity_name = 'recovery_event' THEN re.claim_id
				WHEN aal.entity_name = 'claim_coverage' THEN cc.claim_id
				WHEN aal.entity_name = 'claim_party' THEN cp.claim_id
				WHEN aal.entity_name = 'document' THEN doc.claim_id
				WHEN aal.entity_name = 'checklist_claim' THEN (aal.value->>'claim_id')::integer
			END as claim_id,
			'admin' as actor_type,
			aal.created_at
		FROM admin_action_logs aal
		LEFT JOIN task t ON aal.entity_name = 'task' AND t.id = aal.entity_id::integer
		LEFT JOIN deadline d ON aal.entity_name = 'deadline' AND d.id = aal.entity_id::integer
		LEFT JOIN recovery_event re ON aal.entity_name = 'recovery_event' AND re.id = aal.entity_id::integer
		LEFT JOIN claim_coverage cc ON aal.entity_name = 'claim_coverage' AND cc.id = aal.entity_id::integer
		LEFT JOIN claim_party cp ON aal.entity_name = 'claim_party' AND cp.id = aal.entity_id::integer
		LEFT JOIN doc ON aal.entity_name = 'document' AND doc.id = aal.entity_id::integer
		WHERE aal.entity_name IN (
			'claim', 'task', 'deadline', 'recovery_event', 'claim_coverage',
			'claim_party', 'document', 'checklist_claim'
		)
		AND CASE
			WHEN aal.entity_name = 'claim' THEN aal.entity_id::integer
			WHEN aal.entity_name = 'task' THEN t.claim_id
			WHEN aal.entity_name = 'deadline' THEN d.claim_id
			WHEN aal.entity_name = 'recovery_event' THEN re.claim_id
			WHEN aal.entity_name = 'claim_coverage' THEN cc.claim_id
			WHEN aal.entity_name = 'claim_party' THEN cp.claim_id
			WHEN aal.entity_name = 'document' THEN doc.claim_id
			WHEN aal.entity_name = 'checklist_claim' THEN (aal.value->>'claim_id')::integer
		END IS NOT NULL
	`.execute(db);

	// Drop the old admin_action_logs table (data has been migrated to new tables)
	await db.schema.dropTable('admin_action_logs').execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	// Rollback: recreate admin_action_logs table structure (without data)
	await db.schema
		.createTable('admin_action_logs')
		.addColumn('id', 'serial', (col) => col.primaryKey())
		.addColumn('client_id', 'uuid', (col) => col.notNull().references('client.id'))
		.addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id'))
		.addColumn('entity_id', 'text', (col) => col.notNull())
		.addColumn('entity_name', 'text', (col) => col.notNull())
		.addColumn('action', 'text', (col) =>
			col
				.notNull()
				.check(sql`action IN ('CREATE', 'UPDATE', 'DELETE', 'BULK_UPDATE', 'BULK_DELETE')`)
		)
		.addColumn('value', 'jsonb')
		.addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
		.execute();

	// Recreate indexes
	await db.schema
		.createIndex('idx_admin_action_logs_client_entity')
		.on('admin_action_logs')
		.columns(['client_id', 'entity_name', 'entity_id'])
		.execute();

	await db.schema
		.createIndex('idx_admin_action_logs_client_user_created')
		.on('admin_action_logs')
		.columns(['client_id', 'user_id', 'created_at'])
		.execute();

	await db.schema
		.createIndex('idx_admin_action_logs_entity')
		.on('admin_action_logs')
		.columns(['entity_name', 'entity_id'])
		.execute();

	// Drop the new tables
	await db.schema.dropTable('claim_activity_logs').ifExists().execute();
	await db.schema.dropTable('admin_config_logs').ifExists().execute();
}
