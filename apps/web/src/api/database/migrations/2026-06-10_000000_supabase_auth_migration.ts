import { Kysely, sql } from 'kysely';

/**
 * Migration: supabase_auth_migration
 * Created: 2026-06-10
 *
 * Migrates auth provider linkage from Clerk to Supabase:
 * - Adds users.auth_user_id linking local users to Supabase auth users
 *   (populated at invite time, or backfilled by email on first sign-in)
 * - Drops client.clerk_org_id - multi-tenancy no longer maps to an
 *   external organization; the local client table is the source of truth
 */

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema.alterTable('users').addColumn('auth_user_id', 'uuid').execute();

	// Each Supabase auth user maps to at most one local user
	await sql`CREATE UNIQUE INDEX users_auth_user_id_unique ON users (auth_user_id) WHERE auth_user_id IS NOT NULL`.execute(
		db
	);

	await sql`DROP INDEX IF EXISTS client_clerk_org_id_unique`.execute(db);
	await db.schema.alterTable('client').dropColumn('clerk_org_id').execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.alterTable('client').addColumn('clerk_org_id', 'text').execute();
	await sql`CREATE UNIQUE INDEX client_clerk_org_id_unique ON client (clerk_org_id) WHERE clerk_org_id IS NOT NULL`.execute(
		db
	);

	await sql`DROP INDEX IF EXISTS users_auth_user_id_unique`.execute(db);
	await db.schema.alterTable('users').dropColumn('auth_user_id').execute();
}
