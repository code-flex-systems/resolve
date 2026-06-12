-- Seed parties, claim-party links, and coverage
DO $$
DECLARE
    v_client_id uuid := '00000000-0000-4000-8000-000000000001';
    v_admin_id uuid;
    v_party_id uuid;
    v_address_id uuid;
    v_rep_id uuid;
    v_claim_rec record;
    v_claim_party_id uuid;
    v_i int;
    v_carrier_names text[] := ARRAY['Acme Insurance Co','National Indemnity','Federal Surety Group','Pacific Mutual','Atlantic Underwriters','Continental Assurance','Midwest Casualty','Southern Guaranty'];
    v_law_firms text[] := ARRAY['Baker & Associates','Chen Law Group','Morrison Legal','Thompson & Partners'];
    v_expert_firms text[] := ARRAY['Apex Forensic Engineering','DataPoint Analytics','ProValue Consulting'];
    v_vendor_names text[] := ARRAY['RestorePro Services','CleanSweep Restoration','BuildRight Construction'];
    v_person_firsts text[] := ARRAY['James','Mary','Robert','Patricia','John','Jennifer','Michael','Linda','David','Elizabeth'];
    v_person_lasts text[] := ARRAY['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez'];
    v_cities text[] := ARRAY['New York','Los Angeles','Chicago','Houston','Phoenix','Philadelphia','San Antonio','San Diego','Dallas','Austin'];
    v_states text[] := ARRAY['NY','CA','IL','TX','AZ','PA','TX','CA','TX','TX'];
    v_coverage_types_auto text[] := ARRAY['collision','comprehensive','liability','uninsured_motorist'];
    v_coverage_types_prop text[] := ARRAY['dwelling','personal_property','loss_of_use'];
    v_coverage_types_liab text[] := ARRAY['liability','medical_payments'];
    v_party_ids uuid[];
    v_carrier_party_ids uuid[];
    v_loss_type_val text;
