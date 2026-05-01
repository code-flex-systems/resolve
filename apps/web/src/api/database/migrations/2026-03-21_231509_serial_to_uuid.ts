import { Kysely, sql } from 'kysely';

/**
 * Migration: serial_to_uuid
 *
 * Migrates all user-facing tables from serial integer IDs to UUID.
 * Since this is pre-production, we truncate all affected tables first.
 * Uses raw SQL for reliability across schemas.
 */

export async function up(db: Kysely<any>): Promise<void> {
	// Run the entire migration as a single raw SQL block for atomicity and simplicity.
	// This avoids issues with Kysely's sql.table/sql.ref helpers and cross-schema references.
	await sql
		.raw(
			`
		-- ================================================================
		-- STEP 1: Truncate all tables (CASCADE handles dependencies)
		-- ================================================================
		TRUNCATE TABLE
			claim, party, task, doc, doc_group,
			claim_party, claim_coverage, claim_payment,
			settlement, recovery_event, deadline, comment, feeds,
			checklist, page, page_instance, question, answer,
			question_response, question_response_answer,
			answer_call_edges, action,
			doc_requirement, doc_requirement_fulfillment,
			page_instance_status,
			party_address, party_email, party_phone, party_representative,
			desk_location_type, desk_location, user_desk_location,
			workflow_definition, workflow_rule, workflow_rule_execution, workflow_threshold,
			claim_desk_location_transition,
			checklist_claim,
			workflow_suggestion,
			admin_config_logs, claim_activity_logs, response_audit_logs, action_log,
			analytics.daily_workflow_stage_snapshot
		CASCADE;

		-- ================================================================
		-- STEP 2: Drop ALL foreign key constraints across all schemas
		-- ================================================================
		DO $$
		DECLARE
			r RECORD;
		BEGIN
			FOR r IN (
				SELECT tc.table_schema, tc.table_name, tc.constraint_name
				FROM information_schema.table_constraints tc
				WHERE tc.constraint_type = 'FOREIGN KEY'
				AND tc.table_schema IN ('public', 'analytics')
			) LOOP
				EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I',
					r.table_schema, r.table_name, r.constraint_name);
			END LOOP;
		END $$;

		-- ================================================================
		-- STEP 3: Convert primary key columns from serial to uuid
		-- ================================================================

		-- Core domain
		ALTER TABLE claim ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE claim ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE claim ALTER COLUMN id SET DEFAULT gen_random_uuid();

		ALTER TABLE party ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE party ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE party ALTER COLUMN id SET DEFAULT gen_random_uuid();

		ALTER TABLE task ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE task ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE task ALTER COLUMN id SET DEFAULT gen_random_uuid();

		ALTER TABLE doc ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE doc ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE doc ALTER COLUMN id SET DEFAULT gen_random_uuid();

		ALTER TABLE doc_group ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE doc_group ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE doc_group ALTER COLUMN id SET DEFAULT gen_random_uuid();

		ALTER TABLE claim_party ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE claim_party ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE claim_party ALTER COLUMN id SET DEFAULT gen_random_uuid();

		ALTER TABLE claim_coverage ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE claim_coverage ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE claim_coverage ALTER COLUMN id SET DEFAULT gen_random_uuid();

		ALTER TABLE claim_payment ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE claim_payment ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE claim_payment ALTER COLUMN id SET DEFAULT gen_random_uuid();

		ALTER TABLE settlement ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE settlement ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE settlement ALTER COLUMN id SET DEFAULT gen_random_uuid();

		ALTER TABLE recovery_event ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE recovery_event ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE recovery_event ALTER COLUMN id SET DEFAULT gen_random_uuid();

		ALTER TABLE deadline ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE deadline ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE deadline ALTER COLUMN id SET DEFAULT gen_random_uuid();

		ALTER TABLE comment ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE comment ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE comment ALTER COLUMN id SET DEFAULT gen_random_uuid();

		ALTER TABLE feeds ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE feeds ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE feeds ALTER COLUMN id SET DEFAULT gen_random_uuid();

		-- Checklist domain
		ALTER TABLE checklist ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE checklist ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE checklist ALTER COLUMN id SET DEFAULT gen_random_uuid();

		ALTER TABLE page ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE page ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE page ALTER COLUMN id SET DEFAULT gen_random_uuid();

		ALTER TABLE page_instance ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE page_instance ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE page_instance ALTER COLUMN id SET DEFAULT gen_random_uuid();

		ALTER TABLE question ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE question ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE question ALTER COLUMN id SET DEFAULT gen_random_uuid();

		ALTER TABLE answer ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE answer ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE answer ALTER COLUMN id SET DEFAULT gen_random_uuid();

		ALTER TABLE question_response ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE question_response ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE question_response ALTER COLUMN id SET DEFAULT gen_random_uuid();

		ALTER TABLE question_response_answer ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE question_response_answer ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE question_response_answer ALTER COLUMN id SET DEFAULT gen_random_uuid();

		ALTER TABLE answer_call_edges ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE answer_call_edges ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE answer_call_edges ALTER COLUMN id SET DEFAULT gen_random_uuid();

		ALTER TABLE action ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE action ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE action ALTER COLUMN id SET DEFAULT gen_random_uuid();

		ALTER TABLE doc_requirement ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE doc_requirement ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE doc_requirement ALTER COLUMN id SET DEFAULT gen_random_uuid();

		ALTER TABLE doc_requirement_fulfillment ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE doc_requirement_fulfillment ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE doc_requirement_fulfillment ALTER COLUMN id SET DEFAULT gen_random_uuid();

		ALTER TABLE page_instance_status ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE page_instance_status ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE page_instance_status ALTER COLUMN id SET DEFAULT gen_random_uuid();

		-- Party sub-tables
		ALTER TABLE party_address ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE party_address ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE party_address ALTER COLUMN id SET DEFAULT gen_random_uuid();

		ALTER TABLE party_email ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE party_email ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE party_email ALTER COLUMN id SET DEFAULT gen_random_uuid();

		ALTER TABLE party_phone ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE party_phone ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE party_phone ALTER COLUMN id SET DEFAULT gen_random_uuid();

		ALTER TABLE party_representative ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE party_representative ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE party_representative ALTER COLUMN id SET DEFAULT gen_random_uuid();

		-- Workflow domain
		ALTER TABLE desk_location_type ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE desk_location_type ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE desk_location_type ALTER COLUMN id SET DEFAULT gen_random_uuid();

		ALTER TABLE desk_location ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE desk_location ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE desk_location ALTER COLUMN id SET DEFAULT gen_random_uuid();

		ALTER TABLE user_desk_location ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE user_desk_location ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE user_desk_location ALTER COLUMN id SET DEFAULT gen_random_uuid();

		ALTER TABLE workflow_definition ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE workflow_definition ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE workflow_definition ALTER COLUMN id SET DEFAULT gen_random_uuid();

		ALTER TABLE workflow_rule ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE workflow_rule ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE workflow_rule ALTER COLUMN id SET DEFAULT gen_random_uuid();

		ALTER TABLE workflow_rule_execution ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE workflow_rule_execution ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE workflow_rule_execution ALTER COLUMN id SET DEFAULT gen_random_uuid();

		ALTER TABLE workflow_threshold ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE workflow_threshold ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE workflow_threshold ALTER COLUMN id SET DEFAULT gen_random_uuid();

		ALTER TABLE claim_desk_location_transition ALTER COLUMN id DROP DEFAULT;
		ALTER TABLE claim_desk_location_transition ALTER COLUMN id TYPE uuid USING gen_random_uuid();
		ALTER TABLE claim_desk_location_transition ALTER COLUMN id SET DEFAULT gen_random_uuid();

		-- ================================================================
		-- STEP 4: Convert ALL foreign key columns to uuid
		-- ================================================================

		-- claim references
		ALTER TABLE checklist_claim ALTER COLUMN claim_id TYPE uuid USING NULL;
		ALTER TABLE claim_coverage ALTER COLUMN claim_id TYPE uuid USING NULL;
		ALTER TABLE claim_activity_logs ALTER COLUMN claim_id TYPE uuid USING NULL;
		ALTER TABLE claim_desk_location_transition ALTER COLUMN claim_id TYPE uuid USING NULL;
		ALTER TABLE claim_party ALTER COLUMN claim_id TYPE uuid USING NULL;
		ALTER TABLE claim_payment ALTER COLUMN claim_id TYPE uuid USING NULL;
		ALTER TABLE comment ALTER COLUMN claim_id TYPE uuid USING NULL;
		ALTER TABLE deadline ALTER COLUMN claim_id TYPE uuid USING NULL;
		ALTER TABLE doc ALTER COLUMN claim_id TYPE uuid USING NULL;
		ALTER TABLE doc_group ALTER COLUMN claim_id TYPE uuid USING NULL;
		ALTER TABLE doc_requirement ALTER COLUMN claim_id TYPE uuid USING NULL;
		ALTER TABLE page_instance_status ALTER COLUMN claim_id TYPE uuid USING NULL;
		ALTER TABLE question_response ALTER COLUMN claim_id TYPE uuid USING NULL;
		ALTER TABLE recovery_event ALTER COLUMN claim_id TYPE uuid USING NULL;
		ALTER TABLE settlement ALTER COLUMN claim_id TYPE uuid USING NULL;
		ALTER TABLE task ALTER COLUMN claim_id TYPE uuid USING NULL;
		ALTER TABLE workflow_rule_execution ALTER COLUMN claim_id TYPE uuid USING NULL;

		-- party references
		ALTER TABLE claim_party ALTER COLUMN party_id TYPE uuid USING NULL;
		ALTER TABLE party_address ALTER COLUMN party_id TYPE uuid USING NULL;
		ALTER TABLE party_email ALTER COLUMN party_id TYPE uuid USING NULL;
		ALTER TABLE party_phone ALTER COLUMN party_id TYPE uuid USING NULL;
		ALTER TABLE party_representative ALTER COLUMN party_id TYPE uuid USING NULL;

		-- checklist references
		ALTER TABLE checklist_claim ALTER COLUMN checklist_id TYPE uuid USING NULL;
		ALTER TABLE answer_call_edges ALTER COLUMN checklist_id TYPE uuid USING NULL;
		ALTER TABLE comment ALTER COLUMN checklist_id TYPE uuid USING NULL;
		ALTER TABLE doc_requirement ALTER COLUMN checklist_id TYPE uuid USING NULL;
		ALTER TABLE page_instance ALTER COLUMN checklist_id TYPE uuid USING NULL;
		ALTER TABLE question_response ALTER COLUMN checklist_id TYPE uuid USING NULL;

		-- feeds references
		ALTER TABLE claim ALTER COLUMN feed_id TYPE uuid USING NULL;

		-- page references
		ALTER TABLE page_instance ALTER COLUMN page_id TYPE uuid USING NULL;
		ALTER TABLE question ALTER COLUMN page_id TYPE uuid USING NULL;

		-- page_instance references (including self-reference)
		ALTER TABLE answer ALTER COLUMN calls_instance_id TYPE uuid USING NULL;
		ALTER TABLE answer_call_edges ALTER COLUMN from_instance_id TYPE uuid USING NULL;
		ALTER TABLE answer_call_edges ALTER COLUMN to_instance_id TYPE uuid USING NULL;
		ALTER TABLE comment ALTER COLUMN instance_id TYPE uuid USING NULL;
		ALTER TABLE doc ALTER COLUMN page_instance_id TYPE uuid USING NULL;
		ALTER TABLE page_instance ALTER COLUMN parent_instance_id TYPE uuid USING NULL;
		ALTER TABLE page_instance_status ALTER COLUMN page_instance_id TYPE uuid USING NULL;
		ALTER TABLE question_response ALTER COLUMN instance_id TYPE uuid USING NULL;

		-- question references
		ALTER TABLE answer ALTER COLUMN question_id TYPE uuid USING NULL;
		ALTER TABLE comment ALTER COLUMN question_id TYPE uuid USING NULL;
		ALTER TABLE doc ALTER COLUMN question_id TYPE uuid USING NULL;
		ALTER TABLE question_response ALTER COLUMN question_id TYPE uuid USING NULL;

		-- answer references
		ALTER TABLE action ALTER COLUMN answer_id TYPE uuid USING NULL;
		ALTER TABLE answer_call_edges ALTER COLUMN answer_id TYPE uuid USING NULL;
		ALTER TABLE doc ALTER COLUMN answer_id TYPE uuid USING NULL;
		ALTER TABLE question_response_answer ALTER COLUMN answer_id TYPE uuid USING NULL;

		-- question_response references
		ALTER TABLE question_response_answer ALTER COLUMN response_id TYPE uuid USING NULL;
		ALTER TABLE doc ALTER COLUMN response_doc_id TYPE uuid USING NULL;

		-- doc references (self-reference)
		ALTER TABLE doc ALTER COLUMN replaces_doc_id TYPE uuid USING NULL;
		ALTER TABLE doc_requirement_fulfillment ALTER COLUMN doc_id TYPE uuid USING NULL;

		-- doc_group references (self-reference)
		ALTER TABLE doc ALTER COLUMN doc_group_id TYPE uuid USING NULL;
		ALTER TABLE doc_group ALTER COLUMN parent_group_id TYPE uuid USING NULL;

		-- doc_requirement references
		ALTER TABLE doc_requirement_fulfillment ALTER COLUMN doc_requirement_id TYPE uuid USING NULL;

		-- claim_party references (self-reference + party_representative + party_address)
		ALTER TABLE claim_coverage ALTER COLUMN claim_party_id TYPE uuid USING NULL;
		ALTER TABLE claim_payment ALTER COLUMN payee_claim_party_id TYPE uuid USING NULL;
		ALTER TABLE claim_party ALTER COLUMN parent_claim_party_id TYPE uuid USING NULL;
		ALTER TABLE settlement ALTER COLUMN claim_party_id TYPE uuid USING NULL;
		ALTER TABLE claim_party ALTER COLUMN representative_id TYPE uuid USING NULL;
		ALTER TABLE claim_party ALTER COLUMN address_id TYPE uuid USING NULL;

		-- claim_coverage references
		ALTER TABLE claim_payment ALTER COLUMN coverage_id TYPE uuid USING NULL;
		ALTER TABLE settlement ALTER COLUMN coverage_id TYPE uuid USING NULL;

		-- settlement references
		ALTER TABLE recovery_event ALTER COLUMN settlement_id TYPE uuid USING NULL;

		-- recovery_event references
		ALTER TABLE doc ALTER COLUMN recovery_event_id TYPE uuid USING NULL;

		-- deadline references
		ALTER TABLE doc ALTER COLUMN deadline_id TYPE uuid USING NULL;

		-- action references
		ALTER TABLE action_log ALTER COLUMN action_id TYPE uuid USING NULL;

		-- desk_location_type references
		ALTER TABLE desk_location ALTER COLUMN desk_location_type_id TYPE uuid USING NULL;

		-- desk_location references
		ALTER TABLE claim ALTER COLUMN desk_location_id TYPE uuid USING NULL;
		ALTER TABLE claim_desk_location_transition ALTER COLUMN desk_location_id TYPE uuid USING NULL;
		ALTER TABLE claim_desk_location_transition ALTER COLUMN previous_desk_location_id TYPE uuid USING NULL;
		ALTER TABLE task ALTER COLUMN desk_location_id TYPE uuid USING NULL;
		ALTER TABLE user_desk_location ALTER COLUMN desk_location_id TYPE uuid USING NULL;
		ALTER TABLE workflow_definition ALTER COLUMN desk_location_id TYPE uuid USING NULL;
		ALTER TABLE workflow_suggestion ALTER COLUMN desk_location_id TYPE uuid USING NULL;

		-- workflow_definition references
		ALTER TABLE workflow_rule ALTER COLUMN workflow_definition_id TYPE uuid USING NULL;
		ALTER TABLE workflow_threshold ALTER COLUMN workflow_definition_id TYPE uuid USING NULL;

		-- workflow_rule references
		ALTER TABLE workflow_rule_execution ALTER COLUMN workflow_rule_id TYPE uuid USING NULL;

		-- party_address references
		ALTER TABLE party_representative ALTER COLUMN address_id TYPE uuid USING NULL;

		-- response_audit_logs FK columns (log table keeps serial id, but FKs change type)
		ALTER TABLE response_audit_logs ALTER COLUMN response_id TYPE uuid USING NULL;
		ALTER TABLE response_audit_logs ALTER COLUMN question_id TYPE uuid USING NULL;
		ALTER TABLE response_audit_logs ALTER COLUMN instance_id TYPE uuid USING NULL;

		-- analytics snapshot FK column
		ALTER TABLE analytics.daily_workflow_stage_snapshot ALTER COLUMN desk_location_id TYPE uuid USING NULL;

		-- ================================================================
		-- STEP 5: Drop orphaned serial sequences
		-- ================================================================
		DROP SEQUENCE IF EXISTS claim_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS party_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS task_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS doc_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS doc_group_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS claim_party_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS claim_coverage_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS claim_payment_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS settlement_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS recovery_event_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS deadline_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS comment_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS feeds_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS checklist_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS page_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS page_instance_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS question_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS answer_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS question_response_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS question_response_answer_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS answer_call_edges_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS action_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS doc_requirement_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS doc_requirement_fulfillment_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS page_instance_status_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS party_address_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS party_email_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS party_phone_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS party_representative_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS desk_location_type_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS desk_location_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS user_desk_location_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS workflow_definition_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS workflow_rule_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS workflow_rule_execution_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS workflow_threshold_id_seq CASCADE;
		DROP SEQUENCE IF EXISTS claim_desk_location_transition_id_seq CASCADE;
	`
		)
		.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
	// Reverse migration is not practical for this change.
	// In pre-production, recreate the database from scratch if needed.
	throw new Error(
		'UUID migration cannot be reversed. Recreate the database from the baseline if needed.'
	);
}
