import { Kysely, sql } from 'kysely';

/**
 * Migration: add_clerk_org_id_to_client
 * Created: 2025-12-04T15:34:15.605Z
 *
 * Adds clerk_org_id column to link our internal client table
 * with Clerk organization IDs for authentication.
 */

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.alterTable('client')
		.addColumn('clerk_org_id', 'text')
		.execute();

	// Add unique constraint since each Clerk org maps to one client
	await sql`CREATE UNIQUE INDEX client_clerk_org_id_unique ON client (clerk_org_id) WHERE clerk_org_id IS NOT NULL`.execute(
		db
	);
}

export async function down(db: Kysely<any>): Promise<void> {
	await sql`DROP INDEX IF EXISTS client_clerk_org_id_unique`.execute(db);

	await db.schema.alterTable('client').dropColumn('clerk_org_id').execute();
}
