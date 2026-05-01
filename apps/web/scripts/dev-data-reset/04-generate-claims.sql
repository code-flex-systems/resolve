-- =====================================================
-- 04-generate-claims.sql
-- Generate ~200 claims with realistic data across 4 LOBs
-- LOB Mix: Property, General Liability, Workers Comp, Professional Liability
-- Distribution (~50 each LOB via i % 4):
--   LOB 0 = property (PROP), LOB 1 = general_liability (GL),
--   LOB 2 = workers_comp (WC), LOB 3 = professional_liability (PL)
-- Substatus distribution (via i % 20):
--   investigation:       0-2   (30 claims, 15%)
--   demand_sent:         3-5   (30 claims, 15%)
--   negotiation:         6-8   (30 claims, 15%)
--   settlement_reached:  9-13  (50 claims, 25%)
--   litigation:          14-17 (20 claims, 10%) -- note: only 14-15 used below for exact 20
--   closed_recovered:    16-17 + extras (25 claims, 12.5%)
--   closed_no_recovery:  18-19 (15 claims, 7.5%) -- tuned below
-- ~40%+ in settlement_reached or closed_recovered (75/200 = 37.5% + adjustments)
-- =====================================================

DO $$
DECLARE
    v_client_id UUID;
    v_user_id UUID;
    v_users TEXT[];
    v_user_count INT;
    i INT;
    v_lob TEXT;
    v_lob_prefix TEXT;
    v_substatus TEXT;
    v_recovery_status TEXT;
    v_claim_amount NUMERIC;
    v_expected_recovery NUMERIC;
    v_date_of_loss DATE;
    v_insured TEXT;
    v_client_name TEXT;
    v_city TEXT;
    v_state TEXT;
    v_street TEXT;
    v_postal TEXT;
    v_mod INT;
    v_lob_seq INT;  -- per-LOB sequence counter
    v_year TEXT;
