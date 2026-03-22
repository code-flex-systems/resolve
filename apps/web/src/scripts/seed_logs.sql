-- seed_logs.sql
-- Seeds admin_config_logs and claim_activity_logs
-- Depends on: users, claims

DO $$
DECLARE
  v_client_id CONSTANT uuid := '1c118f90-3153-4dfb-b350-953e42f0d1aa';
  v_user_ids uuid[];
  v_admin_ids uuid[];
  v_claim_ids uuid[];
  v_i int;
  v_admin_id uuid;
  v_user_id uuid;
  v_claim_id uuid;
  v_now timestamp := now();
  v_created_at timestamp;
  v_entity_name text;
  v_action text;
  v_admin_entities text[] := ARRAY['workflow_definition','desk_location','checklist','users'];
  v_admin_actions text[] := ARRAY['CREATE','UPDATE','DELETE'];
  v_claim_entities text[] := ARRAY['claim','task','recovery_event','document','deadline'];
  v_claim_actions text[] := ARRAY['CREATE','UPDATE','CLAIM','COMPLETE'];
BEGIN
  -- Gather existing reference data
  SELECT array_agg(id ORDER BY created_at) INTO v_user_ids
  FROM users WHERE client_id = v_client_id;

  SELECT array_agg(id ORDER BY created_at) INTO v_admin_ids
  FROM users WHERE client_id = v_client_id AND role IN ('Admin', 'Super Admin');

  SELECT array_agg(id ORDER BY claim_number) INTO v_claim_ids
  FROM claim WHERE client_id = v_client_id;

  IF v_user_ids IS NULL OR v_claim_ids IS NULL THEN
    RAISE EXCEPTION 'Missing prerequisite data. Run prior seed scripts first.';
  END IF;

  -- Wipe existing log data
  DELETE FROM admin_config_logs WHERE client_id = v_client_id;
  DELETE FROM claim_activity_logs WHERE client_id = v_client_id;

  -- =========================================================================
  -- ADMIN CONFIG LOGS (~100 over last 30 days)
  -- =========================================================================
  FOR v_i IN 1..100 LOOP
    v_admin_id := v_admin_ids[1 + floor(random() * array_length(v_admin_ids, 1))::int];
    v_created_at := v_now - (interval '1 minute' * floor(random() * 43200)::int); -- last 30 days in minutes
    v_entity_name := v_admin_entities[1 + floor(random() * array_length(v_admin_entities, 1))::int];
    v_action := v_admin_actions[1 + floor(random() * array_length(v_admin_actions, 1))::int];

    INSERT INTO admin_config_logs (
      client_id, user_id, entity_id, entity_name, action, value, created_at
    ) VALUES (
      v_client_id,
      v_admin_id,
      gen_random_uuid()::text,
      v_entity_name,
      v_action,
      CASE v_action
        WHEN 'CREATE' THEN jsonb_build_object(
          'name', 'New ' || v_entity_name || ' ' || v_i,
          'created_by', v_admin_id
        )
        WHEN 'UPDATE' THEN jsonb_build_object(
          'field', CASE v_entity_name
            WHEN 'workflow_definition' THEN 'is_active'
            WHEN 'desk_location' THEN 'name'
            WHEN 'checklist' THEN 'published'
            WHEN 'users' THEN 'role'
          END,
          'old_value', 'previous',
          'new_value', 'updated'
        )
        WHEN 'DELETE' THEN jsonb_build_object(
          'name', 'Archived ' || v_entity_name || ' ' || v_i,
          'reason', 'No longer needed'
        )
      END,
      v_created_at
    );
  END LOOP;

  -- =========================================================================
  -- CLAIM ACTIVITY LOGS (~500)
  -- =========================================================================
  FOR v_i IN 1..500 LOOP
    v_user_id := v_user_ids[1 + floor(random() * array_length(v_user_ids, 1))::int];
    v_claim_id := v_claim_ids[1 + floor(random() * array_length(v_claim_ids, 1))::int];
    v_created_at := v_now - (interval '1 minute' * floor(random() * 129600)::int); -- last 90 days in minutes
    v_entity_name := v_claim_entities[1 + floor(random() * array_length(v_claim_entities, 1))::int];
    v_action := v_claim_actions[1 + floor(random() * array_length(v_claim_actions, 1))::int];

    INSERT INTO claim_activity_logs (
      client_id, user_id, claim_id, entity_id, entity_name, action,
      actor_type, value, created_at
    ) VALUES (
      v_client_id,
      v_user_id,
      v_claim_id,
      gen_random_uuid()::text,
      v_entity_name,
      v_action,
      CASE WHEN v_user_id = ANY(v_admin_ids) THEN 'admin' ELSE 'user' END,
      CASE v_action
        WHEN 'CREATE' THEN jsonb_build_object(
          'entity', v_entity_name,
          'summary', 'Created new ' || v_entity_name
        )
        WHEN 'UPDATE' THEN jsonb_build_object(
          'entity', v_entity_name,
          'field', CASE v_entity_name
            WHEN 'claim' THEN (ARRAY['status','substatus','claim_amount','recovery_status'])[1 + floor(random() * 4)::int]
            WHEN 'task' THEN (ARRAY['status','assigned_to','work_units'])[1 + floor(random() * 3)::int]
            WHEN 'recovery_event' THEN 'recovery_amount'
            WHEN 'document' THEN 'doc_status'
            WHEN 'deadline' THEN 'status'
          END,
          'old_value', 'previous_value',
          'new_value', 'updated_value'
        )
        WHEN 'CLAIM' THEN jsonb_build_object(
          'entity', v_entity_name,
          'assigned_to', v_user_ids[1 + floor(random() * array_length(v_user_ids, 1))::int],
          'summary', 'Claimed ' || v_entity_name
        )
        WHEN 'COMPLETE' THEN jsonb_build_object(
          'entity', v_entity_name,
          'summary', 'Marked ' || v_entity_name || ' as complete'
        )
      END,
      v_created_at
    );
  END LOOP;

  RAISE NOTICE 'Seeded 100 admin config logs and 500 claim activity logs for client %', v_client_id;
END $$;
