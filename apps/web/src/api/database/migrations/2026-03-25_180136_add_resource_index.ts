import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.createTable('resource_index')
		.addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
		.addColumn('client_id', 'uuid', (col) => col.notNull())
		.addColumn('resource_type', 'varchar(50)', (col) => col.notNull())
		.addColumn('resource_id', 'uuid', (col) => col.notNull())
		.addColumn('linked_resource_type', 'varchar(50)')
		.addColumn('linked_resource_id', 'uuid')
		.addColumn('label', 'text', (col) => col.notNull())
		.addColumn('secondary_label', 'text')
		.addColumn('metadata', 'jsonb', (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
		.addColumn('url', 'text', (col) => col.notNull())
		.addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
		.execute();

	// Unique constraint: same resource can have multiple rows if linked to different resources
	// COALESCE handles NULL linked_resource_id for uniqueness
	await sql`CREATE UNIQUE INDEX uq_resource_index ON resource_index (
		client_id, resource_type, resource_id, COALESCE(linked_resource_id, '00000000-0000-0000-0000-000000000000')
	)`.execute(db);

	// varchar_pattern_ops enables B-tree prefix search (LIKE 'term%')
	await sql`CREATE INDEX idx_resource_index_search ON resource_index (client_id, label varchar_pattern_ops)`.execute(
		db
	);
	await sql`CREATE INDEX idx_resource_index_secondary ON resource_index (client_id, secondary_label varchar_pattern_ops)`.execute(
		db
	);
	await sql`CREATE INDEX idx_resource_index_linked ON resource_index (client_id, linked_resource_id) WHERE linked_resource_id IS NOT NULL`.execute(
		db
	);
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('resource_index').execute();
}
