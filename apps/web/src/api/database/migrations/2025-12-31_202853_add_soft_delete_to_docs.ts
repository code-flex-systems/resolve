import { Kysely, sql } from 'kysely';

/**
 * Migration: add_soft_delete_to_docs
 * Created: 2025-12-31T20:28:53.212Z
 *
 * Adds soft delete columns (deleted_at, deleted_by) to doc and doc_group tables
 * to support batch archiving instead of hard deletes.
 */

export async function up(db: Kysely<any>): Promise<void> {
	// Add soft delete columns to doc table
	await db.schema
		.alterTable('doc')
		.addColumn('deleted_at', 'timestamp')
		.addColumn('deleted_by', 'varchar(36)')
		.execute();

	// Add soft delete columns to doc_group table
	await db.schema
		.alterTable('doc_group')
		.addColumn('deleted_at', 'timestamp')
		.addColumn('deleted_by', 'varchar(36)')
		.execute();

	// Add index on deleted_at for efficient filtering of non-deleted records
	await sql`CREATE INDEX idx_doc_deleted_at ON doc (deleted_at) WHERE deleted_at IS NULL`.execute(
		db
	);
	await sql`CREATE INDEX idx_doc_group_deleted_at ON doc_group (deleted_at) WHERE deleted_at IS NULL`.execute(
		db
	);
}

export async function down(db: Kysely<any>): Promise<void> {
	// Drop indexes first
	await sql`DROP INDEX IF EXISTS idx_doc_deleted_at`.execute(db);
	await sql`DROP INDEX IF EXISTS idx_doc_group_deleted_at`.execute(db);

	// Remove soft delete columns from doc_group table
	await db.schema
		.alterTable('doc_group')
		.dropColumn('deleted_at')
		.dropColumn('deleted_by')
		.execute();

	// Remove soft delete columns from doc table
	await db.schema.alterTable('doc').dropColumn('deleted_at').dropColumn('deleted_by').execute();
}
