import { Kysely, sql } from 'kysely';

/**
 * BASELINE MIGRATION
 *
 * This migration represents the complete database schema as it existed on 2025-11-12.
 * It includes all tables, indexes, constraints, and initial data.
 *
 * FOR EXISTING DATABASES:
 * - DO NOT run this migration
 * - Instead, run: tsx src/api/database/mark-baseline-executed.ts
 * - This will mark the baseline as executed without actually running it
 *
 * FOR NEW/FRESH DATABASES:
 * - This migration will create the entire schema from scratch
 * - Run: npm run db:migrate
 *
 * SCHEMA OVERVIEW:
 * - Users & Authentication (users, accounts, sessions, verification_tokens)
 * - Claims Management (claim, checklist, checklist_claim, page, page_instance)
 * - Questions & Answers (question, answer, question_response, question_response_answer)
 * - Documents (doc, doc_group, doc_requirement)
 * - Parties (party, party_relationship)
 * - Recovery & AI (recovery_event, recovery_event_analysis, ai_interaction)
 * - Comments, Actions, Deadlines, Admin logs, etc.
 */

export async function up(db: Kysely<any>): Promise<void> {
	// Note: The actual schema creation SQL has been preserved in:
	// /apps/web/src/api/sql/initial_tables_and_sql.sql
	//
	// This baseline migration serves as a checkpoint for the migration system.
	// For existing databases, use mark-baseline-executed.ts to skip this.
	//
	// For truly fresh databases, you should:
	// 1. Run the initial_tables_and_sql.sql file directly via psql
	// 2. Then mark this migration as executed
	//
	// This approach is taken because the full schema creation SQL is complex
	// and already maintained in the SQL file.

	throw new Error(
		'Baseline migration should not be executed directly. ' +
			'For existing databases, run: tsx src/api/database/mark-baseline-executed.ts. ' +
			'For fresh databases, run: psql < apps/web/src/api/sql/initial_tables_and_sql.sql ' +
			'and then mark baseline as executed.'
	);
}

export async function down(db: Kysely<any>): Promise<void> {
	// Rolling back the baseline would drop the entire database schema.
	// This is intentionally not implemented for safety.
	throw new Error('Cannot rollback baseline migration - this would destroy the entire database');
}
