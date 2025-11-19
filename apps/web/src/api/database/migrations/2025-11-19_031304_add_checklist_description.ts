import { Kysely, sql } from 'kysely';

/**
 * Migration: add_checklist_description
 * Created: 2025-11-19T03:13:04.615Z
 */

export async function up(db: Kysely<any>): Promise<void> {
	// Add description column to checklist table
	await db.schema
		.alterTable('checklist')
		.addColumn('description', 'text', (col) => col.defaultTo(null))
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	// Remove description column from checklist table
	await db.schema.alterTable('checklist').dropColumn('description').execute();
}
