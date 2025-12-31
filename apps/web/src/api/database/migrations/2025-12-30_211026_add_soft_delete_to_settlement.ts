import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
	// Add soft delete columns to settlement table
	await db.schema
		.alterTable('settlement')
		.addColumn('deleted_at', 'timestamptz')
		.execute();

	await db.schema
		.alterTable('settlement')
		.addColumn('deleted_by', 'text')
		.execute();

	// Add index for efficient filtering of non-deleted settlements
	await db.schema
		.createIndex('idx_settlement_deleted_at')
		.on('settlement')
		.column('deleted_at')
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropIndex('idx_settlement_deleted_at').execute();

	await db.schema.alterTable('settlement').dropColumn('deleted_by').execute();

	await db.schema.alterTable('settlement').dropColumn('deleted_at').execute();
}
