-- seed_tasks_recovery.sql
-- Seeds tasks, deadlines, recovery events, and settlements
-- Depends on: users, claims, desk_locations, claim_party, claim_coverage

DO $$
DECLARE
  v_client_id CONSTANT uuid := '1c118f90-3153-4dfb-b350-953e42f0d1aa';
  v_user_ids uuid[];
  v_admin_ids uuid[];
  v_claim_ids uuid[];
  v_desk_location_ids uuid[];
  v_recovery_claim_ids uuid[];
  v_task_types text[] := ARRAY['generic','outbound_call','inbound_call','send_document','request_document','send_demand','review','follow_up','letter'];
  v_task_titles text[] := ARRAY[
    'Review initial claim documentation',
    'Call insured for statement',
    'Send demand letter to adverse carrier',
    'Request police report from agency',
    'Follow up on outstanding medical records',
    'Review repair estimate for accuracy',
    'Outbound call to claimant representative',
    'Send proof of loss form',
    'Review coverage determination',
    'Follow up on demand response',
    'Request additional photos from field adjuster',
    'Review subrogation potential',
    'Send settlement offer letter',
    'Call attorney for case status',
    'Review new evidence submission',
    'Follow up on missing documentation',
    'Request updated medical bills',
    'Review liability assessment',
    'Send closing letter to insured',
    'Outbound call to adverse adjuster',
    'Review property damage appraisal',
    'Follow up on payment processing',
    'Request witness statement',
    'Review legal correspondence',
    'Send acknowledgment letter',
    'Call vendor for repair status',
    'Review claim reserve adequacy',
    'Follow up on deductible recovery',
    'Request rental car documentation',
    'Review expert report findings'
  ];
  v_deadline_types text[] := ARRAY['custom','regulatory','contractual','internal','statutory'];
  v_deadline_descs text[] := ARRAY[
    'Initial contact with insured required',
    'Proof of loss submission deadline',
    'Coverage determination letter due',
    'Demand response due from adverse carrier',
    'Medical records review completion',
    'Regulatory filing deadline',
    'Settlement offer response window',
    'Expert inspection scheduling',
    'Claim acknowledgment letter due',
    'Subrogation demand filing deadline',
    'Statutory limitation period',
    'Independent medical exam scheduling',
    'Property inspection completion',
    'Reserve review and update due',
    'Final claim determination deadline'
  ];
  v_recovery_sources text[] := ARRAY['subrogation','salvage','deductible_reimbursement','third_party','arbitration'];
  v_i int;
  v_j int;
  v_rand float;
  v_status text;
  v_task_id uuid;
  v_claim_id uuid;
  v_desk_id uuid;
  v_user_id uuid;
  v_now timestamp := now();
  v_created_at timestamp;
  v_deadline_date timestamp;
  v_deadline_status text;
  v_settlement_id uuid;
  v_num_events int;
  v_total_recovery numeric;
  v_event_amount numeric;
  v_claim_amount numeric;
  v_claim_party_id uuid;
  v_coverage_id uuid;
  v_num_tasks int;
  v_num_deadlines int;
  v_task_rec record;
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

  -- Claims with recovery status in_progress or recovered
  SELECT array_agg(id) INTO v_recovery_claim_ids
  FROM claim
  WHERE client_id = v_client_id
    AND recovery_status IN ('in_progress', 'recovered');

  IF v_user_ids IS NULL OR v_claim_ids IS NULL OR v_desk_location_ids IS NULL THEN
    RAISE EXCEPTION 'Missing prerequisite data. Run seed_claims and seed_desk_workflow first.';
  END IF;

  -- Wipe existing data
  DELETE FROM recovery_event WHERE client_id = v_client_id;
  DELETE FROM settlement WHERE client_id = v_client_id;
  DELETE FROM deadline WHERE client_id = v_client_id;
  DELETE FROM task WHERE client_id = v_client_id;

  -- =========================================================================
  -- TASKS (~300 tasks, 1-3 per claim with desk_location)
  -- =========================================================================
  FOR v_i IN 1..array_length(v_claim_ids, 1) LOOP
    v_claim_id := v_claim_ids[v_i];
    v_num_tasks := 1 + floor(random() * 3)::int; -- 1-3 tasks per claim

    FOR v_j IN 1..v_num_tasks LOOP
      v_rand := random();
      v_desk_id := v_desk_location_ids[1 + floor(random() * array_length(v_desk_location_ids, 1))::int];
      v_user_id := v_user_ids[1 + floor(random() * array_length(v_user_ids, 1))::int];
      v_created_at := v_now - (interval '1 day' * (floor(random() * 180)::int));

      -- Status distribution: 55% pending, 25% in_progress, 15% completed, 5% cancelled
      IF v_rand < 0.55 THEN
        v_status := 'pending';
      ELSIF v_rand < 0.80 THEN
        v_status := 'in_progress';
      ELSIF v_rand < 0.95 THEN
        v_status := 'completed';
      ELSE
        v_status := 'cancelled';
      END IF;

      INSERT INTO task (
        id, client_id, claim_id, desk_location_id, title, description,
        task_type, status, assigned_to, work_units,
        started_at, completed_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        v_client_id,
        v_claim_id,
        v_desk_id,
        v_task_titles[1 + floor(random() * array_length(v_task_titles, 1))::int],
        CASE WHEN random() > 0.4 THEN 'Please complete this task as part of the claim workflow.' ELSE NULL END,
        v_task_types[1 + floor(random() * array_length(v_task_types, 1))::int],
        v_status,
        CASE WHEN v_status IN ('in_progress','completed') THEN v_user_id ELSE
          CASE WHEN random() > 0.5 THEN v_user_id ELSE NULL END
        END,
        1 + floor(random() * 8)::int,
        CASE WHEN v_status IN ('in_progress','completed') THEN v_created_at + interval '1 day' * floor(random() * 5)::int ELSE NULL END,
        CASE WHEN v_status = 'completed' THEN v_created_at + interval '1 day' * (5 + floor(random() * 20)::int) ELSE NULL END,
        v_created_at,
        CASE WHEN v_status != 'pending' THEN v_created_at + interval '1 day' * floor(random() * 10)::int ELSE NULL END
      );
    END LOOP;
  END LOOP;

  -- =========================================================================
  -- DEADLINES (~150 linked to claims)
  -- =========================================================================
  v_num_deadlines := 0;
  FOR v_i IN 1..array_length(v_claim_ids, 1) LOOP
    EXIT WHEN v_num_deadlines >= 150;
    -- ~50% of claims get a deadline, some get 2
    CONTINUE WHEN random() > 0.65;

    v_claim_id := v_claim_ids[v_i];
    v_user_id := v_user_ids[1 + floor(random() * array_length(v_user_ids, 1))::int];
    v_created_at := v_now - (interval '1 day' * (30 + floor(random() * 150)::int));

    FOR v_j IN 1..(CASE WHEN random() > 0.6 THEN 2 ELSE 1 END) LOOP
      EXIT WHEN v_num_deadlines >= 150;

      v_rand := random();
      -- Deadline date spread around now: some past, some future
      v_deadline_date := v_now + (interval '1 day' * (floor(random() * 60)::int - 30));

      -- Status: 40% pending, 30% met, 20% missed, 10% cancelled
      IF v_rand < 0.40 THEN
        v_deadline_status := 'pending';
      ELSIF v_rand < 0.70 THEN
        v_deadline_status := 'met';
      ELSIF v_rand < 0.90 THEN
        v_deadline_status := 'missed';
      ELSE
        v_deadline_status := 'cancelled';
      END IF;

      INSERT INTO deadline (
        id, client_id, claim_id, deadline_type, deadline_date,
        description, status, created_by, created_at,
        completed_at, completed_by,
        cancelled_at, cancelled_by, cancellation_reason,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        v_client_id,
        v_claim_id,
        v_deadline_types[1 + floor(random() * array_length(v_deadline_types, 1))::int],
        v_deadline_date,
        v_deadline_descs[1 + floor(random() * array_length(v_deadline_descs, 1))::int],
        v_deadline_status,
        v_user_id,
        v_created_at,
        CASE WHEN v_deadline_status = 'met' THEN v_deadline_date - interval '1 day' * floor(random() * 5)::int ELSE NULL END,
        CASE WHEN v_deadline_status = 'met' THEN v_user_id ELSE NULL END,
        CASE WHEN v_deadline_status = 'cancelled' THEN v_now - interval '1 day' * floor(random() * 10)::int ELSE NULL END,
        CASE WHEN v_deadline_status = 'cancelled' THEN v_user_id ELSE NULL END,
        CASE WHEN v_deadline_status = 'cancelled' THEN 'No longer applicable due to claim resolution' ELSE NULL END,
        CASE WHEN v_deadline_status != 'pending' THEN v_now - interval '1 day' * floor(random() * 10)::int ELSE NULL END
      );
      v_num_deadlines := v_num_deadlines + 1;
    END LOOP;
  END LOOP;

  -- =========================================================================
  -- SETTLEMENTS (~30 for recovered claims)
  -- =========================================================================
  IF v_recovery_claim_ids IS NOT NULL THEN
    FOR v_i IN 1..LEAST(30, array_length(v_recovery_claim_ids, 1)) LOOP
      v_claim_id := v_recovery_claim_ids[v_i];
      v_user_id := v_user_ids[1 + floor(random() * array_length(v_user_ids, 1))::int];
      v_created_at := v_now - (interval '1 day' * (30 + floor(random() * 120)::int));

      -- Find an adverse carrier claim_party for this claim
      SELECT cp.id INTO v_claim_party_id
      FROM claim_party cp
      WHERE cp.claim_id = v_claim_id
        AND cp.client_id = v_client_id
        AND cp.deleted_at IS NULL
        AND 'adverse_carrier' = ANY(cp.role)
      LIMIT 1;

      -- Find a coverage for this claim
      SELECT cc.id INTO v_coverage_id
      FROM claim_coverage cc
      WHERE cc.claim_id = v_claim_id
        AND cc.client_id = v_client_id
        AND cc.deleted_at IS NULL
      LIMIT 1;

      -- Skip if no party or coverage found
      CONTINUE WHEN v_claim_party_id IS NULL OR v_coverage_id IS NULL;

      v_claim_amount := 5000 + floor(random() * 95000)::numeric;

      v_settlement_id := gen_random_uuid();
      INSERT INTO settlement (
        id, client_id, claim_id, claim_party_id, coverage_id,
        demand_amount, demand_date, settlement_amount, settlement_date,
        agreed_liability_percentage, status, settlement_structure,
        payment_amount, payment_frequency,
        notes, created_by, created_at, updated_at, settled_by
      ) VALUES (
        v_settlement_id,
        v_client_id,
        v_claim_id,
        v_claim_party_id,
        v_coverage_id,
        v_claim_amount,
        v_created_at,
        v_claim_amount * (0.5 + random() * 0.4),
        v_created_at + interval '1 day' * (14 + floor(random() * 60)::int),
        50 + floor(random() * 51)::numeric,
        CASE WHEN random() > 0.3 THEN 'settled' ELSE 'sent' END,
        CASE WHEN v_i % 4 = 0 THEN 'payment_plan' ELSE 'lump_sum' END,
        CASE WHEN v_i % 4 = 0 THEN round((v_claim_amount * 0.1)::numeric, 2) ELSE NULL END,
        CASE WHEN v_i % 4 = 0 THEN 'monthly' ELSE NULL END,
        CASE WHEN random() > 0.5 THEN 'Settlement reached after negotiation' ELSE NULL END,
        v_user_id,
        v_created_at,
        v_created_at + interval '1 day' * (14 + floor(random() * 60)::int),
        v_user_id
      );

      -- =====================================================================
      -- RECOVERY EVENTS (1-3 per recovery claim, linked to settlement)
      -- =====================================================================
      -- Get the actual_recovery for this claim to size events
      SELECT COALESCE(actual_recovery, 0)::numeric INTO v_total_recovery
      FROM claim WHERE id = v_claim_id;

      IF v_total_recovery <= 0 THEN
        v_total_recovery := 5000 + floor(random() * 50000)::numeric;
      END IF;

      v_num_events := 1 + floor(random() * 3)::int;
      FOR v_j IN 1..v_num_events LOOP
        -- Distribute recovery amount across events
        IF v_j = v_num_events THEN
          v_event_amount := GREATEST(v_total_recovery / v_num_events, 100);
        ELSE
          v_event_amount := (v_total_recovery / v_num_events) * (0.8 + random() * 0.4);
        END IF;

        INSERT INTO recovery_event (
          id, client_id, claim_id, settlement_id,
          recovery_amount, recovery_date, recovery_source,
          notes, created_by, created_at
        ) VALUES (
          gen_random_uuid(),
          v_client_id,
          v_claim_id,
          v_settlement_id,
          round(v_event_amount, 2),
          v_created_at + interval '1 day' * (30 + floor(random() * 90)::int + (v_j * 15)),
          v_recovery_sources[1 + floor(random() * array_length(v_recovery_sources, 1))::int],
          CASE WHEN random() > 0.5 THEN 'Payment received from adverse carrier' ELSE NULL END,
          v_user_id,
          v_created_at + interval '1 day' * (30 + floor(random() * 90)::int + (v_j * 15))
        );
      END LOOP;
    END LOOP;

    -- Also create recovery events for remaining recovery claims without settlements
    FOR v_i IN 31..COALESCE(array_length(v_recovery_claim_ids, 1), 30) LOOP
      v_claim_id := v_recovery_claim_ids[v_i];
      v_user_id := v_user_ids[1 + floor(random() * array_length(v_user_ids, 1))::int];
      v_created_at := v_now - (interval '1 day' * (30 + floor(random() * 120)::int));

      -- Need a settlement for the FK - create a minimal one
      SELECT cp.id INTO v_claim_party_id
      FROM claim_party cp
      WHERE cp.claim_id = v_claim_id
        AND cp.client_id = v_client_id
        AND cp.deleted_at IS NULL
      LIMIT 1;

      SELECT cc.id INTO v_coverage_id
      FROM claim_coverage cc
      WHERE cc.claim_id = v_claim_id
        AND cc.client_id = v_client_id
        AND cc.deleted_at IS NULL
      LIMIT 1;

      CONTINUE WHEN v_claim_party_id IS NULL OR v_coverage_id IS NULL;

      v_claim_amount := 3000 + floor(random() * 40000)::numeric;
      v_settlement_id := gen_random_uuid();

      INSERT INTO settlement (
        id, client_id, claim_id, claim_party_id, coverage_id,
        demand_amount, demand_date, status,
        created_by, created_at
      ) VALUES (
        v_settlement_id,
        v_client_id,
        v_claim_id,
        v_claim_party_id,
        v_coverage_id,
        v_claim_amount,
        v_created_at,
        'sent',
        v_user_id,
        v_created_at
      );

      SELECT COALESCE(actual_recovery, 0)::numeric INTO v_total_recovery
      FROM claim WHERE id = v_claim_id;
      IF v_total_recovery <= 0 THEN
        v_total_recovery := 2000 + floor(random() * 20000)::numeric;
      END IF;

      INSERT INTO recovery_event (
        id, client_id, claim_id, settlement_id,
        recovery_amount, recovery_date, recovery_source,
        notes, created_by, created_at
      ) VALUES (
        gen_random_uuid(),
        v_client_id,
        v_claim_id,
        v_settlement_id,
        round(v_total_recovery, 2),
        v_created_at + interval '1 day' * (30 + floor(random() * 60)::int),
        v_recovery_sources[1 + floor(random() * array_length(v_recovery_sources, 1))::int],
        NULL,
        v_user_id,
        v_created_at + interval '1 day' * (30 + floor(random() * 60)::int)
      );
    END LOOP;
  END IF;

  -- =========================================================================
  -- LINK DEADLINES TO TASKS AND CLAIMS (entity_type + entity_id)
  -- =========================================================================
  -- Link ~100 deadlines to tasks
  FOR v_task_rec IN (SELECT t.id, t.claim_id FROM task t WHERE t.client_id = v_client_id ORDER BY random() LIMIT 100) LOOP
    UPDATE deadline SET entity_type = 'task', entity_id = v_task_rec.id
    WHERE claim_id = v_task_rec.claim_id AND entity_type IS NULL
    AND id = (SELECT id FROM deadline WHERE claim_id = v_task_rec.claim_id AND entity_type IS NULL LIMIT 1);
  END LOOP;

  -- Link remaining unlinked deadlines to their claims
  UPDATE deadline SET entity_type = 'claim', entity_id = claim_id
  WHERE entity_type IS NULL AND client_id = v_client_id;

  RAISE NOTICE 'Seeded tasks, deadlines, settlements, and recovery events for client %', v_client_id;
END $$;
