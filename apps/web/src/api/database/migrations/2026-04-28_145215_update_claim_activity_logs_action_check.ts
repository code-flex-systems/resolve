import { Kysely, sql } from 'kysely';

/**
 * Migration: update_claim_activity_logs_action_check
 *
 * The CHECK constraint on claim_activity_logs.action is out of sync with the
 * LogAction TypeScript enum. The constraint allows CLAIM/UNCLAIM (obsolete)
 * but rejects ASSIGN/UNASSIGN/START/BULK_UPDATE/BULK_DELETE which controllers
 * now emit (e.g., taskController.startTask, unassignTask, bulkCancelTasks).
 *
 * Replaces the constraint with the current enum values.
 */

const NEW_VALUES = [
	'CREATE',
	'UPDATE',
	'DELETE',
	'BULK_UPDATE',
	'BULK_DELETE',
	'ASSIGN',
	'UNASSIGN',
	'START',
	'COMPLETE',
	'CANCEL',
];

const OLD_VALUES = ['CREATE', 'UPDATE', 'DELETE', 'CLAIM', 'UNCLAIM', 'COMPLETE', 'CANCEL'];

export async function up(db: Kysely<any>): Promise<void> {
	// Drop the old constraint first so we can rewrite legacy values
	await sql`ALTER TABLE claim_activity_logs DROP CONSTRAINT IF EXISTS claim_activity_logs_action_check`.execute(
		db
	);

	// Migrate legacy values to current enum equivalents
	// CLAIM (legacy: user claims/picks up a task) → ASSIGN (current: task assigned to user)
	// UNCLAIM → UNASSIGN
	await sql`UPDATE claim_activity_logs SET action = 'ASSIGN' WHERE action = 'CLAIM'`.execute(db);
	await sql`UPDATE claim_activity_logs SET action = 'UNASSIGN' WHERE action = 'UNCLAIM'`.execute(
		db
	);

	const valuesList = sql.join(NEW_VALUES.map((v) => sql.lit(v)));
	await sql`
		ALTER TABLE claim_activity_logs
		ADD CONSTRAINT claim_activity_logs_action_check
		CHECK (action IN (${valuesList}))
	`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
	await sql`ALTER TABLE claim_activity_logs DROP CONSTRAINT IF EXISTS claim_activity_logs_action_check`.execute(
		db
	);
	const valuesList = sql.join(OLD_VALUES.map((v) => sql.lit(v)));
	await sql`
		ALTER TABLE claim_activity_logs
		ADD CONSTRAINT claim_activity_logs_action_check
		CHECK (action IN (${valuesList}))
	`.execute(db);
}
