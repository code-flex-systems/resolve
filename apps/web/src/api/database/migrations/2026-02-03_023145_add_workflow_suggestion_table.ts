import { Kysely, sql } from 'kysely';

/**
 * Migration: add_workflow_suggestion_table
 * Created: 2026-02-03T02:31:45.679Z
 */

export async function up(db: Kysely<any>): Promise<void> {
	// Create workflow_suggestion table
	await db.schema
		.createTable('workflow_suggestion')
		.addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
		.addColumn('client_id', 'uuid', (col) => col.notNull().references('client.id'))
		.addColumn('desk_location_id', 'integer', (col) => col.notNull().references('desk_location.id'))
		.addColumn('status', 'text', (col) =>
			col
				.notNull()
				.defaultTo('pending')
				.check(sql`status IN ('pending', 'executed', 'ignored', 'hidden')`)
		)
		.addColumn('suggestion_data', 'jsonb', (col) => col.notNull())
		.addColumn('generated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
		.addColumn('expires_at', 'timestamptz', (col) => col.notNull())
		.addColumn('resolved_at', 'timestamptz')
		.addColumn('resolved_by', 'uuid', (col) => col.references('users.id'))
		.execute();

	// Create indexes for common queries
	await db.schema
		.createIndex('workflow_suggestion_client_id_idx')
		.on('workflow_suggestion')
		.column('client_id')
		.execute();

	await db.schema
		.createIndex('workflow_suggestion_desk_location_id_idx')
		.on('workflow_suggestion')
		.column('desk_location_id')
		.execute();

	await db.schema
		.createIndex('workflow_suggestion_status_idx')
		.on('workflow_suggestion')
		.column('status')
		.execute();

	await db.schema
		.createIndex('workflow_suggestion_expires_at_idx')
		.on('workflow_suggestion')
		.column('expires_at')
		.execute();

	// Partial unique index for upsert: only one pending suggestion per client+desk_location
	await sql`CREATE UNIQUE INDEX workflow_suggestion_pending_unique_idx ON workflow_suggestion (client_id, desk_location_id) WHERE status = 'pending'`.execute(
		db
	);
}

export async function down(db: Kysely<any>): Promise<void> {
	// Drop indexes
	await db.schema.dropIndex('workflow_suggestion_pending_unique_idx').execute();
	await db.schema.dropIndex('workflow_suggestion_expires_at_idx').execute();
	await db.schema.dropIndex('workflow_suggestion_status_idx').execute();
	await db.schema.dropIndex('workflow_suggestion_desk_location_id_idx').execute();
	await db.schema.dropIndex('workflow_suggestion_client_id_idx').execute();

	// Drop table
	await db.schema.dropTable('workflow_suggestion').execute();
}
