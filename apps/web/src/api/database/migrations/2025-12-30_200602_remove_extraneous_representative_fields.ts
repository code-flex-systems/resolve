import { Kysely, sql } from 'kysely';

/**
 * Migration: remove_extraneous_representative_fields
 * Created: 2025-12-30T20:06:02.769Z
 *
 * Removes extraneous representative fields from claim_party table.
 * Entity representative information has been simplified to a single field (representative_name).
 * The title, email, and phone fields are no longer used in the UI.
 */

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.alterTable('claim_party')
		.dropColumn('representative_title')
		.execute();

	await db.schema
		.alterTable('claim_party')
		.dropColumn('representative_email')
		.execute();

	await db.schema
		.alterTable('claim_party')
		.dropColumn('representative_phone')
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema
		.alterTable('claim_party')
		.addColumn('representative_title', 'text')
		.execute();

	await db.schema
		.alterTable('claim_party')
		.addColumn('representative_email', 'text')
		.execute();

	await db.schema
		.alterTable('claim_party')
		.addColumn('representative_phone', 'text')
		.execute();
}
