import { Kysely, sql } from 'kysely';

/**
 * Migration: make_priority_nullable
 * Created: 2026-01-30T02:32:59.977Z
 *
 * Makes user_desk_location.priority nullable to support
 * "eligible but not currently prioritized" assignment state.
 */

export async function up(db: Kysely<any>): Promise<void> {
	await sql`ALTER TABLE user_desk_location ALTER COLUMN priority DROP NOT NULL`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
	// Set any null priorities to 1 before re-adding the constraint
	await sql`UPDATE user_desk_location SET priority = 1 WHERE priority IS NULL`.execute(db);
	await sql`ALTER TABLE user_desk_location ALTER COLUMN priority SET NOT NULL`.execute(db);
}
