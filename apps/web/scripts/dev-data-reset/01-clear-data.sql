-- =====================================================
-- 01-clear-data.sql
-- Delete all transactional data while preserving reference tables
-- Execute in this exact order to respect foreign key constraints
-- =====================================================

-- Phase 1: Audit/logging tables (no FK dependencies on these)
DELETE FROM response_audit_logs;
DELETE FROM admin_config_logs;
DELETE FROM claim_activity_logs;
DELETE FROM auth_events;
DELETE FROM action_log;

-- Phase 2: Checklist response data
DELETE FROM question_response_answer;
DELETE FROM question_response;
DELETE FROM comment;
DELETE FROM page_instance_status;

-- Phase 3: Checklist structure (order matters due to self-references and cross-references)
DELETE FROM answer_call_edges;
DELETE FROM action;
-- Handle self-referential FK: answer.calls_instance_id -> page_instance.id
UPDATE answer SET calls_instance_id = NULL WHERE calls_instance_id IS NOT NULL;
DELETE FROM answer;
DELETE FROM question;
-- Handle self-referential FK: page_instance.parent_instance_id
UPDATE page_instance SET parent_instance_id = NULL WHERE parent_instance_id IS NOT NULL;
DELETE FROM page_instance;
DELETE FROM page;
DELETE FROM checklist_claim;
DELETE FROM checklist;

-- Phase 3b: Workflow data (depends on desk_location, claim)
DELETE FROM analytics.daily_workflow_stage_snapshot;
DELETE FROM workflow_rule;
DELETE FROM workflow_threshold;
DELETE FROM workflow_definition;
DELETE FROM claim_desk_location_transition;

-- Phase 4: Documents & tasks
DELETE FROM doc_requirement_fulfillment;
DELETE FROM doc_requirement;
-- Handle self-referential FK: doc.replaces_doc_id -> doc.id
UPDATE doc SET replaces_doc_id = NULL WHERE replaces_doc_id IS NOT NULL;
DELETE FROM doc;
-- Handle self-referential FK: doc_group.parent_group_id -> doc_group.id
UPDATE doc_group SET parent_group_id = NULL WHERE parent_group_id IS NOT NULL;
DELETE FROM doc_group;
DELETE FROM task;
DELETE FROM deadline;

-- Phase 5: Recovery & payments
DELETE FROM recovery_event;
DELETE FROM settlement;
DELETE FROM claim_payment;

-- Phase 6: Claim relationships
-- Handle FK: claim_coverage.claim_party_id -> claim_party.id
UPDATE claim_coverage SET claim_party_id = NULL WHERE claim_party_id IS NOT NULL;
-- Handle self-referential FK: claim_party.parent_claim_party_id
UPDATE claim_party SET parent_claim_party_id = NULL WHERE parent_claim_party_id IS NOT NULL;
DELETE FROM claim_party;
DELETE FROM claim_coverage;

-- Phase 7: Claims
DELETE FROM claim;

-- Phase 8: Parties
DELETE FROM party_representative;
DELETE FROM party_phone;
DELETE FROM party_email;
DELETE FROM party_address;
DELETE FROM party;

-- Phase 9: User-related tables (handled separately in 02-select-users.sql)
DELETE FROM user_desk_location;

-- Note: Users cleanup is handled in 02-select-users.sql
-- to preserve the 10 selected users

-- Phase 10: Reset sequences for predictable IDs in generated data
-- These sequences are used by the generation scripts which rely on ID ranges
ALTER SEQUENCE IF EXISTS claim_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS party_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS party_address_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS party_phone_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS party_email_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS party_representative_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS claim_coverage_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS claim_party_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS claim_payment_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS settlement_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS recovery_event_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS task_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS deadline_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS workflow_definition_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS workflow_threshold_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS workflow_rule_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS claim_desk_location_transition_id_seq RESTART WITH 1;

SELECT 'Phase 1-10 complete. Transactional data cleared and sequences reset.' AS status;
