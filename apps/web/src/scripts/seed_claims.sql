-- Seed 200 claims with realistic distribution
DO $$
DECLARE
    v_client_id uuid := '1c118f90-3153-4dfb-b350-953e42f0d1aa';
    v_feed_id uuid;
    v_user_ids uuid[];
    v_user_id uuid;
    v_i int;
    v_claim_amount numeric;
    v_expected numeric;
    v_actual numeric;
    v_lob text;
    v_loss_type text;
    v_recovery_status text;
    v_substatus text;
    v_dol timestamp;
    v_rand float;
    v_loss_types_auto text[] := ARRAY['collision', 'comprehensive', 'bodily_injury', 'uninsured_motorist'];
    v_loss_types_prop text[] := ARRAY['fire', 'water_damage', 'wind', 'theft', 'vandalism'];
    v_loss_types_liab text[] := ARRAY['bodily_injury', 'property_damage', 'medical_payments'];
    v_states text[] := ARRAY['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
    v_first_names text[] := ARRAY['James','Mary','Robert','Patricia','John','Jennifer','Michael','Linda','David','Elizabeth','William','Barbara','Richard','Susan','Joseph','Jessica','Thomas','Sarah','Charles','Karen','Christopher','Lisa','Daniel','Nancy','Matthew','Betty','Anthony','Margaret','Mark','Sandra','Donald','Ashley','Steven','Dorothy','Paul','Kimberly','Andrew','Emily','Joshua','Donna'];
    v_last_names text[] := ARRAY['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin','Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson'];
    v_insureds text[] := ARRAY['State Farm Insurance','Allstate Corporation','Progressive Insurance','USAA','Liberty Mutual','Nationwide Insurance','Farmers Insurance','Travelers Companies','American Family Insurance','Erie Insurance'];
    v_clients text[] := ARRAY['Hartford Financial','CNA Financial','Zurich Insurance','AIG','Chubb Limited','Berkshire Hathaway','MetLife','Aflac','Principal Financial','Unum Group'];
BEGIN
    -- Truncate claims (CASCADE handles all dependent tables)
    TRUNCATE TABLE claim CASCADE;

    -- Get feed id
    SELECT id INTO v_feed_id FROM feeds WHERE client_id = v_client_id LIMIT 1;

    -- Get user ids
    SELECT array_agg(id) INTO v_user_ids FROM users WHERE client_id = v_client_id AND disabled = false;

    FOR v_i IN 1..200 LOOP
        v_rand := random();
        v_user_id := v_user_ids[1 + floor(random() * array_length(v_user_ids, 1))::int];

        -- Line of business weighted: 35% auto, 30% property, 20% liability, 10% workers_comp, 5% professional
        IF v_rand < 0.35 THEN v_lob := 'auto';
        ELSIF v_rand < 0.65 THEN v_lob := 'property';
        ELSIF v_rand < 0.85 THEN v_lob := 'general_liability';
        ELSIF v_rand < 0.95 THEN v_lob := 'workers_comp';
        ELSE v_lob := 'professional_liability';
        END IF;

        -- Loss type based on LOB
        IF v_lob = 'auto' THEN v_loss_type := v_loss_types_auto[1 + floor(random() * 4)::int];
        ELSIF v_lob = 'property' THEN v_loss_type := v_loss_types_prop[1 + floor(random() * 5)::int];
        ELSE v_loss_type := v_loss_types_liab[1 + floor(random() * 3)::int];
        END IF;

        -- Recovery status: 40% pending, 25% in_progress, 20% recovered, 15% closed_no_recovery
        v_rand := random();
        IF v_rand < 0.40 THEN v_recovery_status := 'pending';
        ELSIF v_rand < 0.65 THEN v_recovery_status := 'in_progress';
        ELSIF v_rand < 0.85 THEN v_recovery_status := 'recovered';
        ELSE v_recovery_status := 'closed_no_recovery';
        END IF;

        -- Substatus paired with recovery_status
        CASE v_recovery_status
            WHEN 'pending' THEN v_substatus := 'investigation';
            WHEN 'in_progress' THEN
                v_rand := random();
                IF v_rand < 0.4 THEN v_substatus := 'demand_sent';
                ELSIF v_rand < 0.7 THEN v_substatus := 'negotiation';
                ELSE v_substatus := 'litigation';
                END IF;
            WHEN 'recovered' THEN
                IF random() < 0.7 THEN v_substatus := 'settlement_reached';
                ELSE v_substatus := 'closed_recovered';
                END IF;
            WHEN 'closed_no_recovery' THEN
                IF random() < 0.7 THEN v_substatus := 'closed_no_recovery';
                ELSE v_substatus := 'cancelled';
                END IF;
        END CASE;

        -- Amounts
        v_claim_amount := 5000 + floor(random() * 495000);
        v_expected := v_claim_amount * (0.3 + random() * 0.5);
        CASE v_recovery_status
            WHEN 'pending' THEN v_actual := 0;
            WHEN 'in_progress' THEN v_actual := v_expected * (0.1 + random() * 0.4);
            WHEN 'recovered' THEN v_actual := v_expected * (0.7 + random() * 0.3);
            WHEN 'closed_no_recovery' THEN v_actual := 0;
        END CASE;

        -- Date of loss: spread over last 18 months
        v_dol := now() - (random() * 548 || ' days')::interval;

        INSERT INTO claim (
            id, claim_number, client_id, feed_id, created_by, last_updated_by,
            insured, client, client_adjuster,
            claim_amount, expected_recovery, actual_recovery,
            date_of_loss, loss_state, loss_city,
            line_of_business, recovery_status, substatus,
            created_at
        ) VALUES (
            gen_random_uuid(),
            'CLM-' || to_char(v_dol, 'YYYY') || '-' || lpad(v_i::text, 5, '0'),
            v_client_id,
            CASE WHEN v_i <= 140 THEN v_feed_id ELSE NULL END,  -- 140 fed, 60 manual
            v_user_id,
            v_user_id,
            v_insureds[1 + floor(random() * 10)::int],
            v_clients[1 + floor(random() * 10)::int],
            v_first_names[1 + floor(random() * 40)::int] || ' ' || v_last_names[1 + floor(random() * 30)::int],
            v_claim_amount,
            round(v_expected, 2),
            round(v_actual, 2),
            v_dol,
            v_states[1 + floor(random() * 50)::int],
            'City ' || (1 + floor(random() * 100)::int),
            v_lob,
            v_recovery_status,
            v_substatus,
            v_dol + (random() * 30 || ' days')::interval
        );
    END LOOP;

    RAISE NOTICE 'Seeded 200 claims';
END $$;
