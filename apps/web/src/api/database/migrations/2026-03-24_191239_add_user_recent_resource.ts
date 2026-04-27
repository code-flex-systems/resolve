import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.createTable('user_recent_resource')
		.addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
		.addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id').onDelete('cascade'))
		.addColumn('client_id', 'uuid', (col) => col.notNull())
		.addColumn('resource_type', 'varchar(50)', (col) => col.notNull())
		.addColumn('resource_id', 'uuid', (col) => col.notNull())
		.addColumn('resource_label', 'text')
		.addColumn('resource_url', 'text', (col) => col.notNull())
		.addColumn('visited_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
		.addUniqueConstraint('uq_user_recent_resource', ['user_id', 'resource_type', 'resource_id'])
		.execute();

	await db.schema
		.createIndex('idx_user_recent_resource_user')
		.on('user_recent_resource')
		.columns(['user_id', 'visited_at'])
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('user_recent_resource').execute();
}
