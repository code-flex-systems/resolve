import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Generate a new migration file with proper naming and boilerplate.
 *
 * Usage: tsx src/api/database/create-migration.ts <migration_name>
 * Example: tsx src/api/database/create-migration.ts add_system_field
 * Or via npm: npm run db:migration:create add_system_field
 */
async function createMigration() {
	const args = process.argv.slice(2);
	const migrationName = args[0];

	if (!migrationName) {
		console.error('❌ Error: Migration name is required');
		console.log('Usage: tsx src/api/database/create-migration.ts <migration_name>');
		console.log('Example: tsx src/api/database/create-migration.ts add_system_field');
		process.exit(1);
	}

	// Generate timestamp in format: YYYY-MM-DD_HHMMSS
	const now = new Date();
	const timestamp = now
		.toISOString()
		.replace(/T/, '_')
		.replace(/\..+/, '')
		.replace(/:/g, '')
		.slice(0, 17); // YYYY-MM-DD_HHMMSS

	const fileName = `${timestamp}_${migrationName}.ts`;
	const migrationsDir = path.join(__dirname, 'migrations');
	const filePath = path.join(migrationsDir, fileName);

	const template = `import { Kysely, sql } from 'kysely';

/**
 * Migration: ${migrationName}
 * Created: ${now.toISOString()}
 */

export async function up(db: Kysely<any>): Promise<void> {
	// TODO: Implement your migration here
	// Example:
	// await db.schema
	// 	.alterTable('table_name')
	// 	.addColumn('column_name', 'text')
	// 	.execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	// TODO: Implement rollback here
	// Example:
	// await db.schema
	// 	.alterTable('table_name')
	// 	.dropColumn('column_name')
	// 	.execute();
}
`;

	await fs.writeFile(filePath, template, 'utf-8');

	console.log(`✓ Created migration file: ${fileName}`);
	console.log(`\nNext steps:`);
	console.log(`1. Edit ${filePath}`);
	console.log(`2. Implement the up() and down() functions`);
	console.log(`3. Run: npm run db:migrate`);
	console.log(`4. Regenerate types: npm run db:types`);
}

createMigration();
