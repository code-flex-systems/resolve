import { Kysely, sql } from 'kysely';

/**
 * Migration: add_answer_call_edges
 * Created: 2026-01-02T16:10:44.886Z
 *
 * Creates a materialized table to cache answer call graph edges for O(1) cycle detection.
 * Previously, cycle checking required O(n²) queries to rebuild the graph for each check.
 */

export async function up(db: Kysely<any>): Promise<void> {
	// Create the answer_call_edges table
	await db.schema
		.createTable('answer_call_edges')
		.addColumn('id', 'serial', (col) => col.primaryKey())
		.addColumn('client_id', 'uuid', (col) => col.notNull().references('client.id'))
		.addColumn('checklist_id', 'integer', (col) =>
			col.notNull().references('checklist.id').onDelete('cascade')
		)
		.addColumn('from_instance_id', 'integer', (col) =>
			col.notNull().references('page_instance.id').onDelete('cascade')
		)
		.addColumn('to_instance_id', 'integer', (col) =>
			col.notNull().references('page_instance.id').onDelete('cascade')
		)
		.addColumn('answer_id', 'integer', (col) =>
			col.notNull().references('answer.id').onDelete('cascade')
		)
		.addUniqueConstraint('answer_call_edges_unique', [
			'checklist_id',
			'from_instance_id',
			'to_instance_id',
			'answer_id',
		])
		.execute();

	// Create indexes for efficient lookups
	await db.schema
		.createIndex('idx_answer_call_edges_checklist')
		.on('answer_call_edges')
		.column('checklist_id')
		.execute();

	await db.schema
		.createIndex('idx_answer_call_edges_answer')
		.on('answer_call_edges')
		.column('answer_id')
		.execute();

	await db.schema
		.createIndex('idx_answer_call_edges_from_instance')
		.on('answer_call_edges')
		.column('from_instance_id')
		.execute();

	// Populate the table with existing edges from answers that have calls_instance_id set
	await sql`
		INSERT INTO answer_call_edges (client_id, checklist_id, from_instance_id, to_instance_id, answer_id)
		SELECT DISTINCT
			a.client_id,
			pi.checklist_id,
			pi.id as from_instance_id,
			a.calls_instance_id as to_instance_id,
			a.id as answer_id
		FROM answer a
		INNER JOIN question q ON q.id = a.question_id
		INNER JOIN page_instance pi ON pi.page_id = q.page_id AND pi.client_id = a.client_id
		WHERE a.calls_instance_id IS NOT NULL
	`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('answer_call_edges').execute();
}
