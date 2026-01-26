import { promises as fs } from 'fs';
import path from 'path';
import { Migrator, FileMigrationProvider } from 'kysely';
import { db } from './kysely';

/**
 * Kysely migrator configuration.
 *
 * This sets up the migration infrastructure to:
 * - Load migrations from the migrations/ directory
 * - Track executed migrations in the kysely_migration table
 * - Provide up/down migration capabilities
 */
export const migrator = new Migrator({
	db,
	provider: new FileMigrationProvider({
		fs,
		path,
		migrationFolder: path.resolve(process.cwd(), 'migrator-migrations'),
	}),
});