BEGIN
    SELECT id INTO v_client_id FROM client LIMIT 1;
    SELECT id INTO v_user_id FROM users ORDER BY created_at ASC LIMIT 1;

    -- Get available users for assignment (emails for client_adjuster field which is TEXT)
    SELECT ARRAY_AGG(email) INTO v_users FROM users WHERE email IS NOT NULL;
    v_user_count := COALESCE(array_length(v_users, 1), 1);

    FOR i IN 1..200 LOOP
        -- =====================================================
        -- LOB assignment (i % 4)
        -- =====================================================
        CASE (i % 4)
            WHEN 0 THEN v_lob := 'property';         v_lob_prefix := 'PROP';
            WHEN 1 THEN v_lob := 'general_liability'; v_lob_prefix := 'GL';
            WHEN 2 THEN v_lob := 'workers_comp';      v_lob_prefix := 'WC';
            WHEN 3 THEN v_lob := 'professional_liability'; v_lob_prefix := 'PL';
        END CASE;

        -- =====================================================
        -- Substatus distribution (i % 20)
        -- investigation:        0,1,2         => 30 claims (15%)
        -- demand_sent:          3,4,5         => 30 claims (15%)
        -- negotiation:          6,7,8         => 30 claims (15%)
        -- settlement_reached:   9,10,11,12,13 => 50 claims (25%)
        -- litigation:           14,15         => 20 claims (10%)
        -- closed_recovered:     16,17,18      => 30 claims (15%) -- bumped to ensure 40%+ settleable
        -- closed_no_recovery:   19            => 10 claims (5%)
        -- settlement_reached + closed_recovered = 80/200 = 40%
        -- =====================================================
        v_mod := i % 20;
        CASE
            WHEN v_mod BETWEEN 0 AND 2  THEN v_substatus := 'investigation';
            WHEN v_mod BETWEEN 3 AND 5  THEN v_substatus := 'demand_sent';
            WHEN v_mod BETWEEN 6 AND 8  THEN v_substatus := 'negotiation';
            WHEN v_mod BETWEEN 9 AND 13 THEN v_substatus := 'settlement_reached';
            WHEN v_mod BETWEEN 14 AND 15 THEN v_substatus := 'litigation';
            WHEN v_mod BETWEEN 16 AND 18 THEN v_substatus := 'closed_recovered';
            ELSE v_substatus := 'closed_no_recovery';  -- 19
        END CASE;

        -- =====================================================
        -- Recovery status (derived from substatus)
        -- =====================================================
        CASE v_substatus
            WHEN 'investigation'      THEN v_recovery_status := 'pending';
            WHEN 'demand_sent'        THEN v_recovery_status := 'pending';
            WHEN 'negotiation'        THEN v_recovery_status := 'in_progress';
            WHEN 'settlement_reached' THEN v_recovery_status := 'in_progress';
            WHEN 'litigation'         THEN v_recovery_status := 'in_progress';
            WHEN 'closed_recovered'   THEN v_recovery_status := 'recovered';
            WHEN 'closed_no_recovery' THEN v_recovery_status := 'closed_no_recovery';
        END CASE;

        -- =====================================================
        -- Claim amount: $5K - $500K range
        -- =====================================================
        v_claim_amount := 5000 + ((i * 2477) % 495001);  -- pseudo-random spread using prime multiplier

        -- =====================================================
        -- Expected recovery: populated for all beyond investigation
        -- =====================================================
        IF v_substatus = 'investigation' THEN
            v_expected_recovery := NULL;
        ELSE
            -- 40-80% of claim amount
            v_expected_recovery := ROUND(v_claim_amount * (0.4 + ((i % 5) * 0.1)), 2);
        END IF;

        -- =====================================================
        -- Date of loss: spread across last 18 months (Sep 2024 - Mar 2026)
        -- =====================================================
        v_date_of_loss := '2024-09-01'::DATE + ((i * 3) % 548) * INTERVAL '1 day';

        -- Year for claim number based on date_of_loss
        v_year := EXTRACT(YEAR FROM v_date_of_loss)::TEXT;

        -- =====================================================
        -- Insured names (rotating through 20 names)
        -- =====================================================
        CASE (i % 20)
            WHEN 0  THEN v_insured := 'Michael Thompson';
            WHEN 1  THEN v_insured := 'Sarah Martinez';
            WHEN 2  THEN v_insured := 'David Chen';
            WHEN 3  THEN v_insured := 'Jennifer Williams';
            WHEN 4  THEN v_insured := 'Robert Johnson';
            WHEN 5  THEN v_insured := 'Emily Davis';
            WHEN 6  THEN v_insured := 'James Wilson';
            WHEN 7  THEN v_insured := 'Amanda Brown';
            WHEN 8  THEN v_insured := 'Christopher Lee';
            WHEN 9  THEN v_insured := 'Jessica Garcia';
            WHEN 10 THEN v_insured := 'Metro Transit Authority';
            WHEN 11 THEN v_insured := 'Pacific Manufacturing Inc';
            WHEN 12 THEN v_insured := 'Valley Construction Co';
            WHEN 13 THEN v_insured := 'Downtown Medical Center';
            WHEN 14 THEN v_insured := 'Sunrise Properties LLC';
            WHEN 15 THEN v_insured := 'Sterling Legal Partners';
            WHEN 16 THEN v_insured := 'Coastal Engineering Group';
            WHEN 17 THEN v_insured := 'Heartland Distribution Co';
            WHEN 18 THEN v_insured := 'Summit Financial Advisors';
            WHEN 19 THEN v_insured := 'Riverdale Healthcare Systems';
        END CASE;

        -- =====================================================
        -- Client/carrier names (rotating through 10)
        -- =====================================================
        CASE (i % 10)
            WHEN 0 THEN v_client_name := 'Liberty Mutual';
            WHEN 1 THEN v_client_name := 'State Farm';
            WHEN 2 THEN v_client_name := 'Travelers';
            WHEN 3 THEN v_client_name := 'Allstate';
            WHEN 4 THEN v_client_name := 'Hartford';
            WHEN 5 THEN v_client_name := 'Chubb';
            WHEN 6 THEN v_client_name := 'CNA';
            WHEN 7 THEN v_client_name := 'Nationwide';
            WHEN 8 THEN v_client_name := 'AIG';
            WHEN 9 THEN v_client_name := 'Zurich';
        END CASE;

        -- =====================================================
        -- Location data (rotating through 15 cities)
        -- =====================================================
        CASE (i % 15)
            WHEN 0  THEN v_city := 'Los Angeles';    v_state := 'CA'; v_postal := '90001';
            WHEN 1  THEN v_city := 'Phoenix';         v_state := 'AZ'; v_postal := '85001';
            WHEN 2  THEN v_city := 'Denver';           v_state := 'CO'; v_postal := '80201';
            WHEN 3  THEN v_city := 'Seattle';          v_state := 'WA'; v_postal := '98101';
            WHEN 4  THEN v_city := 'San Francisco';    v_state := 'CA'; v_postal := '94101';
            WHEN 5  THEN v_city := 'Portland';         v_state := 'OR'; v_postal := '97201';
            WHEN 6  THEN v_city := 'Houston';          v_state := 'TX'; v_postal := '77001';
            WHEN 7  THEN v_city := 'Dallas';           v_state := 'TX'; v_postal := '75201';
            WHEN 8  THEN v_city := 'Chicago';          v_state := 'IL'; v_postal := '60601';
            WHEN 9  THEN v_city := 'Boston';           v_state := 'MA'; v_postal := '02101';
            WHEN 10 THEN v_city := 'New York';         v_state := 'NY'; v_postal := '10001';
            WHEN 11 THEN v_city := 'Miami';            v_state := 'FL'; v_postal := '33101';
            WHEN 12 THEN v_city := 'Atlanta';          v_state := 'GA'; v_postal := '30301';
            WHEN 13 THEN v_city := 'Minneapolis';      v_state := 'MN'; v_postal := '55401';
            WHEN 14 THEN v_city := 'San Diego';        v_state := 'CA'; v_postal := '92101';
        END CASE;

        v_street := (100 + i * 7)::TEXT || ' ' ||
            CASE (i % 6)
                WHEN 0 THEN 'Main Street'
                WHEN 1 THEN 'Commerce Blvd'
                WHEN 2 THEN 'Industrial Way'
                WHEN 3 THEN 'Business Park Dr'
                WHEN 4 THEN 'Corporate Center'
                ELSE 'Oak Avenue'
            END;

        -- =====================================================
        -- INSERT
        -- =====================================================
        INSERT INTO claim (
            client_id, claim_number, claim_amount, client, client_adjuster,
            date_of_loss, insured, last_update, last_updated_by,
            loss_street_address, loss_city, loss_state, loss_postal_code, loss_country,
            recovery_status, substatus, expected_recovery, line_of_business,
            created_by, created_at
        ) VALUES (
            v_client_id,
            v_lob_prefix || '-' || v_year || '-' || LPAD(i::TEXT, 5, '0'),
            v_claim_amount,
            v_client_name,
            v_users[1 + (i % v_user_count)],
            v_date_of_loss,
            v_insured,
            (v_date_of_loss + ((i % 30) + 10) * INTERVAL '1 day')::DATE,  -- last_update 10-40 days after loss
            v_users[1 + (i % v_user_count)],
            v_street,
            v_city,
            v_state,
            v_postal,
            'USA',
            v_recovery_status,
            v_substatus,
            v_expected_recovery,
            v_lob,
            v_user_id,
            (v_date_of_loss + INTERVAL '1 day')::TIMESTAMP  -- created day after loss
        );
    END LOOP;

END $$;

SELECT 'Claims created:' AS info, COUNT(*) AS count FROM claim;
SELECT substatus, COUNT(*) AS count FROM claim GROUP BY substatus ORDER BY substatus;
SELECT line_of_business, COUNT(*) AS count FROM claim GROUP BY line_of_business ORDER BY line_of_business;
SELECT recovery_status, COUNT(*) AS count FROM claim GROUP BY recovery_status ORDER BY recovery_status;
