import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
	// Add soft delete columns to recovery_event table
	await db.schema
		.alterTable('recovery_event')
		.addColumn('deleted_at', 'timestamptz')
		.execute();

	await db.schema
		.alterTable('recovery_event')
		.addColumn('deleted_by', 'text')
		.execute();

	// Add index for efficient filtering of non-deleted recovery events
	await db.schema
		.createIndex('idx_recovery_event_deleted_at')
		.on('recovery_event')
		.column('deleted_at')
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropIndex('idx_recovery_event_deleted_at').execute();

	await db.schema.alterTable('recovery_event').dropColumn('deleted_by').execute();

	await db.schema.alterTable('recovery_event').dropColumn('deleted_at').execute();
}
