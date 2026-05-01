-- =====================================================
-- 11-generate-workflow-data.sql
-- Generate workflow definitions, rules, thresholds,
-- tasks, deadlines, transitions, and analytics snapshots.
-- Exercises suggestion algorithm, analytics queries 0.1-0.6,
-- query 1.6, and configuration health check queries.
-- =====================================================

DO $$
DECLARE
    v_client_id UUID;
    v_admin_user_id UUID;
    v_user_ids UUID[];

    -- Desk location type IDs
    v_subrog_type_id UUID;
    v_docdmd_type_id UUID;
    v_adverse_type_id UUID;

    -- Subrogation Investigation locations
    v_subrog_pending_id UUID;
    v_subrog_transactional_id UUID;
    v_subrog_rfi_id UUID;
    v_subrog_review_id UUID;
    v_subrog_closed_id UUID;

    -- Documentation and Demand Packages locations
    v_docdmd_pending_id UUID;
    v_docdmd_transactional_id UUID;
    v_docdmd_rfi_id UUID;
    v_docdmd_review_id UUID;
    v_docdmd_closed_id UUID;

    -- Adverse Coverage Verification locations
    v_adverse_pending_id UUID;
    v_adverse_transactional_id UUID;
    v_adverse_rfi_id UUID;
    v_adverse_review_id UUID;
    v_adverse_closed_id UUID;

    -- Workflow definition IDs
    v_def_id UUID;
    v_subrog_pending_def UUID;
    v_subrog_transactional_def UUID;
    v_subrog_rfi_def UUID;
    v_subrog_review_def UUID;
    v_subrog_closed_def UUID;
    v_docdmd_pending_def UUID;
    v_docdmd_transactional_def UUID;
    v_docdmd_rfi_def UUID;
    v_docdmd_review_def UUID;
    v_docdmd_closed_def UUID;
    v_adverse_pending_def UUID;
    v_adverse_transactional_def UUID;
    v_adverse_rfi_def UUID;

    -- Loop variables
    v_task_id UUID;
    v_claim_id UUID;
    v_user_idx INT;
    v_loc_id UUID;
    v_i INT;
    v_day INT;
    v_snapshot_date DATE;

    -- Claim IDs array (ordered by claim_number, positions 1-50)
    v_claim_ids UUID[];
