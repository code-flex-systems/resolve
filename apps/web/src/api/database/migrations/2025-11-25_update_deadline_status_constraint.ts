import { Kysely, sql } from 'kysely';

/**
 * Migration: update_deadline_status_constraint
 * Created: 2025-11-25T18:24:47.006Z
 *
 * Updates the deadline status check constraint to include 'cancelled' as a valid status.
 * This allows deadlines to be cancelled when their linked tasks are cancelled.
 */

export async function up(db: Kysely<any>): Promise<void> {
	// Drop the old constraint
	await sql`ALTER TABLE deadline DROP CONSTRAINT IF EXISTS deadline_status_check`.execute(db);

	// Add the new constraint with 'cancelled' included
	await sql`
		ALTER TABLE deadline
		ADD CONSTRAINT deadline_status_check
		CHECK (status = ANY(ARRAY['pending', 'met', 'missed', 'extended', 'cancelled']))
	`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
	// Drop the new constraint
	await sql`ALTER TABLE deadline DROP CONSTRAINT IF EXISTS deadline_status_check`.execute(db);

	// Convert any cancelled deadlines to missed before restoring old constraint
	await sql`UPDATE deadline SET status = 'missed' WHERE status = 'cancelled'`.execute(db);

	// Restore the old constraint without 'cancelled'
	await sql`
		ALTER TABLE deadline
		ADD CONSTRAINT deadline_status_check
		CHECK (status = ANY(ARRAY['pending', 'met', 'missed', 'extended']))
	`.execute(db);
}
