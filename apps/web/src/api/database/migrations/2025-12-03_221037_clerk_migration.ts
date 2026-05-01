import { Kysely, sql } from 'kysely';

/**
 * Migration: clerk_migration
 * Created: 2025-12-03T22:10:37.392Z
 *
 * Removes NextAuth-related columns and tables as part of migration to Clerk.
 * - Drops password-related columns from users table
 * - Drops NextAuth adapter tables (accounts, sessions, verification_tokens)
 * - Drops password_reset_tokens table
 */

export async function up(db: Kysely<any>): Promise<void> {
	// Remove password-related columns from users table
	await db.schema.alterTable('users').dropColumn('password_hash').execute();

	await db.schema.alterTable('users').dropColumn('must_change_password').execute();

	await db.schema.alterTable('users').dropColumn('mfa_enabled').execute();

	await db.schema.alterTable('users').dropColumn('mfa_secret').execute();

	// Drop NextAuth adapter tables
	await sql`DROP TABLE IF EXISTS accounts CASCADE`.execute(db);
	await sql`DROP TABLE IF EXISTS sessions CASCADE`.execute(db);
	await sql`DROP TABLE IF EXISTS verification_tokens CASCADE`.execute(db);

	// Drop password reset tokens table
	await sql`DROP TABLE IF EXISTS password_reset_tokens CASCADE`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
	// Re-add password-related columns to users table
	await db.schema
		.alterTable('users')
		.addColumn('password_hash', 'text', (col) => col.notNull().defaultTo(''))
		.execute();

	await db.schema
		.alterTable('users')
		.addColumn('must_change_password', 'boolean', (col) => col.notNull().defaultTo(true))
		.execute();

	await db.schema
		.alterTable('users')
		.addColumn('mfa_enabled', 'boolean', (col) => col.notNull().defaultTo(false))
		.execute();

	await db.schema.alterTable('users').addColumn('mfa_secret', 'text').execute();

	// Note: NextAuth adapter tables would need to be recreated manually
	// This is intentionally left incomplete as Clerk is the new auth provider
}