BEGIN

    -- =====================================================
    -- Section 0: Setup & Lookups
    -- =====================================================
    RAISE NOTICE 'Section 0: Setup & lookups...';

    SELECT id INTO v_client_id FROM client LIMIT 1;
    SELECT id INTO v_admin_user_id FROM users ORDER BY created_at ASC LIMIT 1;
    SELECT ARRAY_AGG(id ORDER BY email) INTO v_user_ids FROM users WHERE disabled = false;

    -- Load all 50 claim IDs ordered by claim_number into an array
    -- This maps position 1-50 to the actual UUID claim IDs
    SELECT ARRAY_AGG(id ORDER BY claim_number) INTO v_claim_ids
    FROM claim WHERE client_id = v_client_id;

    -- Look up desk location types
    SELECT id INTO v_subrog_type_id FROM desk_location_type
        WHERE client_id = v_client_id AND name = 'Subrogation Investigation' AND deleted_at IS NULL;
    SELECT id INTO v_docdmd_type_id FROM desk_location_type
        WHERE client_id = v_client_id AND name = 'Documentation and Demand Packages' AND deleted_at IS NULL;
    SELECT id INTO v_adverse_type_id FROM desk_location_type
        WHERE client_id = v_client_id AND name = 'Adverse Coverage Verification' AND deleted_at IS NULL;

    -- Look up Subrogation locations
    SELECT id INTO v_subrog_pending_id FROM desk_location
        WHERE client_id = v_client_id AND desk_location_type_id = v_subrog_type_id AND name = 'Pending' AND deleted_at IS NULL;
    SELECT id INTO v_subrog_transactional_id FROM desk_location
        WHERE client_id = v_client_id AND desk_location_type_id = v_subrog_type_id AND name = 'Transactional' AND deleted_at IS NULL;
    SELECT id INTO v_subrog_rfi_id FROM desk_location
        WHERE client_id = v_client_id AND desk_location_type_id = v_subrog_type_id AND name = 'Request for Information' AND deleted_at IS NULL;
    SELECT id INTO v_subrog_review_id FROM desk_location
        WHERE client_id = v_client_id AND desk_location_type_id = v_subrog_type_id AND name = 'Review for Closure' AND deleted_at IS NULL;
    SELECT id INTO v_subrog_closed_id FROM desk_location
        WHERE client_id = v_client_id AND desk_location_type_id = v_subrog_type_id AND name = 'Closed' AND deleted_at IS NULL;

    -- Look up Doc/Demand locations
    SELECT id INTO v_docdmd_pending_id FROM desk_location
        WHERE client_id = v_client_id AND desk_location_type_id = v_docdmd_type_id AND name = 'Pending' AND deleted_at IS NULL;
    SELECT id INTO v_docdmd_transactional_id FROM desk_location
        WHERE client_id = v_client_id AND desk_location_type_id = v_docdmd_type_id AND name = 'Transactional' AND deleted_at IS NULL;
    SELECT id INTO v_docdmd_rfi_id FROM desk_location
        WHERE client_id = v_client_id AND desk_location_type_id = v_docdmd_type_id AND name = 'Request for Information' AND deleted_at IS NULL;
    SELECT id INTO v_docdmd_review_id FROM desk_location
        WHERE client_id = v_client_id AND desk_location_type_id = v_docdmd_type_id AND name = 'Review for Closure' AND deleted_at IS NULL;
    SELECT id INTO v_docdmd_closed_id FROM desk_location
        WHERE client_id = v_client_id AND desk_location_type_id = v_docdmd_type_id AND name = 'Closed' AND deleted_at IS NULL;

    -- Look up Adverse locations
    SELECT id INTO v_adverse_pending_id FROM desk_location
        WHERE client_id = v_client_id AND desk_location_type_id = v_adverse_type_id AND name = 'Pending' AND deleted_at IS NULL;
    SELECT id INTO v_adverse_transactional_id FROM desk_location
        WHERE client_id = v_client_id AND desk_location_type_id = v_adverse_type_id AND name = 'Transactional' AND deleted_at IS NULL;
    SELECT id INTO v_adverse_rfi_id FROM desk_location
        WHERE client_id = v_client_id AND desk_location_type_id = v_adverse_type_id AND name = 'Request for Information' AND deleted_at IS NULL;
    SELECT id INTO v_adverse_review_id FROM desk_location
        WHERE client_id = v_client_id AND desk_location_type_id = v_adverse_type_id AND name = 'Review for Closure' AND deleted_at IS NULL;
    SELECT id INTO v_adverse_closed_id FROM desk_location
        WHERE client_id = v_client_id AND desk_location_type_id = v_adverse_type_id AND name = 'Closed' AND deleted_at IS NULL;

    RAISE NOTICE 'Found % users, subrog_type=%, docdmd_type=%, adverse_type=%',
        array_length(v_user_ids, 1), v_subrog_type_id, v_docdmd_type_id, v_adverse_type_id;

    -- =====================================================
    -- Section 1: Update capacity_threshold and daily_work_units
    -- =====================================================
    RAISE NOTICE 'Section 1: Updating capacity thresholds and work units...';

    -- Low thresholds to create breach scenarios
    UPDATE desk_location SET capacity_threshold = 30 WHERE id = v_subrog_pending_id;
    UPDATE desk_location SET capacity_threshold = 120 WHERE id = v_subrog_transactional_id;
    UPDATE desk_location SET capacity_threshold = 25 WHERE id = v_docdmd_rfi_id;
    UPDATE desk_location SET capacity_threshold = 20 WHERE id = v_adverse_pending_id;

    -- NULL daily_work_units on 2 Adverse locations for getDeskLocationsMissingCapacity
    UPDATE desk_location SET daily_work_units = NULL WHERE id = v_adverse_rfi_id;
    UPDATE desk_location SET daily_work_units = NULL WHERE id = v_adverse_review_id;

    -- =====================================================
    -- Section 1.5: User Desk Location Assignments
    -- Assign users to desk locations with varying priorities
    -- Ensures breaching locations have eligible users for suggestions algorithm
    -- =====================================================
    RAISE NOTICE 'Section 1.5: Creating user desk location assignments...';

    -- User 1: PRIORITY_EXHAUSTION scenario
    -- All 5 priority slots occupied by different locations, eligible for Adverse Pending but will be skipped
    INSERT INTO user_desk_location (user_id, desk_location_id, priority, assigned_at, assigned_by)
    VALUES
        (v_user_ids[1], v_subrog_pending_id, 1, NOW() - INTERVAL '30 days', v_admin_user_id),       -- P1 occupied
        (v_user_ids[1], v_subrog_transactional_id, 2, NOW() - INTERVAL '30 days', v_admin_user_id), -- P2 occupied
        (v_user_ids[1], v_subrog_rfi_id, 3, NOW() - INTERVAL '30 days', v_admin_user_id),           -- P3 occupied
        (v_user_ids[1], v_docdmd_pending_id, 4, NOW() - INTERVAL '30 days', v_admin_user_id),       -- P4 occupied
        (v_user_ids[1], v_docdmd_transactional_id, 5, NOW() - INTERVAL '30 days', v_admin_user_id), -- P5 occupied
        (v_user_ids[1], v_adverse_pending_id, NULL, NOW() - INTERVAL '30 days', v_admin_user_id);   -- Eligible but no slot available!

    -- Subrogation Investigation - distribute users across locations
    -- Users 2-4: Assigned to various Subrogation locations
    INSERT INTO user_desk_location (user_id, desk_location_id, priority, assigned_at, assigned_by)
    VALUES
        (v_user_ids[2], v_subrog_pending_id, 2, NOW() - INTERVAL '25 days', v_admin_user_id),
        (v_user_ids[2], v_subrog_rfi_id, NULL, NOW() - INTERVAL '25 days', v_admin_user_id),  -- eligible, no priority
        (v_user_ids[3], v_subrog_pending_id, NULL, NOW() - INTERVAL '20 days', v_admin_user_id),  -- eligible, no priority
        (v_user_ids[3], v_subrog_transactional_id, 1, NOW() - INTERVAL '20 days', v_admin_user_id),
        (v_user_ids[4], v_subrog_transactional_id, 3, NOW() - INTERVAL '15 days', v_admin_user_id);

    -- Documentation and Demand Packages - distribute users across locations
    -- Users 3-6: Assigned to various Doc/Demand locations
    -- CONTENTION SETUP: Users 5-6 have 4 priority slots filled across locations (P1-P4)
    -- so the algorithm assigns them to Adverse Pending at P5 (last slot), exhausting them
    -- for Doc/Demand RFI. Ignoring Adverse Pending frees P5, allowing Doc/Demand RFI assignment.
    INSERT INTO user_desk_location (user_id, desk_location_id, priority, assigned_at, assigned_by)
    VALUES
        (v_user_ids[3], v_docdmd_pending_id, 2, NOW() - INTERVAL '20 days', v_admin_user_id),
        (v_user_ids[4], v_docdmd_pending_id, 1, NOW() - INTERVAL '18 days', v_admin_user_id),
        (v_user_ids[5], v_docdmd_rfi_id, NULL, NOW() - INTERVAL '15 days', v_admin_user_id),        -- eligible for breach, no priority
        (v_user_ids[5], v_docdmd_transactional_id, 1, NOW() - INTERVAL '15 days', v_admin_user_id), -- P1 non-breaching
        (v_user_ids[5], v_docdmd_pending_id, 4, NOW() - INTERVAL '15 days', v_admin_user_id),       -- P4 non-breaching (contention slot)
        (v_user_ids[6], v_docdmd_rfi_id, NULL, NOW() - INTERVAL '12 days', v_admin_user_id),        -- eligible for breach, no priority
        (v_user_ids[6], v_docdmd_review_id, 1, NOW() - INTERVAL '12 days', v_admin_user_id),        -- P1 non-breaching
        (v_user_ids[6], v_docdmd_transactional_id, 4, NOW() - INTERVAL '12 days', v_admin_user_id); -- P4 non-breaching (contention slot)

    -- Adverse Coverage Verification - distribute users across locations
    -- Users 5-9: Assigned to various Adverse locations
    -- CONTENTION: Users 5-6 eligible for Adverse Pending (NULL priority) and Doc/Demand RFI (NULL priority)
    -- After algorithm assigns them to Adverse Pending at P5, all 5 slots are filled,
    -- causing PRIORITY_EXHAUSTION when Doc/Demand RFI tries to assign them.
    INSERT INTO user_desk_location (user_id, desk_location_id, priority, assigned_at, assigned_by)
    VALUES
        (v_user_ids[5], v_adverse_pending_id, NULL, NOW() - INTERVAL '10 days', v_admin_user_id),   -- eligible for breach, no priority (contention)
        (v_user_ids[5], v_adverse_transactional_id, 2, NOW() - INTERVAL '10 days', v_admin_user_id), -- P2 non-breaching (contention slot)
        (v_user_ids[6], v_adverse_pending_id, NULL, NOW() - INTERVAL '8 days', v_admin_user_id),    -- eligible for breach, no priority (contention)
        (v_user_ids[6], v_adverse_rfi_id, 2, NOW() - INTERVAL '8 days', v_admin_user_id),           -- P2 non-breaching
        (v_user_ids[7], v_adverse_transactional_id, 1, NOW() - INTERVAL '5 days', v_admin_user_id),
        (v_user_ids[7], v_adverse_rfi_id, 3, NOW() - INTERVAL '5 days', v_admin_user_id),
        (v_user_ids[8], v_adverse_rfi_id, NULL, NOW() - INTERVAL '3 days', v_admin_user_id),
        (v_user_ids[8], v_adverse_transactional_id, NULL, NOW() - INTERVAL '3 days', v_admin_user_id),
        (v_user_ids[9], v_adverse_pending_id, 1, NOW() - INTERVAL '2 days', v_admin_user_id),
        (v_user_ids[9], v_adverse_transactional_id, 2, NOW() - INTERVAL '2 days', v_admin_user_id);

    -- Cross-type assignments for suggestion contention
    -- Users 5-6 get P3 at non-breaching Subrogation locations to fill slots P1-P4
    INSERT INTO user_desk_location (user_id, desk_location_id, priority, assigned_at, assigned_by)
    VALUES
        (v_user_ids[5], v_subrog_rfi_id, 3, NOW() - INTERVAL '15 days', v_admin_user_id),       -- P3 non-breaching (contention slot)
        (v_user_ids[6], v_subrog_review_id, 3, NOW() - INTERVAL '12 days', v_admin_user_id);    -- P3 non-breaching (contention slot)

    -- =====================================================
    -- Section 2: Workflow Definitions (13 total)
    -- No global workflow — exercises getDeskLocationsWithoutWorkflow
    -- for Adverse Review for Closure and Adverse Closed
    -- =====================================================
    RAISE NOTICE 'Section 2: Creating workflow definitions...';

    -- Subrogation Investigation (5 workflows - full coverage)
    INSERT INTO workflow_definition (client_id, name, description, desk_location_id, is_active, created_by, created_at)
    VALUES (v_client_id, 'Subrogation Pending Workflow', 'Initial intake, assignment, and routing of new subrogation claims', v_subrog_pending_id, true, v_admin_user_id, NOW())
    RETURNING id INTO v_subrog_pending_def;

    INSERT INTO workflow_definition (client_id, name, description, desk_location_id, is_active, created_by, created_at)
    VALUES (v_client_id, 'Subrogation Transactional Workflow', 'Standard processing, demand execution, and payment tracking for active subrogation claims', v_subrog_transactional_id, true, v_admin_user_id, NOW())
    RETURNING id INTO v_subrog_transactional_def;

    INSERT INTO workflow_definition (client_id, name, description, desk_location_id, is_active, created_by, created_at)
    VALUES (v_client_id, 'Subrogation RFI Workflow', 'Tracking and follow-up on outstanding information requests from adverse carriers', v_subrog_rfi_id, true, v_admin_user_id, NOW())
    RETURNING id INTO v_subrog_rfi_def;

    INSERT INTO workflow_definition (client_id, name, description, desk_location_id, is_active, created_by, created_at)
    VALUES (v_client_id, 'Subrogation Review for Closure Workflow', 'Pre-closure verification and final quality checks on subrogation files', v_subrog_review_id, true, v_admin_user_id, NOW())
    RETURNING id INTO v_subrog_review_def;

    INSERT INTO workflow_definition (client_id, name, description, desk_location_id, is_active, created_by, created_at)
    VALUES (v_client_id, 'Subrogation Closed Workflow', 'Post-closure monitoring and reopen triggers for resolved subrogation files', v_subrog_closed_id, true, v_admin_user_id, NOW())
    RETURNING id INTO v_subrog_closed_def;

    -- Documentation and Demand Packages (5 workflows - full coverage)
    INSERT INTO workflow_definition (client_id, name, description, desk_location_id, is_active, created_by, created_at)
    VALUES (v_client_id, 'Document Pending Workflow', 'Package assembly, document collection, and initial review of demand packages', v_docdmd_pending_id, true, v_admin_user_id, NOW())
    RETURNING id INTO v_docdmd_pending_def;

    INSERT INTO workflow_definition (client_id, name, description, desk_location_id, is_active, created_by, created_at)
    VALUES (v_client_id, 'Demand Package Processing Workflow', 'Active demand preparation, submission tracking, and response management', v_docdmd_transactional_id, true, v_admin_user_id, NOW())
    RETURNING id INTO v_docdmd_transactional_def;

    INSERT INTO workflow_definition (client_id, name, description, desk_location_id, is_active, created_by, created_at)
    VALUES (v_client_id, 'Document Request Tracking Workflow', 'Follow-up escalation and deadline management for outstanding document requests', v_docdmd_rfi_id, true, v_admin_user_id, NOW())
    RETURNING id INTO v_docdmd_rfi_def;

    INSERT INTO workflow_definition (client_id, name, description, desk_location_id, is_active, created_by, created_at)
    VALUES (v_client_id, 'Document Review for Closure Workflow', 'Completeness verification and final sign-off before closing document packages', v_docdmd_review_id, true, v_admin_user_id, NOW())
    RETURNING id INTO v_docdmd_review_def;

    INSERT INTO workflow_definition (client_id, name, description, desk_location_id, is_active, created_by, created_at)
    VALUES (v_client_id, 'Document Closed Workflow', 'Archive, retention policy enforcement, and post-closure audit for document packages', v_docdmd_closed_id, true, v_admin_user_id, NOW())
    RETURNING id INTO v_docdmd_closed_def;

    -- Adverse Coverage Verification (3 of 5 — partial coverage)
    -- Review for Closure and Closed intentionally have NO workflow
    INSERT INTO workflow_definition (client_id, name, description, desk_location_id, is_active, created_by, created_at)
    VALUES (v_client_id, 'Adverse Verification Pending Workflow', 'Initial verification queue for adverse coverage confirmations and policy lookups', v_adverse_pending_id, true, v_admin_user_id, NOW())
    RETURNING id INTO v_adverse_pending_def;

    INSERT INTO workflow_definition (client_id, name, description, desk_location_id, is_active, created_by, created_at)
    VALUES (v_client_id, 'Adverse Verification Active Workflow', 'Active verification processing for adverse carrier coverage details and limits', v_adverse_transactional_id, true, v_admin_user_id, NOW())
    RETURNING id INTO v_adverse_transactional_def;

    INSERT INTO workflow_definition (client_id, name, description, desk_location_id, is_active, created_by, created_at)
    VALUES (v_client_id, 'Adverse Verification RFI Workflow', 'Outstanding information requests to adverse carriers for coverage verification', v_adverse_rfi_id, true, v_admin_user_id, NOW())
    RETURNING id INTO v_adverse_rfi_def;

    -- =====================================================
    -- Section 3: Workflow Thresholds
    -- Adverse Active and RFI intentionally lack LOCATION_AGE
    -- to exercise getWorkflowsWithoutLocationAgeThreshold
    -- =====================================================
    RAISE NOTICE 'Section 3: Creating workflow thresholds...';

    -- Subrogation LOCATION_AGE thresholds (hours)
    INSERT INTO workflow_threshold (client_id, workflow_definition_id, threshold_type, threshold_value, is_active, created_by, created_at)
    VALUES
        (v_client_id, v_subrog_pending_def, 'location_age', 72, true, v_admin_user_id, NOW()),
        (v_client_id, v_subrog_transactional_def, 'location_age', 240, true, v_admin_user_id, NOW()),
        (v_client_id, v_subrog_rfi_def, 'location_age', 120, true, v_admin_user_id, NOW()),
        (v_client_id, v_subrog_review_def, 'location_age', 168, true, v_admin_user_id, NOW()),
        (v_client_id, v_subrog_closed_def, 'location_age', 720, true, v_admin_user_id, NOW());

    -- Subrogation USER_CAPACITY threshold
    INSERT INTO workflow_threshold (client_id, workflow_definition_id, threshold_type, threshold_value, is_active, created_by, created_at)
    VALUES (v_client_id, v_subrog_transactional_def, 'user_capacity', 50, true, v_admin_user_id, NOW());

    -- Doc/Demand LOCATION_AGE thresholds (hours)
    INSERT INTO workflow_threshold (client_id, workflow_definition_id, threshold_type, threshold_value, is_active, created_by, created_at)
    VALUES
        (v_client_id, v_docdmd_pending_def, 'location_age', 48, true, v_admin_user_id, NOW()),
        (v_client_id, v_docdmd_transactional_def, 'location_age', 168, true, v_admin_user_id, NOW()),
        (v_client_id, v_docdmd_rfi_def, 'location_age', 96, true, v_admin_user_id, NOW()),
        (v_client_id, v_docdmd_review_def, 'location_age', 120, true, v_admin_user_id, NOW()),
        (v_client_id, v_docdmd_closed_def, 'location_age', 480, true, v_admin_user_id, NOW());

    -- Doc/Demand USER_CAPACITY threshold
    INSERT INTO workflow_threshold (client_id, workflow_definition_id, threshold_type, threshold_value, is_active, created_by, created_at)
    VALUES (v_client_id, v_docdmd_transactional_def, 'user_capacity', 40, true, v_admin_user_id, NOW());

    -- Adverse: ONLY Pending gets LOCATION_AGE
    -- Active and RFI intentionally have NO LOCATION_AGE threshold
    INSERT INTO workflow_threshold (client_id, workflow_definition_id, threshold_type, threshold_value, is_active, created_by, created_at)
    VALUES (v_client_id, v_adverse_pending_def, 'location_age', 36, true, v_admin_user_id, NOW());

    -- =====================================================
    -- Section 4: Workflow Rules
    -- Covers all trigger types, action types, execution modes
    -- =====================================================
    RAISE NOTICE 'Section 4: Creating workflow rules...';

    -- ----- Subrogation Pending (3 rules) -----
    INSERT INTO workflow_rule (client_id, workflow_definition_id, name, description, trigger_type, action_type, action_config, conditions, execution_mode, priority, is_active, created_by, created_at)
    VALUES
        (v_client_id, v_subrog_pending_def, 'Route stale pending claims', 'Move claims sitting in pending too long to transactional for active processing',
            'location_age', 'move_claim', jsonb_build_object('targetLocationId', v_subrog_transactional_id), '[]'::jsonb, 'suggest', 10, true, v_admin_user_id, NOW()),
        (v_client_id, v_subrog_pending_def, 'Create intake review task', 'Generate a review task for newly arrived subrogation claims',
            'manual', 'create_task', '{"taskType": "review", "title": "Initial subrogation intake review", "workUnits": 3}'::jsonb, '[]'::jsonb, 'suggest', 20, true, v_admin_user_id, NOW()),
        (v_client_id, v_subrog_pending_def, 'Notify on coverage change', 'Alert assigned user when coverage information is updated on a pending claim',
            'field_change', 'notify_user', '{"message": "Coverage details updated on pending subrogation claim"}'::jsonb, '[{"field": "coverage_status"}]'::jsonb, 'suggest', 30, true, v_admin_user_id, NOW());

    -- ----- Subrogation Transactional (4 rules) -----
    INSERT INTO workflow_rule (client_id, workflow_definition_id, name, description, trigger_type, action_type, action_config, conditions, execution_mode, priority, is_active, created_by, created_at)
    VALUES
        (v_client_id, v_subrog_transactional_def, 'Advance completed claims to review', 'Move claims to review queue once all transactional tasks are completed',
            'task_completed', 'move_claim', jsonb_build_object('targetLocationId', v_subrog_review_id), '[]'::jsonb, 'suggest', 10, true, v_admin_user_id, NOW()),
        (v_client_id, v_subrog_transactional_def, 'Escalate aging transactional claims', 'Increase priority for claims approaching SLA in transactional processing',
            'location_age', 'update_priority', '{"priority": "high"}'::jsonb, '[]'::jsonb, 'auto', 20, true, v_admin_user_id, NOW()),
        (v_client_id, v_subrog_transactional_def, 'Notify supervisor on claim age', 'Send notification when a claim has been in subrogation for an extended period',
            'claim_age', 'notify_user', '{"message": "Subrogation claim aging beyond expected processing time", "daysThreshold": 60}'::jsonb, '[]'::jsonb, 'suggest', 30, true, v_admin_user_id, NOW()),
        (v_client_id, v_subrog_transactional_def, 'Create demand follow-up task', 'Create a follow-up task after demand letter is sent',
            'manual', 'create_task', '{"taskType": "follow_up", "title": "Follow up on subrogation demand response", "workUnits": 4}'::jsonb, '[]'::jsonb, 'suggest', 40, true, v_admin_user_id, NOW());

    -- ----- Subrogation RFI (2 rules) -----
    INSERT INTO workflow_rule (client_id, workflow_definition_id, name, description, trigger_type, action_type, action_config, conditions, execution_mode, priority, is_active, created_by, created_at)
    VALUES
        (v_client_id, v_subrog_rfi_def, 'Create RFI follow-up task', 'Generate follow-up task for requests that have been outstanding too long',
            'location_age', 'create_task', '{"taskType": "follow_up", "title": "Follow up on outstanding RFI to adverse carrier", "workUnits": 2}'::jsonb, '[]'::jsonb, 'suggest', 10, true, v_admin_user_id, NOW()),
        (v_client_id, v_subrog_rfi_def, 'Return to transactional on response', 'Move claim back to transactional once requested information is received',
            'field_change', 'move_claim', jsonb_build_object('targetLocationId', v_subrog_transactional_id), '[{"field": "rfi_status", "value": "received"}]'::jsonb, 'suggest', 20, true, v_admin_user_id, NOW());

    -- ----- Subrogation Review for Closure (2 rules) -----
    INSERT INTO workflow_rule (client_id, workflow_definition_id, name, description, trigger_type, action_type, action_config, conditions, execution_mode, priority, is_active, created_by, created_at)
    VALUES
        (v_client_id, v_subrog_review_def, 'Close reviewed claims', 'Move claims to closed once all review tasks are completed satisfactorily',
            'task_completed', 'move_claim', jsonb_build_object('targetLocationId', v_subrog_closed_id), '[]'::jsonb, 'suggest', 10, true, v_admin_user_id, NOW()),
        (v_client_id, v_subrog_review_def, 'Alert on extended review', 'Automatically notify supervisor when review exceeds expected timeframe',
            'location_age', 'notify_user', '{"message": "Subrogation claim review exceeding expected timeframe"}'::jsonb, '[]'::jsonb, 'auto', 20, true, v_admin_user_id, NOW());

    -- ----- Subrogation Closed (1 rule) -----
    INSERT INTO workflow_rule (client_id, workflow_definition_id, name, description, trigger_type, action_type, action_config, conditions, execution_mode, priority, is_active, created_by, created_at)
    VALUES
        (v_client_id, v_subrog_closed_def, 'Reopen aging closed claims', 'Suggest reopening claims in closed status that may require additional follow-up',
            'claim_age', 'notify_user', '{"message": "Closed subrogation file may require reopen review", "daysThreshold": 180}'::jsonb, '[]'::jsonb, 'suggest', 10, true, v_admin_user_id, NOW());

    -- ----- Doc/Demand Pending (3 rules) -----
    INSERT INTO workflow_rule (client_id, workflow_definition_id, name, description, trigger_type, action_type, action_config, conditions, execution_mode, priority, is_active, created_by, created_at)
    VALUES
        (v_client_id, v_docdmd_pending_def, 'Route pending packages', 'Move document packages waiting too long to active processing',
            'location_age', 'move_claim', jsonb_build_object('targetLocationId', v_docdmd_transactional_id), '[]'::jsonb, 'suggest', 10, true, v_admin_user_id, NOW()),
        (v_client_id, v_docdmd_pending_def, 'Create package assembly task', 'Generate task to begin assembling the demand package',
            'manual', 'create_task', '{"taskType": "generic", "title": "Assemble demand package documents", "workUnits": 5}'::jsonb, '[]'::jsonb, 'suggest', 20, true, v_admin_user_id, NOW()),
        (v_client_id, v_docdmd_pending_def, 'Notify on new document upload', 'Alert team when new documents are uploaded to a pending package',
            'field_change', 'notify_user', '{"message": "New document uploaded to pending demand package"}'::jsonb, '[{"field": "document_count"}]'::jsonb, 'suggest', 30, true, v_admin_user_id, NOW());

    -- ----- Doc/Demand Transactional (4 rules) -----
    INSERT INTO workflow_rule (client_id, workflow_definition_id, name, description, trigger_type, action_type, action_config, conditions, execution_mode, priority, is_active, created_by, created_at)
    VALUES
        (v_client_id, v_docdmd_transactional_def, 'Move completed packages to review', 'Advance to review queue when demand package preparation is complete',
            'task_completed', 'move_claim', jsonb_build_object('targetLocationId', v_docdmd_review_id), '[]'::jsonb, 'suggest', 10, true, v_admin_user_id, NOW()),
        (v_client_id, v_docdmd_transactional_def, 'Escalate stale packages', 'Increase priority for demand packages approaching submission deadline',
            'location_age', 'update_priority', '{"priority": "high"}'::jsonb, '[]'::jsonb, 'auto', 20, true, v_admin_user_id, NOW()),
        (v_client_id, v_docdmd_transactional_def, 'Notify on aging demand prep', 'Alert user when demand package preparation is taking longer than expected',
            'claim_age', 'notify_user', '{"message": "Demand package preparation exceeding expected timeline", "daysThreshold": 45}'::jsonb, '[]'::jsonb, 'suggest', 30, true, v_admin_user_id, NOW()),
        (v_client_id, v_docdmd_transactional_def, 'Create demand submission task', 'Create task to submit completed demand package to adverse carrier',
            'manual', 'create_task', '{"taskType": "send_demand", "title": "Submit demand package to adverse carrier", "workUnits": 3}'::jsonb, '[]'::jsonb, 'suggest', 40, true, v_admin_user_id, NOW());

    -- ----- Doc/Demand RFI (2 rules) -----
    INSERT INTO workflow_rule (client_id, workflow_definition_id, name, description, trigger_type, action_type, action_config, conditions, execution_mode, priority, is_active, created_by, created_at)
    VALUES
        (v_client_id, v_docdmd_rfi_def, 'Create document follow-up task', 'Generate follow-up task for outstanding document requests nearing deadline',
            'location_age', 'create_task', '{"taskType": "follow_up", "title": "Follow up on outstanding document request", "workUnits": 2}'::jsonb, '[]'::jsonb, 'suggest', 10, true, v_admin_user_id, NOW()),
        (v_client_id, v_docdmd_rfi_def, 'Return to transactional on receipt', 'Move claim back to transactional once requested documents are received',
            'field_change', 'move_claim', jsonb_build_object('targetLocationId', v_docdmd_transactional_id), '[{"field": "document_received"}]'::jsonb, 'suggest', 20, true, v_admin_user_id, NOW());

    -- ----- Doc/Demand Review for Closure (2 rules) -----
    INSERT INTO workflow_rule (client_id, workflow_definition_id, name, description, trigger_type, action_type, action_config, conditions, execution_mode, priority, is_active, created_by, created_at)
    VALUES
        (v_client_id, v_docdmd_review_def, 'Close verified packages', 'Move to closed once document completeness is verified and signed off',
            'task_completed', 'move_claim', jsonb_build_object('targetLocationId', v_docdmd_closed_id), '[]'::jsonb, 'suggest', 10, true, v_admin_user_id, NOW()),
        (v_client_id, v_docdmd_review_def, 'Alert on extended document review', 'Notify supervisor when document review exceeds expected timeframe',
            'location_age', 'notify_user', '{"message": "Document package review exceeding expected timeframe"}'::jsonb, '[]'::jsonb, 'auto', 20, true, v_admin_user_id, NOW());

    -- ----- Doc/Demand Closed (1 rule) -----
    INSERT INTO workflow_rule (client_id, workflow_definition_id, name, description, trigger_type, action_type, action_config, conditions, execution_mode, priority, is_active, created_by, created_at)
    VALUES
        (v_client_id, v_docdmd_closed_def, 'Notify on retention expiry', 'Suggest review of closed document packages approaching retention period end',
            'claim_age', 'notify_user', '{"message": "Closed document package approaching retention period expiry", "daysThreshold": 365}'::jsonb, '[]'::jsonb, 'suggest', 10, true, v_admin_user_id, NOW());

    -- ----- Adverse Pending (3 rules) -----
    INSERT INTO workflow_rule (client_id, workflow_definition_id, name, description, trigger_type, action_type, action_config, conditions, execution_mode, priority, is_active, created_by, created_at)
    VALUES
        (v_client_id, v_adverse_pending_def, 'Route stale verification requests', 'Move pending adverse verification requests to active processing',
            'location_age', 'move_claim', jsonb_build_object('targetLocationId', v_adverse_transactional_id), '[]'::jsonb, 'suggest', 10, true, v_admin_user_id, NOW()),
        (v_client_id, v_adverse_pending_def, 'Create verification intake task', 'Generate initial verification task for new adverse coverage requests',
            'manual', 'create_task', '{"taskType": "review", "title": "Initial adverse coverage verification review", "workUnits": 3}'::jsonb, '[]'::jsonb, 'suggest', 20, true, v_admin_user_id, NOW()),
        (v_client_id, v_adverse_pending_def, 'Notify on policy update', 'Alert user when adverse policy information changes on pending verification',
            'field_change', 'notify_user', '{"message": "Adverse policy information updated on pending verification"}'::jsonb, '[{"field": "policy_status"}]'::jsonb, 'suggest', 30, true, v_admin_user_id, NOW());

    -- ----- Adverse Transactional (3 rules) -----
    INSERT INTO workflow_rule (client_id, workflow_definition_id, name, description, trigger_type, action_type, action_config, conditions, execution_mode, priority, is_active, created_by, created_at)
    VALUES
        (v_client_id, v_adverse_transactional_def, 'Move verified claims to RFI', 'Route claims requiring additional information to RFI queue',
            'task_completed', 'move_claim', jsonb_build_object('targetLocationId', v_adverse_rfi_id), '[]'::jsonb, 'suggest', 10, true, v_admin_user_id, NOW()),
        (v_client_id, v_adverse_transactional_def, 'Escalate aging verifications', 'Increase priority for verifications approaching adverse carrier response deadline',
            'location_age', 'update_priority', '{"priority": "high"}'::jsonb, '[]'::jsonb, 'auto', 20, true, v_admin_user_id, NOW()),
        (v_client_id, v_adverse_transactional_def, 'Create carrier outreach task', 'Create task to contact adverse carrier for coverage confirmation',
            'manual', 'create_task', '{"taskType": "outbound_call", "title": "Contact adverse carrier for coverage confirmation", "workUnits": 2}'::jsonb, '[]'::jsonb, 'suggest', 30, true, v_admin_user_id, NOW());

    -- ----- Adverse RFI (2 rules) -----
    INSERT INTO workflow_rule (client_id, workflow_definition_id, name, description, trigger_type, action_type, action_config, conditions, execution_mode, priority, is_active, created_by, created_at)
    VALUES
        (v_client_id, v_adverse_rfi_def, 'Create adverse RFI follow-up task', 'Generate follow-up task for outstanding adverse carrier information requests',
            'location_age', 'create_task', '{"taskType": "follow_up", "title": "Follow up with adverse carrier on RFI", "workUnits": 2}'::jsonb, '[]'::jsonb, 'suggest', 10, true, v_admin_user_id, NOW()),
        (v_client_id, v_adverse_rfi_def, 'Return to active on response', 'Move claim back to active verification once adverse carrier responds',
            'field_change', 'move_claim', jsonb_build_object('targetLocationId', v_adverse_transactional_id), '[{"field": "rfi_response_status", "value": "received"}]'::jsonb, 'suggest', 20, true, v_admin_user_id, NOW());

    -- =====================================================
    -- Section 5: Tasks (~120 additional)
    -- Distributed across locations and users to exercise
    -- breach detection, availability scoring, throughput
    -- =====================================================
    RAISE NOTICE 'Section 5: Creating tasks...';

    -- Helper: assign desk_location_id to claims 1-50 for workflow context
    -- Using v_claim_ids array where position matches the original claim numbering
    -- Claims 1-10: Subrogation Pending
    FOR v_i IN 1..10 LOOP
        UPDATE claim SET desk_location_id = v_subrog_pending_id WHERE id = v_claim_ids[v_i] AND client_id = v_client_id;
    END LOOP;
    -- Claims 11-18: Subrogation Transactional
    FOR v_i IN 11..18 LOOP
        UPDATE claim SET desk_location_id = v_subrog_transactional_id WHERE id = v_claim_ids[v_i] AND client_id = v_client_id;
    END LOOP;
    -- Claims 19-24: Subrogation RFI
    FOR v_i IN 19..24 LOOP
        UPDATE claim SET desk_location_id = v_subrog_rfi_id WHERE id = v_claim_ids[v_i] AND client_id = v_client_id;
    END LOOP;
    -- Claims 25-28: Subrogation Review
    FOR v_i IN 25..28 LOOP
        UPDATE claim SET desk_location_id = v_subrog_review_id WHERE id = v_claim_ids[v_i] AND client_id = v_client_id;
    END LOOP;
    -- Claims 29-30: Subrogation Closed
    FOR v_i IN 29..30 LOOP
        UPDATE claim SET desk_location_id = v_subrog_closed_id WHERE id = v_claim_ids[v_i] AND client_id = v_client_id;
    END LOOP;
    -- Claims 31-36: Doc/Demand Pending
    FOR v_i IN 31..36 LOOP
        UPDATE claim SET desk_location_id = v_docdmd_pending_id WHERE id = v_claim_ids[v_i] AND client_id = v_client_id;
    END LOOP;
    -- Claims 37-40: Doc/Demand Transactional
    FOR v_i IN 37..40 LOOP
        UPDATE claim SET desk_location_id = v_docdmd_transactional_id WHERE id = v_claim_ids[v_i] AND client_id = v_client_id;
    END LOOP;
    -- Claims 41-44: Doc/Demand RFI
    FOR v_i IN 41..44 LOOP
        UPDATE claim SET desk_location_id = v_docdmd_rfi_id WHERE id = v_claim_ids[v_i] AND client_id = v_client_id;
    END LOOP;
    -- Claims 45-46: Doc/Demand Review
    FOR v_i IN 45..46 LOOP
        UPDATE claim SET desk_location_id = v_docdmd_review_id WHERE id = v_claim_ids[v_i] AND client_id = v_client_id;
    END LOOP;
    -- Claims 47-48: Doc/Demand Closed
    FOR v_i IN 47..48 LOOP
        UPDATE claim SET desk_location_id = v_docdmd_closed_id WHERE id = v_claim_ids[v_i] AND client_id = v_client_id;
    END LOOP;
    -- Claims 49-50: Adverse Pending
    UPDATE claim SET desk_location_id = v_adverse_pending_id WHERE id = v_claim_ids[49] AND client_id = v_client_id;
    UPDATE claim SET desk_location_id = v_adverse_pending_id WHERE id = v_claim_ids[50] AND client_id = v_client_id;

    -- ---- BREACH-CREATING TASKS ----
    -- Subrogation Pending (threshold=30): 8 open tasks x 5-10 work_units = 40-80 total (BREACH)
    FOR v_i IN 1..8 LOOP
        INSERT INTO task (client_id, claim_id, desk_location_id, task_type, status, title, description, work_units, assigned_to, assigned_at, created_at)
        VALUES (
            v_client_id,
            v_claim_ids[(v_i % 10) + 1],  -- claims 1-10
            v_subrog_pending_id,
            CASE v_i % 3 WHEN 0 THEN 'review' WHEN 1 THEN 'follow_up' ELSE 'generic' END,
            'pending',
            'Subrogation intake review - claim batch ' || v_i,
            'Review incoming subrogation documentation and verify claim eligibility',
            5 + (v_i % 6),  -- 5-10 work units
            CASE WHEN v_i <= 3 THEN NULL ELSE v_user_ids[((v_i - 1) % array_length(v_user_ids, 1)) + 1] END,
            NOW() - (v_i || ' days')::INTERVAL,
            NOW() - (v_i || ' days')::INTERVAL
        );
    END LOOP;

    -- Doc/Demand RFI (threshold=25): 6 open tasks x 5-8 units = 30-48 total (BREACH)
    FOR v_i IN 1..6 LOOP
        INSERT INTO task (client_id, claim_id, desk_location_id, task_type, status, title, description, work_units, assigned_to, assigned_at, created_at)
        VALUES (
            v_client_id,
            v_claim_ids[40 + (v_i % 4) + 1],  -- claims 41-44
            v_docdmd_rfi_id,
            CASE v_i % 2 WHEN 0 THEN 'follow_up' ELSE 'request_document' END,
            'pending',
            'Follow up on outstanding document request - batch ' || v_i,
            'Contact requesting party for overdue document submission',
            5 + (v_i % 4),  -- 5-8 work units
            CASE WHEN v_i <= 2 THEN NULL ELSE v_user_ids[((v_i + 2) % array_length(v_user_ids, 1)) + 1] END,
            NOW() - (v_i || ' days')::INTERVAL,
            NOW() - (v_i || ' days')::INTERVAL
        );
    END LOOP;

    -- Adverse Pending (threshold=20): 5 open tasks x 5-10 units = 25-50 total (SEVERE BREACH)
    FOR v_i IN 1..5 LOOP
        INSERT INTO task (client_id, claim_id, desk_location_id, task_type, status, title, description, work_units, assigned_to, assigned_at, created_at)
        VALUES (
            v_client_id,
            v_claim_ids[49 + (v_i % 2)],  -- claims 49-50
            v_adverse_pending_id,
            CASE v_i % 2 WHEN 0 THEN 'review' ELSE 'outbound_call' END,
            'pending',
            'Adverse coverage verification review - batch ' || v_i,
            'Verify adverse carrier coverage details and policy limits',
            5 + (v_i * 2 % 6),  -- 5-10 work units
            CASE WHEN v_i <= 2 THEN NULL ELSE v_user_ids[((v_i + 4) % array_length(v_user_ids, 1)) + 1] END,
            NOW() - (v_i || ' days')::INTERVAL,
            NOW() - (v_i || ' days')::INTERVAL
        );
    END LOOP;

    -- ---- USER AVAILABILITY PATTERN TASKS ----
    -- User 1 (admin): 2 in_progress tasks with high remaining work units
    INSERT INTO task (client_id, claim_id, desk_location_id, task_type, status, title, description, work_units, assigned_to, assigned_at, started_at, created_at)
    VALUES
        (v_client_id, v_claim_ids[11], v_subrog_transactional_id, 'send_demand', 'in_progress', 'Prepare subrogation demand letter', 'Draft and review demand letter for adverse carrier with supporting documentation', 8, v_user_ids[1], NOW() - INTERVAL '1 hour', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '2 days'),
        (v_client_id, v_claim_ids[12], v_subrog_transactional_id, 'review', 'in_progress', 'Review settlement offer response', 'Analyze adverse carrier settlement counter-offer and prepare recommendation', 6, v_user_ids[1], NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '3 days');

    -- User 2: 1 in_progress, nearly done (low remaining work)
    INSERT INTO task (client_id, claim_id, desk_location_id, task_type, status, title, description, work_units, assigned_to, assigned_at, started_at, created_at)
    VALUES (v_client_id, v_claim_ids[13], v_subrog_transactional_id, 'outbound_call', 'in_progress', 'Contact adverse adjuster', 'Follow-up call with adverse carrier adjuster regarding pending demand', 2, v_user_ids[2], NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours 50 minutes', NOW() - INTERVAL '1 day');

    -- User 3: NO in_progress tasks (immediately available, availability score=0)
    -- Only completed tasks for user 3
    INSERT INTO task (client_id, claim_id, desk_location_id, task_type, status, title, description, work_units, assigned_to, assigned_at, started_at, completed_at, completion_notes, created_at)
    VALUES (v_client_id, v_claim_ids[14], v_subrog_transactional_id, 'letter', 'completed', 'Send acknowledgment letter', 'Send initial claim acknowledgment letter to insured', 2, v_user_ids[3], NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days', 'Letter sent via certified mail', NOW() - INTERVAL '6 days');

    -- User 4: 1 in_progress, medium remaining work
    INSERT INTO task (client_id, claim_id, desk_location_id, task_type, status, title, description, work_units, assigned_to, assigned_at, started_at, created_at)
    VALUES (v_client_id, v_claim_ids[15], v_subrog_transactional_id, 'generic', 'in_progress', 'Prepare demand package exhibits', 'Compile and organize supporting exhibits for subrogation demand', 5, v_user_ids[4], NOW() - INTERVAL '4 hours', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 days');

    -- Users 5-7: Assigned pending tasks only (not started)
    INSERT INTO task (client_id, claim_id, desk_location_id, task_type, status, title, description, work_units, assigned_to, assigned_at, created_at)
    VALUES
        (v_client_id, v_claim_ids[16], v_subrog_transactional_id, 'request_document', 'pending', 'Request police report', 'Obtain official police report for subrogation claim', 3, v_user_ids[5], NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
        (v_client_id, v_claim_ids[17], v_subrog_transactional_id, 'follow_up', 'pending', 'Follow up with insured on damages', 'Contact insured to clarify reported damage amounts', 2, v_user_ids[6], NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
        (v_client_id, v_claim_ids[18], v_subrog_transactional_id, 'review', 'pending', 'Review liability determination', 'Review and validate liability determination for subrogation potential', 4, v_user_ids[7], NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days');

    -- Users 8-10: Mix of completed and pending
    INSERT INTO task (client_id, claim_id, desk_location_id, task_type, status, title, description, work_units, assigned_to, assigned_at, started_at, completed_at, completion_notes, created_at)
    VALUES
        (v_client_id, v_claim_ids[31], v_docdmd_pending_id, 'review', 'completed', 'Review demand package completeness', 'Verify all required documents are included in demand package', 3, v_user_ids[8], NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days', NOW() - INTERVAL '5 days', 'All documents verified present', NOW() - INTERVAL '8 days'),
        (v_client_id, v_claim_ids[32], v_docdmd_pending_id, 'generic', 'completed', 'Organize claim documentation', 'Sort and index all claim-related documentation for package assembly', 4, v_user_ids[9], NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days', NOW() - INTERVAL '4 days', 'Documents indexed and organized by category', NOW() - INTERVAL '7 days'),
        (v_client_id, v_claim_ids[33], v_docdmd_pending_id, 'send_document', 'completed', 'Send preliminary demand draft', 'Send preliminary demand letter draft for internal review', 2, v_user_ids[10], NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 days', 'Draft sent to supervisor for review', NOW() - INTERVAL '6 days');

    INSERT INTO task (client_id, claim_id, desk_location_id, task_type, status, title, description, work_units, assigned_to, assigned_at, created_at)
    VALUES
        (v_client_id, v_claim_ids[34], v_docdmd_pending_id, 'request_document', 'pending', 'Request repair estimates', 'Obtain itemized repair estimates from contractor', 3, v_user_ids[8], NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
        (v_client_id, v_claim_ids[35], v_docdmd_pending_id, 'letter', 'pending', 'Send status update to insured', 'Prepare and mail claim status update letter to insured', 2, v_user_ids[9], NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day');

    -- ---- ADDITIONAL DISTRIBUTED TASKS ----
    -- In-progress tasks across various locations
    INSERT INTO task (client_id, claim_id, desk_location_id, task_type, status, title, description, work_units, assigned_to, assigned_at, started_at, created_at)
    VALUES
        (v_client_id, v_claim_ids[19], v_subrog_rfi_id, 'outbound_call', 'in_progress', 'Call adverse carrier claims dept', 'Contact adverse carrier to request status update on information request', 2, v_user_ids[2], NOW() - INTERVAL '1 day', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '2 days'),
        (v_client_id, v_claim_ids[20], v_subrog_rfi_id, 'follow_up', 'in_progress', 'Follow up on medical records request', 'Contact medical provider for outstanding records request', 3, v_user_ids[4], NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '4 days'),
        (v_client_id, v_claim_ids[37], v_docdmd_transactional_id, 'send_demand', 'in_progress', 'Finalize demand package submission', 'Complete final review and submit demand package to adverse carrier', 5, v_user_ids[1], NOW() - INTERVAL '2 days', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '3 days'),
        (v_client_id, v_claim_ids[38], v_docdmd_transactional_id, 'review', 'in_progress', 'Review adverse response to demand', 'Analyze adverse carrier response to submitted demand package', 4, v_user_ids[4], NOW() - INTERVAL '1 day', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '2 days');

    -- Completed tasks across various locations (some today for throughput query 0.6)
    INSERT INTO task (client_id, claim_id, desk_location_id, task_type, status, title, description, work_units, assigned_to, assigned_at, started_at, completed_at, completion_notes, created_at)
    VALUES
        -- Completed TODAY (throughput)
        (v_client_id, v_claim_ids[25], v_subrog_review_id, 'review', 'completed', 'Final subrogation file review', 'Complete final quality review of subrogation file before closure', 3, v_user_ids[3], NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 hours', 'File review complete, all documentation in order', NOW() - INTERVAL '4 days'),
        (v_client_id, v_claim_ids[26], v_subrog_review_id, 'generic', 'completed', 'Verify recovery amounts', 'Cross-reference recovery amounts with settlement records', 2, v_user_ids[5], NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 hour', 'Recovery amounts verified and reconciled', NOW() - INTERVAL '3 days'),
        (v_client_id, v_claim_ids[39], v_docdmd_transactional_id, 'send_document', 'completed', 'Send demand letter to adverse', 'Transmit finalized demand letter and supporting documentation', 3, v_user_ids[6], NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 hours', 'Demand letter sent via certified mail', NOW() - INTERVAL '5 days'),
        (v_client_id, v_claim_ids[40], v_docdmd_transactional_id, 'outbound_call', 'completed', 'Confirm demand receipt', 'Call adverse carrier to confirm receipt of demand package', 1, v_user_ids[7], NOW() - INTERVAL '1 day', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '30 minutes', 'Adverse confirmed receipt, assigned to their adjuster', NOW() - INTERVAL '2 days'),
        (v_client_id, v_claim_ids[21], v_subrog_rfi_id, 'follow_up', 'completed', 'Adverse carrier RFI follow-up', 'Follow up on outstanding RFI sent to adverse carrier 2 weeks ago', 2, v_user_ids[8], NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '4 hours', 'Adverse carrier provided requested documentation', NOW() - INTERVAL '4 days'),
        (v_client_id, v_claim_ids[45], v_docdmd_review_id, 'review', 'completed', 'Package completeness verification', 'Verify demand package contains all required documents and exhibits', 3, v_user_ids[9], NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '5 hours', 'Package verified complete with all exhibits', NOW() - INTERVAL '3 days'),
        -- Completed RECENTLY (not today)
        (v_client_id, v_claim_ids[22], v_subrog_rfi_id, 'request_document', 'completed', 'Request adverse policy declaration', 'Request copy of adverse carrier policy declarations page', 2, v_user_ids[2], NOW() - INTERVAL '8 days', NOW() - INTERVAL '7 days', NOW() - INTERVAL '3 days', 'Policy declarations received and filed', NOW() - INTERVAL '9 days'),
        (v_client_id, v_claim_ids[23], v_subrog_rfi_id, 'letter', 'completed', 'Send second RFI notice', 'Send follow-up notice for outstanding information request', 1, v_user_ids[6], NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days', NOW() - INTERVAL '5 days', 'Second notice sent, response received within 48 hours', NOW() - INTERVAL '11 days'),
        (v_client_id, v_claim_ids[27], v_subrog_review_id, 'generic', 'completed', 'Reconcile payment records', 'Reconcile all payments and recoveries before closure', 4, v_user_ids[3], NOW() - INTERVAL '6 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days', 'All payments reconciled, net recovery calculated', NOW() - INTERVAL '7 days'),
        (v_client_id, v_claim_ids[46], v_docdmd_review_id, 'generic', 'completed', 'Final document index review', 'Review document index for completeness and accuracy', 2, v_user_ids[10], NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '2 days', 'Document index verified accurate', NOW() - INTERVAL '6 days');

    -- Created TODAY tasks (throughput - created_at today)
    INSERT INTO task (client_id, claim_id, desk_location_id, task_type, status, title, description, work_units, assigned_to, assigned_at, created_at)
    VALUES
        (v_client_id, v_claim_ids[2], v_subrog_pending_id, 'review', 'pending', 'New subrogation intake assessment', 'Assess newly received subrogation referral for viability', 4, v_user_ids[5], NOW(), NOW()),
        (v_client_id, v_claim_ids[3], v_subrog_pending_id, 'generic', 'pending', 'Verify adverse insurance coverage', 'Confirm adverse party has active insurance coverage', 3, v_user_ids[6], NOW(), NOW()),
        (v_client_id, v_claim_ids[36], v_docdmd_pending_id, 'request_document', 'pending', 'Request updated medical bills', 'Request current medical billing statements from provider', 2, v_user_ids[7], NOW(), NOW()),
        (v_client_id, v_claim_ids[41], v_docdmd_rfi_id, 'follow_up', 'pending', 'Follow up on repair authorization', 'Contact contractor regarding outstanding repair authorization', 2, v_user_ids[8], NOW(), NOW()),
        (v_client_id, v_claim_ids[49], v_adverse_pending_id, 'outbound_call', 'pending', 'Call adverse carrier for policy info', 'Contact adverse carrier to obtain policy coverage details', 3, v_user_ids[9], NOW(), NOW()),
        (v_client_id, v_claim_ids[50], v_adverse_pending_id, 'review', 'pending', 'Review adverse declarations page', 'Analyze adverse carrier declarations page for coverage limits', 3, v_user_ids[10], NOW(), NOW());

    -- Cancelled tasks
    INSERT INTO task (client_id, claim_id, desk_location_id, task_type, status, title, description, work_units, assigned_to, assigned_at, created_at)
    VALUES
        (v_client_id, v_claim_ids[29], v_subrog_closed_id, 'follow_up', 'cancelled', 'Reopen review - superseded', 'Previously scheduled reopen review, superseded by manager decision', 2, v_user_ids[1], NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
        (v_client_id, v_claim_ids[30], v_subrog_closed_id, 'letter', 'cancelled', 'Send closure notification - duplicate', 'Duplicate closure notification task, cancelled', 1, v_user_ids[2], NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
        (v_client_id, v_claim_ids[47], v_docdmd_closed_id, 'send_document', 'cancelled', 'Send archive confirmation - cancelled', 'Archive confirmation cancelled due to file reopening', 2, v_user_ids[3], NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
        (v_client_id, v_claim_ids[48], v_docdmd_closed_id, 'generic', 'cancelled', 'Retention review - rescheduled', 'Retention review rescheduled to next quarter', 3, v_user_ids[4], NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days');

    -- Additional pending tasks for various locations (non-breach, under threshold)
    INSERT INTO task (client_id, claim_id, desk_location_id, task_type, status, title, description, work_units, assigned_to, assigned_at, created_at)
    VALUES
        (v_client_id, v_claim_ids[25], v_subrog_review_id, 'review', 'pending', 'Pre-closure checklist verification', 'Verify all closure checklist items are completed', 3, v_user_ids[5], NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
        (v_client_id, v_claim_ids[28], v_subrog_review_id, 'generic', 'pending', 'Calculate net recovery', 'Calculate final net recovery amount for closure report', 2, v_user_ids[6], NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
        (v_client_id, v_claim_ids[37], v_docdmd_transactional_id, 'follow_up', 'pending', 'Demand response follow-up', 'Follow up with adverse carrier on demand package response', 2, v_user_ids[7], NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
        (v_client_id, v_claim_ids[45], v_docdmd_review_id, 'review', 'pending', 'Final package sign-off', 'Complete final review and sign-off on closed document package', 3, v_user_ids[8], NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day');

    -- =====================================================
    -- Section 6: Deadlines (~80 total)
    -- Covers all status buckets for query 0.4
    -- =====================================================
    RAISE NOTICE 'Section 6: Creating deadlines...';

    -- Overdue deadlines (past deadline_date, status='pending')
    FOR v_i IN 1..10 LOOP
        v_claim_id := v_claim_ids[(v_i % 10) + 1];
        INSERT INTO deadline (client_id, claim_id, deadline_date, deadline_type, description, status, entity_type, entity_id, created_by, created_at)
        VALUES (
            v_client_id, v_claim_id,
            NOW() - ((v_i * 2) || ' days')::INTERVAL,
            CASE v_i % 3 WHEN 0 THEN 'review' WHEN 1 THEN 'follow_up' ELSE 'regulatory' END,
            'Overdue: ' || CASE v_i % 3 WHEN 0 THEN 'File review' WHEN 1 THEN 'Follow-up contact' ELSE 'Regulatory response' END || ' deadline',
            'pending',
            'claim', v_claim_id,
            v_admin_user_id, NOW() - ((v_i * 2 + 10) || ' days')::INTERVAL
        );
    END LOOP;

    -- Due today deadlines
    FOR v_i IN 1..5 LOOP
        v_claim_id := v_claim_ids[10 + v_i];
        INSERT INTO deadline (client_id, claim_id, deadline_date, deadline_type, description, status, entity_type, entity_id, created_by, created_at)
        VALUES (
            v_client_id, v_claim_id,
            CURRENT_DATE + INTERVAL '23 hours 59 minutes',
            CASE v_i % 2 WHEN 0 THEN 'send_demand' ELSE 'review' END,
            'Due today: ' || CASE v_i % 2 WHEN 0 THEN 'Demand letter submission' ELSE 'File review completion' END,
            'pending',
            'claim', v_claim_id,
            v_admin_user_id, NOW() - INTERVAL '7 days'
        );
    END LOOP;

    -- Due next 7 days
    FOR v_i IN 1..15 LOOP
        v_claim_id := v_claim_ids[15 + (v_i % 20) + 1];
        INSERT INTO deadline (client_id, claim_id, deadline_date, deadline_type, description, status, entity_type, entity_id, created_by, created_at)
        VALUES (
            v_client_id, v_claim_id,
            NOW() + ((v_i % 7 + 1) || ' days')::INTERVAL,
            CASE v_i % 4 WHEN 0 THEN 'review' WHEN 1 THEN 'follow_up' WHEN 2 THEN 'regulatory' ELSE 'send_demand' END,
            'Upcoming: ' || CASE v_i % 4 WHEN 0 THEN 'Quality review' WHEN 1 THEN 'Carrier follow-up' WHEN 2 THEN 'State filing' ELSE 'Demand submission' END || ' due within 7 days',
            'pending',
            'claim', v_claim_id,
            v_admin_user_id, NOW() - ((v_i + 5) || ' days')::INTERVAL
        );
    END LOOP;

    -- Met deadlines
    FOR v_i IN 1..25 LOOP
        v_claim_id := v_claim_ids[(v_i % 50) + 1];
        INSERT INTO deadline (client_id, claim_id, deadline_date, deadline_type, description, status, entity_type, entity_id, completed_at, completed_by, created_by, created_at)
        VALUES (
            v_client_id, v_claim_id,
            NOW() - ((v_i + 2) || ' days')::INTERVAL,
            CASE v_i % 5 WHEN 0 THEN 'review' WHEN 1 THEN 'follow_up' WHEN 2 THEN 'send_document' WHEN 3 THEN 'outbound_call' ELSE 'generic' END,
            'Met: ' || CASE v_i % 5 WHEN 0 THEN 'File review' WHEN 1 THEN 'Follow-up contact' WHEN 2 THEN 'Document dispatch' WHEN 3 THEN 'Outbound call' ELSE 'General task' END || ' completed on time',
            'met',
            'claim', v_claim_id,
            NOW() - ((v_i + 3) || ' days')::INTERVAL,
            v_user_ids[((v_i - 1) % array_length(v_user_ids, 1)) + 1],
            v_admin_user_id, NOW() - ((v_i + 15) || ' days')::INTERVAL
        );
    END LOOP;

    -- Missed deadlines
    FOR v_i IN 1..10 LOOP
        v_claim_id := v_claim_ids[20 + (v_i % 20) + 1];
        INSERT INTO deadline (client_id, claim_id, deadline_date, deadline_type, description, status, entity_type, entity_id, completed_at, completed_by, created_by, created_at)
        VALUES (
            v_client_id, v_claim_id,
            NOW() - ((v_i * 3 + 5) || ' days')::INTERVAL,
            CASE v_i % 3 WHEN 0 THEN 'regulatory' WHEN 1 THEN 'follow_up' ELSE 'review' END,
            'Missed: ' || CASE v_i % 3 WHEN 0 THEN 'Regulatory filing' WHEN 1 THEN 'Carrier contact' ELSE 'Quality review' END || ' completed after deadline',
            'missed',
            'claim', v_claim_id,
            NOW() - ((v_i * 3 + 2) || ' days')::INTERVAL,
            v_user_ids[((v_i - 1) % array_length(v_user_ids, 1)) + 1],
            v_admin_user_id, NOW() - ((v_i * 3 + 20) || ' days')::INTERVAL
        );
    END LOOP;

    -- Cancelled deadlines
    FOR v_i IN 1..8 LOOP
        v_claim_id := v_claim_ids[30 + (v_i % 15) + 1];
        INSERT INTO deadline (client_id, claim_id, deadline_date, deadline_type, description, status, entity_type, entity_id, cancelled_at, cancelled_by, cancellation_reason, created_by, created_at)
        VALUES (
            v_client_id, v_claim_id,
            NOW() - ((v_i * 5) || ' days')::INTERVAL,
            CASE v_i % 2 WHEN 0 THEN 'send_document' ELSE 'generic' END,
            'Cancelled: ' || CASE v_i % 2 WHEN 0 THEN 'Document dispatch' ELSE 'General task' END || ' - superseded',
            'cancelled',
            'claim', v_claim_id,
            NOW() - ((v_i * 5 + 2) || ' days')::INTERVAL,
            v_user_ids[((v_i - 1) % array_length(v_user_ids, 1)) + 1],
            CASE v_i % 3 WHEN 0 THEN 'Task reassigned to different team' WHEN 1 THEN 'Claim strategy changed' ELSE 'Duplicate deadline removed' END,
            v_admin_user_id, NOW() - ((v_i * 5 + 10) || ' days')::INTERVAL
        );
    END LOOP;

    -- Standalone claim deadlines (entity_type='claim')
    INSERT INTO deadline (client_id, claim_id, deadline_date, deadline_type, description, status, entity_type, entity_id, created_by, created_at)
    VALUES
        (v_client_id, v_claim_ids[1], NOW() + INTERVAL '30 days', 'regulatory', '30-day statutory acknowledgment letter required by state regulations', 'pending', 'claim', v_claim_ids[1], v_admin_user_id, NOW() - INTERVAL '5 days'),
        (v_client_id, v_claim_ids[5], NOW() + INTERVAL '60 days', 'litigation', 'Discovery response deadline for pending litigation', 'pending', 'claim', v_claim_ids[5], v_admin_user_id, NOW() - INTERVAL '10 days'),
        (v_client_id, v_claim_ids[11], NOW() + INTERVAL '14 days', 'negotiation', 'Settlement negotiation response window', 'pending', 'claim', v_claim_ids[11], v_admin_user_id, NOW() - INTERVAL '3 days'),
        (v_client_id, v_claim_ids[19], NOW() + INTERVAL '21 days', 'regulatory', 'State insurance department filing deadline', 'pending', 'claim', v_claim_ids[19], v_admin_user_id, NOW() - INTERVAL '7 days'),
        (v_client_id, v_claim_ids[31], NOW() + INTERVAL '45 days', 'review', 'Quarterly file review deadline', 'pending', 'claim', v_claim_ids[31], v_admin_user_id, NOW() - INTERVAL '15 days'),
        (v_client_id, v_claim_ids[41], NOW() + INTERVAL '10 days', 'follow_up', 'Adverse carrier response follow-up deadline', 'pending', 'claim', v_claim_ids[41], v_admin_user_id, NOW() - INTERVAL '5 days'),
        (v_client_id, v_claim_ids[49], NOW() + INTERVAL '7 days', 'review', 'Adverse coverage verification completion target', 'pending', 'claim', v_claim_ids[49], v_admin_user_id, NOW() - INTERVAL '2 days');

    -- =====================================================
    -- Section 7: Claim Desk Location Transitions
    -- Creates SLA buckets for queries 0.1 and 0.5
    -- =====================================================
    RAISE NOTICE 'Section 7: Creating claim desk location transitions...';

    -- 1-2 days ago (healthy for most SLAs) -- claims 1-20
    FOR v_i IN 1..20 LOOP
        v_claim_id := v_claim_ids[v_i];
        SELECT desk_location_id INTO v_loc_id FROM claim WHERE id = v_claim_id AND client_id = v_client_id;
        IF v_loc_id IS NOT NULL THEN
            INSERT INTO claim_desk_location_transition (client_id, claim_id, desk_location_id, entered_at, entered_by, entered_reason, previous_desk_location_id, created_at)
            VALUES (
                v_client_id, v_claim_id, v_loc_id,
                NOW() - ((1 + (v_i % 2)) || ' days')::INTERVAL,
                v_user_ids[((v_i - 1) % array_length(v_user_ids, 1)) + 1],
                CASE v_i % 3 WHEN 0 THEN 'Initial assignment' WHEN 1 THEN 'Workflow routing' ELSE 'Manual transfer' END,
                NULL,
                NOW() - ((1 + (v_i % 2)) || ' days')::INTERVAL
            );
        END IF;
    END LOOP;

    -- 3-5 days ago (warning for tight SLAs) -- claims 21-32
    FOR v_i IN 21..32 LOOP
        v_claim_id := v_claim_ids[v_i];
        SELECT desk_location_id INTO v_loc_id FROM claim WHERE id = v_claim_id AND client_id = v_client_id;
        IF v_loc_id IS NOT NULL THEN
            INSERT INTO claim_desk_location_transition (client_id, claim_id, desk_location_id, entered_at, entered_by, entered_reason, previous_desk_location_id, created_at)
            VALUES (
                v_client_id, v_claim_id, v_loc_id,
                NOW() - ((3 + (v_i % 3)) || ' days')::INTERVAL,
                v_user_ids[((v_i - 1) % array_length(v_user_ids, 1)) + 1],
                CASE v_i % 2 WHEN 0 THEN 'Workflow routing' ELSE 'Escalation transfer' END,
                NULL,
                NOW() - ((3 + (v_i % 3)) || ' days')::INTERVAL
            );
        END IF;
    END LOOP;

    -- 6-10 days ago (breached for tight SLAs) -- claims 33-42
    FOR v_i IN 33..42 LOOP
        v_claim_id := v_claim_ids[v_i];
        SELECT desk_location_id INTO v_loc_id FROM claim WHERE id = v_claim_id AND client_id = v_client_id;
        IF v_loc_id IS NOT NULL THEN
            INSERT INTO claim_desk_location_transition (client_id, claim_id, desk_location_id, entered_at, entered_by, entered_reason, previous_desk_location_id, created_at)
            VALUES (
                v_client_id, v_claim_id, v_loc_id,
                NOW() - ((6 + (v_i % 5)) || ' days')::INTERVAL,
                v_user_ids[((v_i - 1) % array_length(v_user_ids, 1)) + 1],
                CASE v_i % 2 WHEN 0 THEN 'Standard routing' ELSE 'Priority assignment' END,
                NULL,
                NOW() - ((6 + (v_i % 5)) || ' days')::INTERVAL
            );
        END IF;
    END LOOP;

    -- 12-20 days ago (breached for most SLAs) -- claims 43-50
    FOR v_i IN 43..50 LOOP
        v_claim_id := v_claim_ids[v_i];
        SELECT desk_location_id INTO v_loc_id FROM claim WHERE id = v_claim_id AND client_id = v_client_id;
        IF v_loc_id IS NOT NULL THEN
            INSERT INTO claim_desk_location_transition (client_id, claim_id, desk_location_id, entered_at, entered_by, entered_reason, previous_desk_location_id, created_at)
            VALUES (
                v_client_id, v_claim_id, v_loc_id,
                NOW() - ((12 + (v_i % 9)) || ' days')::INTERVAL,
                v_user_ids[((v_i - 1) % array_length(v_user_ids, 1)) + 1],
                CASE v_i % 3 WHEN 0 THEN 'Initial assignment' WHEN 1 THEN 'Backlog processing' ELSE 'Manual intake' END,
                NULL,
                NOW() - ((12 + (v_i % 9)) || ' days')::INTERVAL
            );
        END IF;
    END LOOP;

    -- Multi-transition claims (movement history) -- claims 11-25
    -- These get a second (earlier) transition showing where they came from
    FOR v_i IN 11..25 LOOP
        v_claim_id := v_claim_ids[v_i];
        SELECT desk_location_id INTO v_loc_id FROM claim WHERE id = v_claim_id AND client_id = v_client_id;
        IF v_loc_id IS NOT NULL THEN
            INSERT INTO claim_desk_location_transition (client_id, claim_id, desk_location_id, entered_at, entered_by, entered_reason, previous_desk_location_id, created_at)
            VALUES (
                v_client_id, v_claim_id,
                -- Previous location was Pending of whichever type
                CASE
                    WHEN v_loc_id = v_subrog_transactional_id THEN v_subrog_pending_id
                    WHEN v_loc_id = v_subrog_rfi_id THEN v_subrog_transactional_id
                    WHEN v_loc_id = v_subrog_review_id THEN v_subrog_transactional_id
                    ELSE v_loc_id
                END,
                NOW() - ((15 + (v_i % 10)) || ' days')::INTERVAL,
                v_user_ids[((v_i - 1) % array_length(v_user_ids, 1)) + 1],
                'Initial intake assignment',
                NULL,
                NOW() - ((15 + (v_i % 10)) || ' days')::INTERVAL
            );
        END IF;
    END LOOP;

    -- =====================================================
    -- Section 8: Analytics Snapshots (30 days x 13 locations)
    -- Deterministic patterns for query 1.6
    -- =====================================================
    RAISE NOTICE 'Section 8: Creating analytics snapshots...';

    -- Generate 30 days of snapshots for each location with a workflow
    FOR v_day IN 0..29 LOOP
        v_snapshot_date := CURRENT_DATE - v_day;

        -- Subrogation locations
        INSERT INTO analytics.daily_workflow_stage_snapshot (client_id, snapshot_date, desk_location_id, claims_count, avg_hours_in_stage, median_hours_in_stage, claims_breaching_sla, created_at)
        VALUES
            (v_client_id, v_snapshot_date, v_subrog_pending_id, 5 + (v_day % 4), 24.0 + (v_day % 20), 20.0 + (v_day % 16), CASE WHEN v_day < 10 THEN (v_day / 4) ELSE 2 END, NOW()),
            (v_client_id, v_snapshot_date, v_subrog_transactional_id, 7 + (v_day % 3), 48.0 + (v_day % 30), 40.0 + (v_day % 24), CASE WHEN v_day < 15 THEN (v_day / 6) ELSE 2 END, NOW()),
            (v_client_id, v_snapshot_date, v_subrog_rfi_id, 4 + (v_day % 3), 36.0 + (v_day % 25), 30.0 + (v_day % 20), CASE WHEN v_day < 12 THEN (v_day / 5) ELSE 2 END, NOW()),
            (v_client_id, v_snapshot_date, v_subrog_review_id, 3 + (v_day % 2), 30.0 + (v_day % 15), 25.0 + (v_day % 12), CASE WHEN v_day < 8 THEN (v_day / 4) ELSE 2 END, NOW()),
            (v_client_id, v_snapshot_date, v_subrog_closed_id, 3 + (v_day % 2), 72.0 + (v_day % 40), 60.0 + (v_day % 32), 0, NOW()),

            -- Doc/Demand locations
            (v_client_id, v_snapshot_date, v_docdmd_pending_id, 6 + (v_day % 3), 20.0 + (v_day % 18), 16.0 + (v_day % 14), CASE WHEN v_day < 10 THEN (v_day / 4) ELSE 2 END, NOW()),
            (v_client_id, v_snapshot_date, v_docdmd_transactional_id, 5 + (v_day % 4), 40.0 + (v_day % 28), 33.0 + (v_day % 22), CASE WHEN v_day < 12 THEN (v_day / 5) ELSE 2 END, NOW()),
            (v_client_id, v_snapshot_date, v_docdmd_rfi_id, 4 + (v_day % 3), 30.0 + (v_day % 22), 24.0 + (v_day % 18), CASE WHEN v_day < 10 THEN (v_day / 4) ELSE 2 END, NOW()),
            (v_client_id, v_snapshot_date, v_docdmd_review_id, 3 + (v_day % 2), 25.0 + (v_day % 12), 20.0 + (v_day % 10), CASE WHEN v_day < 6 THEN (v_day / 3) ELSE 2 END, NOW()),
            (v_client_id, v_snapshot_date, v_docdmd_closed_id, 3 + (v_day % 2), 60.0 + (v_day % 35), 50.0 + (v_day % 28), 0, NOW()),

            -- Adverse locations (3 with workflows)
            (v_client_id, v_snapshot_date, v_adverse_pending_id, 4 + (v_day % 3), 18.0 + (v_day % 15), 15.0 + (v_day % 12), CASE WHEN v_day < 8 THEN (v_day / 3) ELSE 2 END, NOW()),
            (v_client_id, v_snapshot_date, v_adverse_transactional_id, 4 + (v_day % 2), 35.0 + (v_day % 20), 28.0 + (v_day % 16), CASE WHEN v_day < 10 THEN (v_day / 4) ELSE 2 END, NOW()),
            (v_client_id, v_snapshot_date, v_adverse_rfi_id, 3 + (v_day % 2), 28.0 + (v_day % 18), 22.0 + (v_day % 14), CASE WHEN v_day < 8 THEN (v_day / 3) ELSE 2 END, NOW());
    END LOOP;

    RAISE NOTICE 'Workflow data generation complete!';

END $$;

-- =====================================================
-- Section 9: Summary Queries
-- =====================================================

SELECT 'Workflow definitions by location:' AS info;
SELECT wd.name AS workflow, dl.name AS location, dlt.name AS location_type, wd.is_active
FROM workflow_definition wd
LEFT JOIN desk_location dl ON wd.desk_location_id = dl.id
LEFT JOIN desk_location_type dlt ON dl.desk_location_type_id = dlt.id
WHERE wd.deleted_at IS NULL
ORDER BY dlt.name, dl.name;

SELECT 'Workflow rules by trigger/action/mode:' AS info;
SELECT trigger_type, action_type, execution_mode, COUNT(*) as count
FROM workflow_rule
WHERE deleted_at IS NULL AND is_active = true
GROUP BY trigger_type, action_type, execution_mode
ORDER BY trigger_type, action_type;

SELECT 'Workflow thresholds:' AS info;
SELECT wd.name AS workflow, wt.threshold_type, wt.threshold_value
FROM workflow_threshold wt
JOIN workflow_definition wd ON wt.workflow_definition_id = wd.id
WHERE wt.deleted_at IS NULL AND wt.is_active = true
ORDER BY wd.name, wt.threshold_type;

SELECT 'Tasks by status:' AS info;
SELECT status, COUNT(*) as count FROM task GROUP BY status ORDER BY count DESC;

SELECT 'Tasks by desk location:' AS info;
SELECT dl.name AS location, dlt.name AS location_type, COUNT(t.id) as task_count,
    SUM(CASE WHEN t.status IN ('pending', 'in_progress') THEN t.work_units ELSE 0 END) as open_work_units,
    dl.capacity_threshold
FROM task t
JOIN desk_location dl ON t.desk_location_id = dl.id
JOIN desk_location_type dlt ON dl.desk_location_type_id = dlt.id
GROUP BY dl.id, dl.name, dlt.name, dl.capacity_threshold
ORDER BY dlt.name, dl.name;

SELECT 'User desk location assignments:' AS info;
SELECT u.first || ' ' || u.last AS user_name,
    dlt.name AS location_type,
    dl.name AS location,
    udl.priority,
    COUNT(*) OVER (PARTITION BY udl.user_id) as total_assignments_per_user
FROM user_desk_location udl
JOIN users u ON udl.user_id = u.id
JOIN desk_location dl ON udl.desk_location_id = dl.id
JOIN desk_location_type dlt ON dl.desk_location_type_id = dlt.id
WHERE udl.removed_at IS NULL
ORDER BY u.last, u.first, dlt.name, dl.name;

SELECT 'User assignments by desk location (for breach resolution):' AS info;
SELECT dlt.name AS location_type,
    dl.name AS location,
    COUNT(udl.id) as total_users,
    COUNT(CASE WHEN udl.priority IS NOT NULL THEN 1 END) as prioritized_users,
    COUNT(CASE WHEN udl.priority IS NULL THEN 1 END) as eligible_only_users
FROM desk_location dl
JOIN desk_location_type dlt ON dl.desk_location_type_id = dlt.id
LEFT JOIN user_desk_location udl ON udl.desk_location_id = dl.id AND udl.removed_at IS NULL
GROUP BY dl.id, dl.name, dlt.name
HAVING COUNT(udl.id) > 0
ORDER BY dlt.name, dl.name;

SELECT 'Capacity breach candidates (open_units > threshold):' AS info;
SELECT dl.name AS location, dlt.name AS location_type,
    SUM(t.work_units) as open_work_units,
    dl.capacity_threshold,
    SUM(t.work_units) - dl.capacity_threshold as excess_units
FROM task t
JOIN desk_location dl ON t.desk_location_id = dl.id
JOIN desk_location_type dlt ON dl.desk_location_type_id = dlt.id
WHERE t.status IN ('pending', 'in_progress')
GROUP BY dl.id, dl.name, dlt.name, dl.capacity_threshold
HAVING SUM(t.work_units) > dl.capacity_threshold
ORDER BY excess_units DESC;

SELECT 'Deadlines by status:' AS info;
SELECT status, COUNT(*) as count FROM deadline GROUP BY status ORDER BY count DESC;

SELECT 'Claim transitions:' AS info;
SELECT COUNT(*) as total_transitions,
    COUNT(DISTINCT claim_id) as claims_with_transitions
FROM claim_desk_location_transition;

SELECT 'Analytics snapshots:' AS info;
SELECT COUNT(*) as total_snapshots,
    COUNT(DISTINCT desk_location_id) as locations_covered,
    COUNT(DISTINCT snapshot_date) as days_covered
FROM analytics.daily_workflow_stage_snapshot;

SELECT 'Health check - Locations without workflows:' AS info;
SELECT dl.name AS location, dlt.name AS location_type
FROM desk_location dl
JOIN desk_location_type dlt ON dl.desk_location_type_id = dlt.id
WHERE dl.is_active = true
AND dl.deleted_at IS NULL
AND NOT EXISTS (
    SELECT 1 FROM workflow_definition wd
    WHERE wd.desk_location_id = dl.id AND wd.is_active = true AND wd.deleted_at IS NULL
)
AND NOT EXISTS (
    SELECT 1 FROM workflow_definition wd
    WHERE wd.desk_location_id IS NULL AND wd.is_active = true AND wd.deleted_at IS NULL
    AND wd.client_id = dl.client_id
);

SELECT 'Health check - Workflows without LOCATION_AGE threshold:' AS info;
SELECT wd.name AS workflow
FROM workflow_definition wd
WHERE wd.is_active = true AND wd.deleted_at IS NULL
AND NOT EXISTS (
    SELECT 1 FROM workflow_threshold wt
    WHERE wt.workflow_definition_id = wd.id AND wt.threshold_type = 'location_age'
    AND wt.is_active = true AND wt.deleted_at IS NULL
);

SELECT 'Health check - Locations missing capacity (NULL daily_work_units):' AS info;
SELECT dl.name AS location, dlt.name AS location_type, dl.daily_work_units
FROM desk_location dl
JOIN desk_location_type dlt ON dl.desk_location_type_id = dlt.id
WHERE dl.is_active = true AND dl.deleted_at IS NULL AND dl.daily_work_units IS NULL;
