-- seed_workflow_rules.sql
-- Seeds workflow definitions, rules, thresholds, executions, and suggestions
-- Depends on: users, claims, desk_locations

DO $$
DECLARE
  v_client_id CONSTANT uuid := '1c118f90-3153-4dfb-b350-953e42f0d1aa';
  v_user_ids uuid[];
  v_admin_ids uuid[];
  v_claim_ids uuid[];
  v_desk_location_ids uuid[];
  v_wf_def_ids uuid[] := ARRAY[]::uuid[];
  v_wf_rule_ids uuid[] := ARRAY[]::uuid[];
  v_def_id uuid;
  v_rule_id uuid;
  v_exec_id uuid;
  v_now timestamp := now();
  v_i int;
  v_rand float;
  v_status text;
  v_admin_id uuid;
BEGIN
  -- Gather existing reference data
  SELECT array_agg(id ORDER BY created_at) INTO v_user_ids
  FROM users WHERE client_id = v_client_id;

  SELECT array_agg(id ORDER BY created_at) INTO v_admin_ids
  FROM users WHERE client_id = v_client_id AND role IN ('Admin', 'Super Admin');

  SELECT array_agg(id ORDER BY claim_number) INTO v_claim_ids
  FROM claim WHERE client_id = v_client_id;

  SELECT array_agg(id ORDER BY name) INTO v_desk_location_ids
  FROM desk_location WHERE client_id = v_client_id AND deleted_at IS NULL;

  IF v_admin_ids IS NULL OR v_claim_ids IS NULL OR v_desk_location_ids IS NULL THEN
    RAISE EXCEPTION 'Missing prerequisite data. Run prior seed scripts first.';
  END IF;

  -- Wipe existing workflow data
  DELETE FROM workflow_suggestion WHERE client_id = v_client_id;
  DELETE FROM workflow_rule_execution WHERE client_id = v_client_id;
  DELETE FROM workflow_threshold WHERE client_id = v_client_id;
  DELETE FROM workflow_rule WHERE client_id = v_client_id;
  DELETE FROM workflow_definition WHERE client_id = v_client_id;

  v_admin_id := v_admin_ids[1];

  -- =========================================================================
  -- WORKFLOW DEFINITIONS (5 total: 1 global, 4 scoped to desk locations)
  -- =========================================================================

  -- 1. Global definition (no desk_location_id)
  v_def_id := gen_random_uuid();
  v_wf_def_ids := v_wf_def_ids || v_def_id;
  INSERT INTO workflow_definition (
    id, client_id, name, description, desk_location_id,
    is_active, created_by, created_at
  ) VALUES (
    v_def_id, v_client_id,
    'Global Claim Aging Rules',
    'Monitors all claims across desk locations for aging and escalation triggers',
    NULL,
    true, v_admin_id, v_now - interval '90 days'
  );

  -- 2-5. Desk-scoped definitions
  FOR v_i IN 1..LEAST(4, array_length(v_desk_location_ids, 1)) LOOP
    v_def_id := gen_random_uuid();
    v_wf_def_ids := v_wf_def_ids || v_def_id;
    INSERT INTO workflow_definition (
      id, client_id, name, description, desk_location_id,
      is_active, created_by, created_at
    ) VALUES (
      v_def_id, v_client_id,
      CASE v_i
        WHEN 1 THEN 'Evaluation Stage Automation'
        WHEN 2 THEN 'Documentation Follow-Up Rules'
        WHEN 3 THEN 'Settlement Processing Workflow'
        WHEN 4 THEN 'Closure Verification Rules'
      END,
      CASE v_i
        WHEN 1 THEN 'Automated rules for claims in the evaluation stage'
        WHEN 2 THEN 'Follow-up triggers for missing documentation and demand responses'
        WHEN 3 THEN 'Rules governing settlement offer and payment processing'
        WHEN 4 THEN 'Verification checks before claim closure'
      END,
      v_desk_location_ids[v_i],
      CASE WHEN v_i <= 3 THEN true ELSE false END,
      v_admin_id,
      v_now - interval '1 day' * (60 + v_i * 10)
    );
  END LOOP;

  -- =========================================================================
  -- WORKFLOW RULES (10 rules across definitions)
  -- =========================================================================

  -- Rule 1: Escalate aging claims (global definition)
  v_rule_id := gen_random_uuid();
  v_wf_rule_ids := v_wf_rule_ids || v_rule_id;
  INSERT INTO workflow_rule (
    id, client_id, workflow_definition_id, name, description,
    trigger_type, action_type, conditions, action_config,
    execution_mode, priority, is_active, created_by, created_at
  ) VALUES (
    v_rule_id, v_client_id, v_wf_def_ids[1],
    'Escalate aging claims',
    'Move claims older than 90 days to escalation queue',
    'claim_age', 'move_claim',
    '{"field": "date_of_loss", "operator": "older_than_days", "value": 90}'::jsonb,
    jsonb_build_object('target_desk_location_id', v_desk_location_ids[LEAST(2, array_length(v_desk_location_ids, 1))], 'reason', 'Aging claim escalation'),
    'suggest', 1, true, v_admin_id, v_now - interval '85 days'
  );

  -- Rule 2: High value claim alert (global)
  v_rule_id := gen_random_uuid();
  v_wf_rule_ids := v_wf_rule_ids || v_rule_id;
  INSERT INTO workflow_rule (
    id, client_id, workflow_definition_id, name, description,
    trigger_type, action_type, conditions, action_config,
    execution_mode, priority, is_active, created_by, created_at
  ) VALUES (
    v_rule_id, v_client_id, v_wf_def_ids[1],
    'High value claim alert',
    'Notify supervisor when claim amount exceeds $100,000',
    'field_change', 'notify_user',
    '{"field": "claim_amount", "operator": "greater_than", "value": 100000}'::jsonb,
    '{"notify_role": "admin", "message": "High value claim requires supervisor review"}'::jsonb,
    'auto', 2, true, v_admin_id, v_now - interval '80 days'
  );

  -- Rule 3: Follow up on demand sent (desk-scoped)
  v_rule_id := gen_random_uuid();
  v_wf_rule_ids := v_wf_rule_ids || v_rule_id;
  INSERT INTO workflow_rule (
    id, client_id, workflow_definition_id, name, description,
    trigger_type, action_type, conditions, action_config,
    execution_mode, priority, is_active, created_by, created_at
  ) VALUES (
    v_rule_id, v_client_id, v_wf_def_ids[2],
    'Follow up on demand sent',
    'Create follow-up task 30 days after demand letter is sent',
    'field_change', 'create_task',
    '{"field": "substatus", "operator": "equals", "value": "demand_sent", "delay_days": 30}'::jsonb,
    '{"task_type": "follow_up", "title": "Follow up on demand response", "work_units": 3}'::jsonb,
    'suggest', 1, true, v_admin_id, v_now - interval '70 days'
  );

  -- Rule 4: Stale evaluation check (desk-scoped)
  v_rule_id := gen_random_uuid();
  v_wf_rule_ids := v_wf_rule_ids || v_rule_id;
  INSERT INTO workflow_rule (
    id, client_id, workflow_definition_id, name, description,
    trigger_type, action_type, conditions, action_config,
    execution_mode, priority, is_active, created_by, created_at
  ) VALUES (
    v_rule_id, v_client_id, v_wf_def_ids[2],
    'Stale evaluation alert',
    'Flag claims in evaluation for more than 45 days',
    'location_age', 'notify_user',
    '{"operator": "older_than_days", "value": 45}'::jsonb,
    '{"notify_role": "admin", "message": "Claim has been in evaluation for over 45 days"}'::jsonb,
    'suggest', 2, true, v_admin_id, v_now - interval '65 days'
  );

  -- Rule 5: Auto-create review task on settlement (desk-scoped)
  v_rule_id := gen_random_uuid();
  v_wf_rule_ids := v_wf_rule_ids || v_rule_id;
  INSERT INTO workflow_rule (
    id, client_id, workflow_definition_id, name, description,
    trigger_type, action_type, conditions, action_config,
    execution_mode, priority, is_active, created_by, created_at
  ) VALUES (
    v_rule_id, v_client_id, v_wf_def_ids[3],
    'Create document review task on missing docs',
    'Create review task when required documents are missing for more than 14 days',
    'location_age', 'create_task',
    '{"operator": "older_than_days", "value": 14, "requires_missing_docs": true}'::jsonb,
    '{"task_type": "review", "title": "Review missing documentation", "work_units": 4}'::jsonb,
    'suggest', 1, true, v_admin_id, v_now - interval '55 days'
  );

  -- Rule 6: Settlement reached - move to closure (desk-scoped)
  v_rule_id := gen_random_uuid();
  v_wf_rule_ids := v_wf_rule_ids || v_rule_id;
  INSERT INTO workflow_rule (
    id, client_id, workflow_definition_id, name, description,
    trigger_type, action_type, conditions, action_config,
    execution_mode, priority, is_active, created_by, created_at
  ) VALUES (
    v_rule_id, v_client_id, v_wf_def_ids[4],
    'Move settled claims to closure',
    'Automatically move claims with settlement_reached substatus to closure queue',
    'field_change', 'move_claim',
    '{"field": "substatus", "operator": "equals", "value": "settlement_reached"}'::jsonb,
    jsonb_build_object('target_desk_location_id', v_desk_location_ids[LEAST(3, array_length(v_desk_location_ids, 1))], 'reason', 'Settlement reached'),
    'auto', 1, true, v_admin_id, v_now - interval '50 days'
  );

  -- Rule 7: Task completion triggers priority update (desk-scoped)
  v_rule_id := gen_random_uuid();
  v_wf_rule_ids := v_wf_rule_ids || v_rule_id;
  INSERT INTO workflow_rule (
    id, client_id, workflow_definition_id, name, description,
    trigger_type, action_type, conditions, action_config,
    execution_mode, priority, is_active, created_by, created_at
  ) VALUES (
    v_rule_id, v_client_id, v_wf_def_ids[4],
    'Reprioritize on task completion',
    'Update claim priority when all required tasks are completed',
    'task_completed', 'update_priority',
    '{"requires_all_tasks_complete": true}'::jsonb,
    '{"new_priority": "low", "reason": "All tasks completed"}'::jsonb,
    'suggest', 3, true, v_admin_id, v_now - interval '45 days'
  );

  -- Rule 8: Manual escalation for litigation claims (global)
  v_rule_id := gen_random_uuid();
  v_wf_rule_ids := v_wf_rule_ids || v_rule_id;
  INSERT INTO workflow_rule (
    id, client_id, workflow_definition_id, name, description,
    trigger_type, action_type, conditions, action_config,
    execution_mode, priority, is_active, created_by, created_at
  ) VALUES (
    v_rule_id, v_client_id, v_wf_def_ids[1],
    'Litigation claim notification',
    'Alert management when claim enters litigation substatus',
    'field_change', 'notify_user',
    '{"field": "substatus", "operator": "equals", "value": "litigation"}'::jsonb,
    '{"notify_role": "super_admin", "message": "Claim has entered litigation - management review required"}'::jsonb,
    'auto', 1, true, v_admin_id, v_now - interval '40 days'
  );

  -- Rule 9: Inbound call task for new claims (desk-scoped, inactive)
  v_rule_id := gen_random_uuid();
  v_wf_rule_ids := v_wf_rule_ids || v_rule_id;
  INSERT INTO workflow_rule (
    id, client_id, workflow_definition_id, name, description,
    trigger_type, action_type, conditions, action_config,
    execution_mode, priority, is_active, created_by, created_at
  ) VALUES (
    v_rule_id, v_client_id, v_wf_def_ids[2],
    'Initial contact task for new claims',
    'Create outbound call task within 24 hours of claim assignment',
    'manual', 'create_task',
    '{"delay_hours": 24}'::jsonb,
    '{"task_type": "outbound_call", "title": "Initial contact with insured", "work_units": 2}'::jsonb,
    'suggest', 2, false, v_admin_id, v_now - interval '30 days'
  );

  -- Rule 10: Recovery potential check (desk-scoped)
  v_rule_id := gen_random_uuid();
  v_wf_rule_ids := v_wf_rule_ids || v_rule_id;
  INSERT INTO workflow_rule (
    id, client_id, workflow_definition_id, name, description,
    trigger_type, action_type, conditions, action_config,
    execution_mode, priority, is_active, created_by, created_at
  ) VALUES (
    v_rule_id, v_client_id, v_wf_def_ids[3],
    'Flag claims with recovery potential',
    'Create task to evaluate subrogation potential when expected recovery > $10,000',
    'field_change', 'create_task',
    '{"field": "expected_recovery", "operator": "greater_than", "value": 10000}'::jsonb,
    '{"task_type": "review", "title": "Evaluate subrogation potential", "work_units": 5}'::jsonb,
    'suggest', 2, true, v_admin_id, v_now - interval '25 days'
  );

  -- =========================================================================
  -- WORKFLOW THRESHOLDS (3 thresholds with SLA hours)
  -- =========================================================================

  -- 48h SLA - urgent tasks
  INSERT INTO workflow_threshold (
    id, client_id, workflow_definition_id, threshold_type,
    threshold_value, is_active, created_by, created_at
  ) VALUES (
    gen_random_uuid(), v_client_id, v_wf_def_ids[1],
    'task_due', 48, true, v_admin_id, v_now - interval '80 days'
  );

  -- 72h SLA - standard follow-ups
  INSERT INTO workflow_threshold (
    id, client_id, workflow_definition_id, threshold_type,
    threshold_value, is_active, created_by, created_at
  ) VALUES (
    gen_random_uuid(), v_client_id, v_wf_def_ids[2],
    'location_age', 72, true, v_admin_id, v_now - interval '70 days'
  );

  -- 168h SLA (7 days) - document review
  INSERT INTO workflow_threshold (
    id, client_id, workflow_definition_id, threshold_type,
    threshold_value, is_active, created_by, created_at
  ) VALUES (
    gen_random_uuid(), v_client_id, v_wf_def_ids[3],
    'user_capacity', 168, true, v_admin_id, v_now - interval '55 days'
  );

  -- 96h global SLA threshold (applies to all locations without a specific threshold)
  INSERT INTO workflow_threshold (
    id, client_id, workflow_definition_id, threshold_type,
    threshold_value, is_active, created_by, created_at
  ) VALUES (
    gen_random_uuid(), v_client_id, v_wf_def_ids[1],
    'location_age', 96, true, v_admin_id, v_now - interval '60 days'
  );

  -- =========================================================================
  -- WORKFLOW RULE EXECUTIONS (~20 records, mixed statuses)
  -- =========================================================================
  FOR v_i IN 1..20 LOOP
    v_rand := random();
    -- Status: 35% pending, 30% executed, 20% failed, 15% skipped
    IF v_rand < 0.35 THEN v_status := 'pending';
    ELSIF v_rand < 0.65 THEN v_status := 'executed';
    ELSIF v_rand < 0.85 THEN v_status := 'failed';
    ELSE v_status := 'skipped';
    END IF;

    v_rule_id := v_wf_rule_ids[1 + floor(random() * array_length(v_wf_rule_ids, 1))::int];

    INSERT INTO workflow_rule_execution (
      id, client_id, workflow_rule_id, claim_id,
      trigger_type, action_type, action_config, execution_mode,
      status, executed_at, executed_by, error_message,
      result_data, created_by, created_at
    )
    SELECT
      gen_random_uuid(),
      v_client_id,
      wr.id,
      v_claim_ids[1 + floor(random() * array_length(v_claim_ids, 1))::int],
      wr.trigger_type,
      wr.action_type,
      wr.action_config,
      wr.execution_mode,
      v_status,
      CASE WHEN v_status IN ('executed','failed') THEN v_now - interval '1 day' * floor(random() * 30)::int ELSE NULL END,
      CASE WHEN v_status = 'executed' THEN v_admin_id ELSE NULL END,
      CASE WHEN v_status = 'failed' THEN 'Target desk location is at capacity' ELSE NULL END,
      CASE WHEN v_status = 'executed' THEN '{"success": true}'::jsonb ELSE NULL END,
      v_admin_id,
      v_now - interval '1 day' * floor(random() * 45)::int
    FROM workflow_rule wr
    WHERE wr.id = v_rule_id;
  END LOOP;

  -- =========================================================================
  -- WORKFLOW SUGGESTIONS (~10 records, mixed statuses)
  -- =========================================================================
  FOR v_i IN 1..10 LOOP
    v_rand := random();
    -- Status: 40% pending, 30% executed, 20% ignored, 10% hidden
    IF v_rand < 0.40 THEN v_status := 'pending';
    ELSIF v_rand < 0.70 THEN v_status := 'executed';
    ELSIF v_rand < 0.90 THEN v_status := 'ignored';
    ELSE v_status := 'hidden';
    END IF;

    INSERT INTO workflow_suggestion (
      id, client_id, desk_location_id,
      suggestion_data, status,
      generated_at, expires_at,
      resolved_at, resolved_by
    ) VALUES (
      gen_random_uuid(),
      v_client_id,
      v_desk_location_ids[1 + floor(random() * array_length(v_desk_location_ids, 1))::int],
      jsonb_build_object(
        'type', (ARRAY['move_claim','create_task','notify_user','update_priority'])[1 + floor(random() * 4)::int],
        'claim_id', v_claim_ids[1 + floor(random() * array_length(v_claim_ids, 1))::int],
        'reason', (ARRAY[
          'Claim aging beyond 90 days in current stage',
          'High value claim requires supervisor review',
          'Missing documentation follow-up needed',
          'Settlement response overdue',
          'All required tasks completed - ready for closure'
        ])[1 + floor(random() * 5)::int],
        'recommended_action', 'Review and take action'
      ),
      v_status,
      v_now - interval '1 day' * floor(random() * 30)::int,
      v_now + interval '1 day' * (7 + floor(random() * 14)::int),
      CASE WHEN v_status IN ('executed','ignored','hidden') THEN v_now - interval '1 day' * floor(random() * 15)::int ELSE NULL END,
      CASE WHEN v_status IN ('executed','ignored','hidden') THEN v_admin_id ELSE NULL END
    );
  END LOOP;

  RAISE NOTICE 'Seeded workflow definitions, rules, thresholds, executions, and suggestions for client %', v_client_id;
END $$;
