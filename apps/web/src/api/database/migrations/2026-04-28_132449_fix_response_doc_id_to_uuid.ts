import { Kysely, sql } from 'kysely';

/**
 * Migration: fix_response_doc_id_to_uuid
 *
 * The 2026-03-21 serial_to_uuid migration converted doc.id from integer to uuid,
 * but missed question_response.response_doc_id which is a foreign reference to
 * doc.id. This migration completes that conversion.
 *
 * Pre-production: response_doc_id has 0 populated rows, so a direct type swap is safe.
 */

export async function up(db: Kysely<any>): Promise<void> {
	await sql`ALTER TABLE question_response ALTER COLUMN response_doc_id TYPE uuid USING NULL`.execute(db);
	await sql`ALTER TABLE question_response
		ADD CONSTRAINT question_response_response_doc_id_fkey
		FOREIGN KEY (response_doc_id) REFERENCES doc(id) ON DELETE SET NULL`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
	await sql`ALTER TABLE question_response DROP CONSTRAINT IF EXISTS question_response_response_doc_id_fkey`.execute(db);
	await sql`ALTER TABLE question_response ALTER COLUMN response_doc_id TYPE integer USING NULL`.execute(db);
}