BEGIN
    SELECT id INTO v_admin_id FROM users WHERE role IN ('Super Admin', 'Admin') AND client_id = v_client_id LIMIT 1;

    -- Wipe existing party data
    TRUNCATE TABLE claim_party CASCADE;
    TRUNCATE TABLE party CASCADE;

    -- Create 8 adverse carriers (facilitators)
    FOR v_i IN 1..8 LOOP
        INSERT INTO party (id, name, party_type, is_business, client_id, created_by)
        VALUES (gen_random_uuid(), v_carrier_names[v_i], 'facilitator', true, v_client_id, v_admin_id)
        RETURNING id INTO v_party_id;

        v_carrier_party_ids := array_append(v_carrier_party_ids, v_party_id);

        -- Add address
        INSERT INTO party_address (id, party_id, name, street_address, city, state, postal_code, country, address_type, address_status, created_by)
        VALUES (gen_random_uuid(), v_party_id, 'Headquarters',
                (100 + v_i * 10) || ' Corporate Blvd',
                v_cities[v_i], v_states[v_i], lpad((10000 + floor(random() * 89999))::text, 5, '0'), 'US',
                'business', 'valid', v_admin_id)
        RETURNING id INTO v_address_id;

        -- Add representative
        INSERT INTO party_representative (id, party_id, address_id, first_name, last_name, title, email, phone, is_primary, created_by)
        VALUES (gen_random_uuid(), v_party_id, v_address_id,
                v_person_firsts[1 + floor(random() * 10)::int], v_person_lasts[1 + floor(random() * 10)::int],
                'Claims Adjuster', 'adjuster' || v_i || '@' || lower(replace(v_carrier_names[v_i], ' ', '')) || '.com',
                '(' || (200 + v_i) || ') 555-' || lpad((1000 + floor(random() * 8999))::text, 4, '0'),
                true, v_admin_id);

        -- Add email
        INSERT INTO party_email (id, party_id, email_address, email_type, client_id, created_by)
        VALUES (gen_random_uuid(), v_party_id, 'claims@' || lower(replace(v_carrier_names[v_i], ' ', '')) || '.com', 'business', v_client_id, v_admin_id);

        -- Add phone
        INSERT INTO party_phone (id, party_id, phone_number, phone_type, phone_status, client_id, created_by)
        VALUES (gen_random_uuid(), v_party_id, '(' || (200 + v_i) || ') 555-0000', 'work', 'valid', v_client_id, v_admin_id);
    END LOOP;

    -- Create 4 law firms
    FOR v_i IN 1..4 LOOP
        INSERT INTO party (id, name, party_type, is_business, client_id, created_by)
        VALUES (gen_random_uuid(), v_law_firms[v_i], 'facilitator', true, v_client_id, v_admin_id)
        RETURNING id INTO v_party_id;
        v_party_ids := array_append(v_party_ids, v_party_id);

        INSERT INTO party_address (id, party_id, name, street_address, city, state, postal_code, country, address_type, address_status, created_by)
        VALUES (gen_random_uuid(), v_party_id, 'Main Office', (200 + v_i * 5) || ' Legal Ave', v_cities[v_i], v_states[v_i], lpad((20000 + floor(random() * 79999))::text, 5, '0'), 'US', 'business', 'valid', v_admin_id);

        INSERT INTO party_email (id, party_id, email_address, email_type, client_id, created_by)
        VALUES (gen_random_uuid(), v_party_id, 'info@' || lower(replace(v_law_firms[v_i], ' ', '')) || '.com', 'business', v_client_id, v_admin_id);
    END LOOP;

    -- Create 10 individual entities (responsible parties / claimants)
    FOR v_i IN 1..10 LOOP
        INSERT INTO party (id, name, first_name, last_name, party_type, is_business, client_id, created_by)
        VALUES (gen_random_uuid(),
                v_person_firsts[v_i] || ' ' || v_person_lasts[v_i],
                v_person_firsts[v_i], v_person_lasts[v_i],
                'entity',
                false, v_client_id, v_admin_id)
        RETURNING id INTO v_party_id;
        v_party_ids := array_append(v_party_ids, v_party_id);

        INSERT INTO party_address (id, party_id, street_address, city, state, postal_code, country, address_type, address_status, created_by)
        VALUES (gen_random_uuid(), v_party_id, (100 + v_i) || ' Residential St', v_cities[v_i], v_states[v_i], lpad((30000 + floor(random() * 69999))::text, 5, '0'), 'US', 'home', 'valid', v_admin_id);

        INSERT INTO party_email (id, party_id, email_address, email_type, client_id, created_by)
        VALUES (gen_random_uuid(), v_party_id, lower(v_person_firsts[v_i]) || '.' || lower(v_person_lasts[v_i]) || '@email.com', 'personal', v_client_id, v_admin_id);
    END LOOP;

    -- Link parties to claims + create coverage
    FOR v_claim_rec IN (SELECT id, line_of_business, claim_amount FROM claim WHERE client_id = v_client_id) LOOP
        -- Each claim gets 1 adverse carrier
        INSERT INTO claim_party (id, claim_id, party_id, role, is_primary, client_id, created_by)
        VALUES (gen_random_uuid(), v_claim_rec.id,
                v_carrier_party_ids[1 + floor(random() * array_length(v_carrier_party_ids, 1))::int],
                ARRAY['adverse_carrier'], true, v_client_id, v_admin_id)
        RETURNING id INTO v_claim_party_id;

        -- Create 1-2 coverage records per claim
        IF v_claim_rec.line_of_business = 'auto' THEN
            v_loss_type_val := v_coverage_types_auto[1 + floor(random() * 4)::int];
            INSERT INTO claim_coverage (id, claim_id, claim_party_id, loss_type, coverage_amount, deductible_amount, deductible_status, client_id, created_by)
            VALUES (gen_random_uuid(), v_claim_rec.id, v_claim_party_id,
                    v_loss_type_val,
                    round((v_claim_rec.claim_amount * (0.5 + random() * 0.5))::numeric, 2),
                    round((500 + random() * 2000)::numeric, 2), 'applies',
                    v_client_id, v_admin_id);
        ELSIF v_claim_rec.line_of_business = 'property' THEN
            v_loss_type_val := v_coverage_types_prop[1 + floor(random() * 3)::int];
            INSERT INTO claim_coverage (id, claim_id, claim_party_id, loss_type, coverage_amount, deductible_amount, deductible_status, client_id, created_by)
            VALUES (gen_random_uuid(), v_claim_rec.id, v_claim_party_id,
                    v_loss_type_val,
                    round((v_claim_rec.claim_amount * (0.5 + random() * 0.5))::numeric, 2),
                    round((1000 + random() * 5000)::numeric, 2), 'applies',
                    v_client_id, v_admin_id);
        ELSE
            v_loss_type_val := v_coverage_types_liab[1 + floor(random() * 2)::int];
            INSERT INTO claim_coverage (id, claim_id, claim_party_id, loss_type, coverage_amount, deductible_amount, deductible_status, client_id, created_by)
            VALUES (gen_random_uuid(), v_claim_rec.id, v_claim_party_id,
                    v_loss_type_val,
                    round((v_claim_rec.claim_amount * (0.5 + random() * 0.5))::numeric, 2),
                    0, 'no_deductible',
                    v_client_id, v_admin_id);
        END IF;

        -- ~60% of claims also get a responsible party/claimant
        IF random() < 0.6 THEN
            INSERT INTO claim_party (id, claim_id, party_id, role, liability_percentage, is_primary, client_id, created_by)
            VALUES (gen_random_uuid(), v_claim_rec.id,
                    v_party_ids[1 + floor(random() * array_length(v_party_ids, 1))::int],
                    ARRAY[CASE WHEN random() < 0.5 THEN 'responsible_party' ELSE 'claimant' END],
                    floor(20 + random() * 80),
                    false, v_client_id, v_admin_id)
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;

    RAISE NOTICE 'Seeded parties and claim-party links';
END $$;
