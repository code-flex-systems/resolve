-- =====================================================
-- 04-generate-claims.sql
-- Generate 50 non-Auto LOB claims with realistic data
-- LOB Mix: Property, General Liability, Workers Comp, Professional Liability
-- Distribution:
--   - 10 Simple/Clean (New/Pending)
--   - 15 Active Settlements (In Progress)
--   - 10 Recovery Focus (In Progress)
--   - 10 Party Variations (Mixed stages)
--   - 5 Edge Cases (Various)
-- =====================================================

DO $$
DECLARE
    v_client_id UUID;
    v_user_id UUID;
    v_users TEXT[];
    v_user_count INT;
    i INT;
BEGIN
    SELECT id INTO v_client_id FROM client LIMIT 1;
    SELECT id INTO v_user_id FROM users WHERE email = 'owenfarthing@craig680.onmicrosoft.com' LIMIT 1;

    -- Get available users for assignment (emails for client_adjuster field which is TEXT)
    SELECT ARRAY_AGG(email) INTO v_users FROM users WHERE email IS NOT NULL;
    v_user_count := COALESCE(array_length(v_users, 1), 1);

    -- =====================================================
    -- SIMPLE/CLEAN CLAIMS (1-10) - New/Pending stage - Property LOB
    -- Recent claims (Dec 2025 - Jan 2026)
    -- =====================================================
    FOR i IN 1..10 LOOP
        INSERT INTO claim (
            client_id, claim_number, claim_amount, client, client_adjuster,
            date_of_loss, insured, last_update, last_updated_by,
            loss_street_address, loss_city, loss_state, loss_postal_code, loss_country,
            recovery_status, substatus, created_by, created_at
        ) VALUES (
            v_client_id,
            'PROP-2024-' || LPAD(i::TEXT, 5, '0'),
            (5000 + (i * 1500))::NUMERIC,
            CASE (i % 3) WHEN 0 THEN 'Liberty Mutual' WHEN 1 THEN 'State Farm' ELSE 'Travelers' END,
            v_users[1 + (i % v_user_count)],
            ('2025-12-01'::DATE + (i * 3) * INTERVAL '1 day')::DATE,  -- Dec 2025 losses
            CASE i
                WHEN 1 THEN 'Michael Thompson'
                WHEN 2 THEN 'Sarah Martinez'
                WHEN 3 THEN 'David Chen'
                WHEN 4 THEN 'Jennifer Williams'
                WHEN 5 THEN 'Robert Johnson'
                WHEN 6 THEN 'Emily Davis'
                WHEN 7 THEN 'James Wilson'
                WHEN 8 THEN 'Amanda Brown'
                WHEN 9 THEN 'Christopher Lee'
                ELSE 'Jessica Garcia'
            END,
            ('2026-01-05'::DATE + (i * 2) * INTERVAL '1 day')::DATE,  -- Jan 2026 updates
            v_users[1 + (i % v_user_count)],
            (100 + i * 10)::TEXT || ' Main Street',
            CASE (i % 4) WHEN 0 THEN 'Los Angeles' WHEN 1 THEN 'Phoenix' WHEN 2 THEN 'Denver' ELSE 'Seattle' END,
            CASE (i % 4) WHEN 0 THEN 'CA' WHEN 1 THEN 'AZ' WHEN 2 THEN 'CO' ELSE 'WA' END,
            LPAD((90000 + i * 100)::TEXT, 5, '0'),
            'USA',
            'pending',
            'investigation',
            v_user_id,
            ('2025-12-01'::DATE + (i * 3 + 1) * INTERVAL '1 day')::TIMESTAMP  -- created shortly after loss
        );
    END LOOP;

    -- =====================================================
    -- ACTIVE SETTLEMENT CLAIMS (11-25) - In Progress - General Liability LOB
    -- Mid-stage claims (Nov 2025 losses, Dec 2025 - Jan 2026 updates)
    -- =====================================================
    FOR i IN 11..25 LOOP
        INSERT INTO claim (
            client_id, claim_number, claim_amount, client, client_adjuster,
            date_of_loss, insured, last_update, last_updated_by,
            loss_street_address, loss_city, loss_state, loss_postal_code, loss_country,
            recovery_status, substatus, created_by, created_at
        ) VALUES (
            v_client_id,
            'GL-2024-' || LPAD(i::TEXT, 5, '0'),
            (15000 + (i * 2500))::NUMERIC,
            CASE (i % 4) WHEN 0 THEN 'Allstate' WHEN 1 THEN 'Hartford' WHEN 2 THEN 'Travelers' ELSE 'Nationwide' END,
            v_users[1 + (i % v_user_count)],
            ('2025-11-01'::DATE + ((i - 11) * 2) * INTERVAL '1 day')::DATE,  -- Nov 2025 losses
            CASE (i % 5)
                WHEN 0 THEN 'Metro Transit Authority'
                WHEN 1 THEN 'Pacific Manufacturing Inc'
                WHEN 2 THEN 'Valley Construction Co'
                WHEN 3 THEN 'Downtown Medical Center'
                ELSE 'Sunrise Properties LLC'
            END,
            ('2025-12-15'::DATE + ((i - 11) * 2) * INTERVAL '1 day')::DATE,  -- Dec 2025 - Jan 2026 updates
            v_users[1 + (i % v_user_count)],
            (200 + i * 5)::TEXT || ' Commerce Blvd',
            CASE (i % 5) WHEN 0 THEN 'San Francisco' WHEN 1 THEN 'Portland' WHEN 2 THEN 'San Diego' WHEN 3 THEN 'Las Vegas' ELSE 'Sacramento' END,
            CASE (i % 5) WHEN 0 THEN 'CA' WHEN 1 THEN 'OR' WHEN 2 THEN 'CA' WHEN 3 THEN 'NV' ELSE 'CA' END,
            LPAD((94000 + i * 50)::TEXT, 5, '0'),
            'USA',
            'in_progress',
            CASE (i % 3) WHEN 0 THEN 'demand_sent' WHEN 1 THEN 'negotiation' ELSE 'settlement_reached' END,
            v_user_id,
            ('2025-11-01'::DATE + ((i - 11) * 2 + 1) * INTERVAL '1 day')::TIMESTAMP  -- created shortly after loss
        );
    END LOOP;

    -- =====================================================
    -- RECOVERY FOCUS CLAIMS (26-35) - In Progress with recoveries - Workers Comp LOB
    -- Older claims (Oct 2025 losses, Jan 2026 updates)
    -- =====================================================
    FOR i IN 26..35 LOOP
        INSERT INTO claim (
            client_id, claim_number, claim_amount, client, client_adjuster,
            date_of_loss, insured, last_update, last_updated_by,
            loss_street_address, loss_city, loss_state, loss_postal_code, loss_country,
            recovery_status, substatus, expected_recovery, created_by, created_at
        ) VALUES (
            v_client_id,
            'WC-2024-' || LPAD(i::TEXT, 5, '0'),
            (25000 + (i * 3000))::NUMERIC,
            CASE (i % 3) WHEN 0 THEN 'Hartford' WHEN 1 THEN 'Chubb' ELSE 'CNA' END,
            v_users[1 + (i % v_user_count)],
            ('2025-10-05'::DATE + ((i - 26) * 3) * INTERVAL '1 day')::DATE,  -- Oct 2025 losses
            CASE (i % 3)
                WHEN 0 THEN 'Michael Thompson'
                WHEN 1 THEN 'Jennifer Williams'
                ELSE 'Robert Johnson'
            END,
            ('2026-01-10'::DATE + ((i - 26) * 2) * INTERVAL '1 day')::DATE,  -- Jan 2026 updates
            v_users[1 + (i % v_user_count)],
            (300 + i * 7)::TEXT || ' Industrial Way',
            CASE (i % 4) WHEN 0 THEN 'Houston' WHEN 1 THEN 'Dallas' WHEN 2 THEN 'Austin' ELSE 'San Antonio' END,
            'TX',
            LPAD((75000 + i * 25)::TEXT, 5, '0'),
            'USA',
            'in_progress',
            'settlement_reached',
            (15000 + i * 1500)::NUMERIC,
            v_user_id,
            ('2025-10-05'::DATE + ((i - 26) * 3 + 1) * INTERVAL '1 day')::TIMESTAMP  -- created shortly after loss
        );
    END LOOP;

    -- =====================================================
    -- PARTY VARIATIONS CLAIMS (36-45) - Mixed stages - Professional Liability LOB
    -- Mixed dates (Oct-Nov 2025 losses, Dec 2025 - Jan 2026 updates)
    -- =====================================================
    FOR i IN 36..45 LOOP
        INSERT INTO claim (
            client_id, claim_number, claim_amount, client, client_adjuster,
            date_of_loss, insured, last_update, last_updated_by,
            loss_street_address, loss_city, loss_state, loss_postal_code, loss_country,
            recovery_status, substatus, created_by, created_at
        ) VALUES (
            v_client_id,
            'PL-2024-' || LPAD(i::TEXT, 5, '0'),
            (10000 + (i * 2000))::NUMERIC,
            CASE (i % 5) WHEN 0 THEN 'Chubb' WHEN 1 THEN 'AIG' WHEN 2 THEN 'Zurich' WHEN 3 THEN 'CNA' ELSE 'Travelers' END,
            v_users[1 + (i % v_user_count)],
            ('2025-10-15'::DATE + ((i - 36) * 4) * INTERVAL '1 day')::DATE,  -- Oct-Nov 2025 losses
            CASE (i % 5)
                WHEN 0 THEN 'Emily Davis'
                WHEN 1 THEN 'James Wilson'
                WHEN 2 THEN 'Amanda Brown'
                WHEN 3 THEN 'Christopher Lee'
                ELSE 'Jessica Garcia'
            END,
            ('2025-12-20'::DATE + ((i - 36) * 3) * INTERVAL '1 day')::DATE,  -- Dec 2025 - Jan 2026 updates
            v_users[1 + (i % v_user_count)],
            (400 + i * 3)::TEXT || ' Business Park Dr',
            CASE (i % 5) WHEN 0 THEN 'Chicago' WHEN 1 THEN 'Detroit' WHEN 2 THEN 'Minneapolis' WHEN 3 THEN 'Milwaukee' ELSE 'Indianapolis' END,
            CASE (i % 5) WHEN 0 THEN 'IL' WHEN 1 THEN 'MI' WHEN 2 THEN 'MN' WHEN 3 THEN 'WI' ELSE 'IN' END,
            LPAD((60000 + i * 30)::TEXT, 5, '0'),
            'USA',
            CASE (i % 3) WHEN 0 THEN 'pending' WHEN 1 THEN 'in_progress' ELSE 'recovered' END,
            CASE (i % 4) WHEN 0 THEN 'investigation' WHEN 1 THEN 'demand_sent' WHEN 2 THEN 'negotiation' ELSE 'closed_recovered' END,
            v_user_id,
            ('2025-10-15'::DATE + ((i - 36) * 4 + 1) * INTERVAL '1 day')::TIMESTAMP  -- created shortly after loss
        );
    END LOOP;

    -- =====================================================
    -- EDGE CASES (46-50) - Various special scenarios - Mixed LOBs
    -- =====================================================

    -- Claim 46: High value property claim (Oct 2025 loss, Jan 2026 update)
    INSERT INTO claim (
        client_id, claim_number, claim_amount, client, client_adjuster,
        date_of_loss, insured, last_update, last_updated_by,
        loss_street_address, loss_city, loss_state, loss_postal_code, loss_country,
        recovery_status, substatus, expected_recovery, created_by, created_at
    ) VALUES (
        v_client_id, 'PROP-2024-00046', 150000.00, 'Berkshire Hathaway', v_users[1],
        '2025-10-15', 'Metro Transit Authority', '2026-01-08', v_users[1],
        '1000 Executive Plaza', 'New York', 'NY', '10001', 'USA',
        'in_progress', 'litigation', 125000.00, v_user_id, '2025-10-16'::TIMESTAMP
    );

    -- Claim 47: Minimal data claim (Property) - Recent (Jan 2026)
    INSERT INTO claim (
        client_id, claim_number, claim_amount, client, date_of_loss, insured,
        recovery_status, substatus, created_by, created_at
    ) VALUES (
        v_client_id, 'PROP-2024-00047', 500.00, 'Self-Insured', '2026-01-05', 'David Chen',
        'pending', 'investigation', v_user_id, '2026-01-06'::TIMESTAMP
    );

    -- Claim 48: Closed with full recovery (General Liability) - Oct 2025 loss, Dec 2025 closed
    INSERT INTO claim (
        client_id, claim_number, claim_amount, client, client_adjuster,
        date_of_loss, insured, last_update, last_updated_by,
        loss_street_address, loss_city, loss_state, loss_postal_code, loss_country,
        recovery_status, substatus, expected_recovery, actual_recovery, created_by, created_at
    ) VALUES (
        v_client_id, 'GL-2024-00048', 45000.00, 'Liberty Mutual', v_users[1],
        '2025-10-05', 'Sarah Martinez', '2025-12-20', v_users[1],
        '555 Success Lane', 'Boston', 'MA', '02101', 'USA',
        'recovered', 'closed_recovered', 45000.00, 45000.00, v_user_id, '2025-10-06'::TIMESTAMP
    );

    -- Claim 49: Closed no recovery (Workers Comp) - Oct 2025 loss, Dec 2025 closed
    INSERT INTO claim (
        client_id, claim_number, claim_amount, client, client_adjuster,
        date_of_loss, insured, last_update, last_updated_by,
        loss_street_address, loss_city, loss_state, loss_postal_code, loss_country,
        recovery_status, substatus, created_by, created_at
    ) VALUES (
        v_client_id, 'WC-2024-00049', 8500.00, 'Hartford', v_users[1],
        '2025-10-20', 'James Wilson', '2025-12-15', v_users[1],
        '789 Industrial Park', 'Miami', 'FL', '33101', 'USA',
        'closed_no_recovery', 'closed_no_recovery', v_user_id, '2025-10-21'::TIMESTAMP
    );

    -- Claim 50: Complex multi-party claim (Professional Liability) - Nov 2025 loss, Jan 2026 update
    INSERT INTO claim (
        client_id, claim_number, claim_amount, client, client_adjuster,
        date_of_loss, insured, last_update, last_updated_by,
        loss_street_address, loss_city, loss_state, loss_postal_code, loss_country,
        recovery_status, substatus, expected_recovery, created_by, created_at
    ) VALUES (
        v_client_id, 'PL-2024-00050', 85000.00, 'Nationwide', v_users[1],
        '2025-11-01', 'Sterling Legal Partners', '2026-01-10', v_users[1],
        '1234 Corporate Center', 'San Jose', 'CA', '95101', 'USA',
        'in_progress', 'negotiation', 70000.00, v_user_id, '2025-11-02'::TIMESTAMP
    );

END $$;

SELECT 'Claims created:' AS info, COUNT(*) AS count FROM claim;
SELECT claim_number, claim_amount, recovery_status, substatus FROM claim ORDER BY claim_number;
