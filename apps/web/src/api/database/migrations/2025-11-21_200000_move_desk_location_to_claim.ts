import { Kysely, sql } from 'kysely';

/**
 * Migration: move_desk_location_to_claim
 * Created: 2025-11-21
 *
 * Data model correction for claim-centric workflow:
 * 1. Move desk_location_id from checklist_claim to claim table
 *    - Claims exist independently of checklists
 *    - Claims move through desk locations as part of workflow
 * 2. Update task table to reference claim_id only (not checklist_id)
 *    - Tasks are work on claims, not on checklist+claim combos
 */

export async function up(db: Kysely<any>): Promise<void> {
	// 1. Add desk_location_id to claim table
	await db.schema.alterTable('claim').addColumn('desk_location_id', 'integer').execute();

	await db.schema
		.alterTable('claim')
		.addForeignKeyConstraint('claim_desk_location_id_fkey', ['desk_location_id'], 'desk_location', [
			'id',
		])
		.execute();

	await db.schema
		.createIndex('idx_claim_desk_location_id')
		.on('claim')
		.column('desk_location_id')
		.execute();

	await sql`COMMENT ON COLUMN claim.desk_location_id IS 'Current desk location for workflow routing. Claims move through desk locations as they progress through the workflow.'`.execute(
		db
	);

	// 2. Drop desk_location_id from checklist_claim
	// First drop the foreign key constraint
	await db.schema
		.alterTable('checklist_claim')
		.dropConstraint('checklist_claim_desk_location_id_fkey')
		.execute();

	// Drop the index
	await db.schema.dropIndex('idx_checklist_claim_desk_location_id').execute();

	// Drop the column
	await db.schema.alterTable('checklist_claim').dropColumn('desk_location_id').execute();

	// 3. Update task table: remove checklist_id, keep only claim_id
	// First drop the composite foreign key constraint
	await db.schema.alterTable('task').dropConstraint('task_checklist_claim_fkey').execute();

	// Drop the composite index
	await db.schema.dropIndex('idx_task_checklist_claim').execute();

	// Drop checklist_id column
	await db.schema.alterTable('task').dropColumn('checklist_id').execute();

	// Add simple foreign key to claim
	await db.schema
		.alterTable('task')
		.addForeignKeyConstraint('task_claim_id_fkey', ['claim_id'], 'claim', ['id'])
		.execute();

	// Add index on claim_id
	await db.schema.createIndex('idx_task_claim_id').on('task').column('claim_id').execute();

	// Update column comment
	await sql`COMMENT ON COLUMN task.claim_id IS 'The claim this task is associated with'`.execute(
		db
	);
}

export async function down(db: Kysely<any>): Promise<void> {
	// Reverse the task table changes
	await db.schema.dropIndex('idx_task_claim_id').execute();

	await db.schema.alterTable('task').dropConstraint('task_claim_id_fkey').execute();

	await db.schema
		.alterTable('task')
		.addColumn('checklist_id', 'integer', (col) => col.notNull())
		.execute();

	await db.schema
		.createIndex('idx_task_checklist_claim')
		.on('task')
		.columns(['checklist_id', 'claim_id'])
		.execute();

	await db.schema
		.alterTable('task')
		.addForeignKeyConstraint(
			'task_checklist_claim_fkey',
			['checklist_id', 'claim_id'],
			'checklist_claim',
			['checklist_id', 'claim_id']
		)
		.execute();

	// Restore desk_location_id on checklist_claim
	await db.schema.alterTable('checklist_claim').addColumn('desk_location_id', 'integer').execute();

	await db.schema
		.createIndex('idx_checklist_claim_desk_location_id')
		.on('checklist_claim')
		.column('desk_location_id')
		.execute();

	await db.schema
		.alterTable('checklist_claim')
		.addForeignKeyConstraint(
			'checklist_claim_desk_location_id_fkey',
			['desk_location_id'],
			'desk_location',
			['id']
		)
		.execute();

	// Remove desk_location_id from claim
	await db.schema.dropIndex('idx_claim_desk_location_id').execute();

	await db.schema.alterTable('claim').dropConstraint('claim_desk_location_id_fkey').execute();

	await db.schema.alterTable('claim').dropColumn('desk_location_id').execute();
}
