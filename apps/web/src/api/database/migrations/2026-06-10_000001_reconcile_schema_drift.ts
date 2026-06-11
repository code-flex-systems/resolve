import { Kysely, sql } from 'kysely';

/**
 * Migration: reconcile_schema_drift
 * Created: 2026-06-10
 *
 * The original dev/deployed databases received several out-of-band schema
 * changes that were never captured as migrations, so a fresh database built
 * from the migration chain did not match the schema the code (and the
 * committed types.d.ts) expects. This migration captures that drift:
 *
 * - answer.requires_upload / answer.allowed_extensions (file-upload answers)
 * - claim.substatus (granular workflow state)
 * - deadline.entity_id, response_audit_logs.checklist_id/claim_id were
 *   missed by the 2026-03-21 serial_to_uuid conversion (retyped with
 *   USING NULL - pre-production, these columns hold no data)
 * - claim.total_incurred was numeric(12,2) in the original database
 *   (integration tests assert the '.00' scale)
 *
 * Note: the original database also had party-table deleted_by columns as
 * text holding the archiving user's email. That was code-level drift, not
 * a schema standard - partyQueries now writes user ids like every other
 * module, so those columns stay uuid as their migrations defined.
 */

export async function up(db: Kysely<any>): Promise<void> {
	await sql`ALTER TABLE answer ADD COLUMN IF NOT EXISTS requires_upload boolean DEFAULT false`.execute(
		db
	);
	await sql`COMMENT ON COLUMN answer.requires_upload IS 'When true, this answer requires the user to upload a file instead of providing free-form text'`.execute(
		db
	);

	await sql`ALTER TABLE answer ADD COLUMN IF NOT EXISTS allowed_extensions text`.execute(db);
	await sql`COMMENT ON COLUMN answer.allowed_extensions IS 'Comma-separated list of allowed file extensions (e.g., ''.pdf,.docx,.jpg''). NULL means all allowed file types are permitted'`.execute(
		db
	);

	await sql`ALTER TABLE claim ADD COLUMN IF NOT EXISTS substatus text`.execute(db);
	await sql`COMMENT ON COLUMN claim.substatus IS 'Granular workflow state: investigation, demand_sent, negotiation, settlement_reached, litigation, closed_recovered, closed_no_recovery, cancelled'`.execute(
		db
	);

	await sql`ALTER TABLE deadline ALTER COLUMN entity_id TYPE uuid USING NULL`.execute(db);
	await sql`ALTER TABLE response_audit_logs ALTER COLUMN checklist_id TYPE uuid USING NULL`.execute(
		db
	);
	await sql`ALTER TABLE response_audit_logs ALTER COLUMN claim_id TYPE uuid USING NULL`.execute(
		db
	);

	await sql`ALTER TABLE claim ALTER COLUMN total_incurred TYPE numeric(12,2)`.execute(db);

	// Correct stale comments from the 2025-12-01 soft-delete migration:
	// deleted_by holds the archiving user's ID (uuid), not their email
	await sql`COMMENT ON COLUMN party.deleted_by IS 'ID of user who archived this party'`.execute(
		db
	);
	await sql`COMMENT ON COLUMN party_address.deleted_by IS 'ID of user who archived this address'`.execute(
		db
	);
	await sql`COMMENT ON COLUMN party_representative.deleted_by IS 'ID of user who archived this representative'`.execute(
		db
	);
}

export async function down(db: Kysely<any>): Promise<void> {
	await sql`ALTER TABLE claim ALTER COLUMN total_incurred TYPE numeric`.execute(db);

	await sql`ALTER TABLE response_audit_logs ALTER COLUMN claim_id TYPE integer USING NULL`.execute(
		db
	);
	await sql`ALTER TABLE response_audit_logs ALTER COLUMN checklist_id TYPE integer USING NULL`.execute(
		db
	);
	await sql`ALTER TABLE deadline ALTER COLUMN entity_id TYPE integer USING NULL`.execute(db);

	await db.schema.alterTable('claim').dropColumn('substatus').execute();
	await db.schema.alterTable('answer').dropColumn('allowed_extensions').execute();
	await db.schema.alterTable('answer').dropColumn('requires_upload').execute();
}
