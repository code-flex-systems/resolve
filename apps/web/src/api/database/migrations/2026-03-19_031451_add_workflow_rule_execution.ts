import { Kysely, sql } from 'kysely';

/**
 * Migration: add_workflow_rule_execution
 * Created: 2026-03-19
 *
 * Tracks every workflow rule evaluation and action taken.
 * Supports both 'suggest' mode (admin approval) and 'auto' mode (immediate execution).
 */

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.createTable('workflow_rule_execution')
		.addColumn('id', 'serial', (col) => col.primaryKey())
		.addColumn('client_id', 'uuid', (col) => col.notNull())
		.addColumn('workflow_rule_id', 'integer', (col) => col.notNull().references('workflow_rule.id'))
		.addColumn('claim_id', 'integer', (col) => col.notNull().references('claim.id'))
		.addColumn('trigger_type', 'varchar(100)', (col) => col.notNull())
		.addColumn('action_type', 'varchar(100)', (col) => col.notNull())
		.addColumn('action_config', 'jsonb', (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
		.addColumn('execution_mode', 'varchar(50)', (col) => col.notNull())
		.addColumn('status', 'varchar(50)', (col) =>
			col
				.notNull()
				.defaultTo('pending')
				.check(sql`status IN ('pending', 'executed', 'failed', 'skipped')`)
		)
		.addColumn('result_data', 'jsonb')
		.addColumn('error_message', 'text')
		.addColumn('executed_at', 'timestamptz')
		.addColumn('executed_by', 'uuid', (col) => col.references('users.id'))
		.addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`NOW()`))
		.addColumn('created_by', 'uuid', (col) => col.references('users.id'))
		.execute();

	// Find pending executions for a rule
	await db.schema
		.createIndex('idx_wre_rule_status')
		.on('workflow_rule_execution')
		.columns(['client_id', 'workflow_rule_id', 'status'])
		.execute();

	// Claim execution history
	await db.schema
		.createIndex('idx_wre_claim_history')
		.on('workflow_rule_execution')
		.columns(['client_id', 'claim_id'])
		.execute();

	// List pending suggestions
	await sql`CREATE INDEX idx_wre_pending ON workflow_rule_execution (client_id, created_at) WHERE status = 'pending'`.execute(
		db
	);
}

export async function down(db: Kysely<any>): Promise<void> {
	await sql`DROP INDEX IF EXISTS idx_wre_pending`.execute(db);
	await db.schema.dropIndex('idx_wre_claim_history').ifExists().execute();
	await db.schema.dropIndex('idx_wre_rule_status').ifExists().execute();
	await db.schema.dropTable('workflow_rule_execution').ifExists().execute();
}
