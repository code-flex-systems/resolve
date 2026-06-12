-- Seed desk hierarchy, user assignments, and claim routing
DO $$
DECLARE
    v_client_id uuid := '00000000-0000-4000-8000-000000000001';
    v_admin_id uuid;
    v_user_ids uuid[];
    v_type_id uuid;
    v_loc_id uuid;
    v_loc_ids uuid[];
    v_claim_rec record;
    v_type_names text[] := ARRAY['Initial Triage & Assessment', 'Subrogation Investigation', 'Adverse Coverage Verification', 'Documentation and Demand Packages', 'Pursuit of Recovery', 'Arbitration', 'Litigation'];
    v_loc_names text[] := ARRAY['Pending', 'Transactional', 'Request for Information', 'Review for Closure', 'Closed'];
    v_work_units int[] := ARRAY[48, 96, 36, 48, 12];
    v_i int;
    v_j int;
    v_rand_loc uuid;
    v_prev_loc uuid;
BEGIN
    SELECT id INTO v_admin_id FROM users WHERE role IN ('Super Admin', 'Admin') AND client_id = v_client_id LIMIT 1;
    SELECT array_agg(id) INTO v_user_ids FROM users WHERE client_id = v_client_id AND disabled = false;

    -- Wipe existing desk data
    TRUNCATE TABLE user_desk_location CASCADE;
    TRUNCATE TABLE claim_desk_location_transition CASCADE;
    TRUNCATE TABLE desk_location CASCADE;
    TRUNCATE TABLE desk_location_type CASCADE;

    -- Create 7 desk location types
    FOR v_i IN 1..7 LOOP
        INSERT INTO desk_location_type (id, name, client_id, created_by)
        VALUES (gen_random_uuid(), v_type_names[v_i], v_client_id, v_admin_id)
        RETURNING id INTO v_type_id;

        -- 5 locations per type
        FOR v_j IN 1..5 LOOP
            INSERT INTO desk_location (id, name, desk_location_type_id, is_active, daily_work_units, client_id, created_by)
            VALUES (gen_random_uuid(), v_loc_names[v_j], v_type_id, true, v_work_units[v_j], v_client_id, v_admin_id);
        END LOOP;
    END LOOP;

    -- Collect all location IDs
    SELECT array_agg(id) INTO v_loc_ids FROM desk_location WHERE client_id = v_client_id;

    -- Assign each user to 2-4 desk locations
    FOR v_i IN 1..array_length(v_user_ids, 1) LOOP
        FOR v_j IN 1..(2 + floor(random() * 3)::int) LOOP
            INSERT INTO user_desk_location (id, user_id, desk_location_id, priority, assigned_by)
            VALUES (gen_random_uuid(), v_user_ids[v_i], v_loc_ids[1 + floor(random() * array_length(v_loc_ids, 1))::int], v_j, v_admin_id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;

    -- Assign ~160 claims to desk locations
    FOR v_claim_rec IN (SELECT id FROM claim WHERE client_id = v_client_id ORDER BY random() LIMIT 160) LOOP
        v_rand_loc := v_loc_ids[1 + floor(random() * array_length(v_loc_ids, 1))::int];
        UPDATE claim SET desk_location_id = v_rand_loc WHERE id = v_claim_rec.id;
    END LOOP;

    -- Create transitions for ~80 claims (showing 2-3 stage movements)
    FOR v_claim_rec IN (SELECT id, desk_location_id FROM claim WHERE client_id = v_client_id AND desk_location_id IS NOT NULL ORDER BY random() LIMIT 80) LOOP
        v_prev_loc := v_loc_ids[1 + floor(random() * array_length(v_loc_ids, 1))::int];

        -- First transition (30-60 days ago)
        INSERT INTO claim_desk_location_transition (id, claim_id, desk_location_id, previous_desk_location_id, entered_at, entered_by, client_id)
        VALUES (gen_random_uuid(), v_claim_rec.id, v_claim_rec.desk_location_id, v_prev_loc,
                now() - (30 + floor(random() * 30))::int * interval '1 day', v_admin_id, v_client_id);

        -- Some get a second transition (10-20 days ago)
        IF random() < 0.5 THEN
            INSERT INTO claim_desk_location_transition (id, claim_id, desk_location_id, previous_desk_location_id, entered_at, entered_by, client_id)
            VALUES (gen_random_uuid(), v_claim_rec.id, v_prev_loc, v_loc_ids[1 + floor(random() * array_length(v_loc_ids, 1))::int],
                    now() - (10 + floor(random() * 20))::int * interval '1 day', v_admin_id, v_client_id);
        END IF;
    END LOOP;

    -- Lower capacity_threshold on the 5 busiest locations to trigger suggestion algorithm breaches
    UPDATE desk_location SET capacity_threshold = 40
    WHERE id IN (
        SELECT dl.id FROM desk_location dl
        LEFT JOIN claim c ON c.desk_location_id = dl.id
        LEFT JOIN task t ON t.claim_id = c.id AND t.completed_at IS NULL
        WHERE dl.client_id = v_client_id AND dl.is_active = true AND dl.deleted_at IS NULL
        GROUP BY dl.id
        HAVING COALESCE(SUM(t.work_units), 0) > 50
        ORDER BY COALESCE(SUM(t.work_units), 0) DESC
        LIMIT 5
    );

    RAISE NOTICE 'Seeded desk hierarchy with % locations and user assignments', array_length(v_loc_ids, 1);
END $$;
