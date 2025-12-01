import { Kysely, sql } from 'kysely';

/**
 * Migration: add_deadline_entity_linking
 * Created: 2025-11-25T02:32:17.906Z
 *
 * Enhances deadline table with:
 * 1. Polymorphic entity linking (entity_type + entity_id)
 * 2. Completion tracking (completed_at, completed_by)
 * 3. Cancellation tracking (cancelled_at, cancelled_by, cancellation_reason)
 *
 * This allows deadlines to be linked to tasks, claims, checklists, or exist standalone.
 */

export async function up(db: Kysely<any>): Promise<void> {
	// Drop existing deadlines (will be reseeded after migration)
	await sql`TRUNCATE TABLE deadline CASCADE`.execute(db);

	// Add polymorphic entity linking fields
	await db.schema
		.alterTable('deadline')
		.addColumn('entity_type', 'text') // values: 'task', 'claim', 'checklist_claim', 'manual'
		.addColumn('entity_id', 'integer')
		.execute();

	// Add completion tracking
	await db.schema
		.alterTable('deadline')
		.addColumn('completed_at', 'timestamp')
		.addColumn('completed_by', sql`uuid`)
		.execute();

	// Add foreign key for completed_by
	await db.schema
		.alterTable('deadline')
		.addForeignKeyConstraint(
			'fk_deadline_completed_by',
			['completed_by'],
			'users',
			['id']
		)
		.execute();

	// Add cancellation tracking
	await db.schema
		.alterTable('deadline')
		.addColumn('cancelled_at', 'timestamp')
		.addColumn('cancelled_by', sql`uuid`)
		.addColumn('cancellation_reason', 'text')
		.execute();

	// Add foreign key for cancelled_by
	await db.schema
		.alterTable('deadline')
		.addForeignKeyConstraint(
			'fk_deadline_cancelled_by',
			['cancelled_by'],
			'users',
			['id']
		)
		.execute();

	// Create index for polymorphic lookups (only when entity_type is set)
	await sql`
		CREATE INDEX idx_deadline_entity
		ON deadline(entity_type, entity_id)
		WHERE entity_type IS NOT NULL
	`.execute(db);

	// Note: status column already exists with values: 'pending', 'met', 'missed', 'extended'
	// Will add 'cancelled' as a valid value via TypeScript enum only (no SQL constraint)
}

export async function down(db: Kysely<any>): Promise<void> {
	// Drop the index
	await db.schema.dropIndex('idx_deadline_entity').execute();

	// Remove foreign key constraints
	await db.schema
		.alterTable('deadline')
		.dropConstraint('fk_deadline_completed_by')
		.execute();

	await db.schema
		.alterTable('deadline')
		.dropConstraint('fk_deadline_cancelled_by')
		.execute();

	// Drop the added columns
	await db.schema
		.alterTable('deadline')
		.dropColumn('entity_type')
		.dropColumn('entity_id')
		.dropColumn('completed_at')
		.dropColumn('completed_by')
		.dropColumn('cancelled_at')
		.dropColumn('cancelled_by')
		.dropColumn('cancellation_reason')
		.execute();
}
