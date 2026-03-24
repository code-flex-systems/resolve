-- =====================================================
-- 08-generate-settlements.sql
-- Add settlements to claims
-- Distribution:
--   - Simple claims (1-10): No settlements (pending stage)
--   - Active settlements (11-25): 1-2 settlements various statuses
--   - Recovery focus (26-35): 1-2 settlements (settled, for recovery)
--   - Party variations (36-45): 0-1 settlements
--   - Edge cases (46-50): varies
-- =====================================================

DO $$
DECLARE
    v_client_id UUID;
    v_user_id UUID;
    v_claim RECORD;
    v_coverage RECORD;
    v_claim_party RECORD;
    v_num_settlements INT;
    v_demand_amount NUMERIC;
    v_settlement_amount NUMERIC;
    v_status TEXT;
    v_claim_int INTEGER;
    v_row_num INTEGER := 0;
    i INT;
BEGIN
    SELECT id INTO v_client_id FROM client LIMIT 1;
    SELECT id INTO v_user_id FROM users WHERE email = 'owenfarthing@craig680.onmicrosoft.com' LIMIT 1;

    FOR v_claim IN
        SELECT c.id, c.claim_number, c.claim_amount, c.date_of_loss, c.substatus
        FROM claim c
        ORDER BY c.id
    LOOP
        v_row_num := v_row_num + 1;
        v_claim_int := abs(('x' || right(v_claim.id::text, 8))::bit(32)::int);

        -- Determine number of settlements based on claim category
        v_num_settlements := CASE
            WHEN v_row_num <= 10 THEN 0 -- Simple claims - no settlements yet
            WHEN v_row_num <= 25 THEN 1 + (v_claim_int % 2) -- Active - 1-2 settlements
            WHEN v_row_num <= 35 THEN 1 + (v_claim_int % 2) -- Recovery focus - 1-2 settlements
            WHEN v_row_num <= 45 THEN v_claim_int % 2 -- Party variations - 0-1
            WHEN v_row_num = 46 THEN 2 -- High value - multiple settlements
            WHEN v_row_num = 47 THEN 0 -- Minimal data - no settlements
            WHEN v_row_num = 48 THEN 1 -- Closed recovered - 1 settlement
            WHEN v_row_num = 49 THEN 1 -- Closed no recovery - 1 failed settlement
            ELSE 2 -- Complex claim - 2 settlements
        END;

        -- Skip if no settlements needed
        IF v_num_settlements = 0 THEN
            CONTINUE;
        END IF;

        -- Get coverage for this claim
        SELECT cc.id INTO v_coverage
        FROM claim_coverage cc
        WHERE cc.claim_id = v_claim.id
        ORDER BY cc.id
        LIMIT 1;

        -- Get an adverse carrier claim_party (or any facilitator)
        SELECT cp.id INTO v_claim_party
        FROM claim_party cp
        JOIN party p ON p.id = cp.party_id
        WHERE cp.claim_id = v_claim.id
          AND p.party_type = 'facilitator'
        LIMIT 1;

        -- If no facilitator, get any claim_party
        IF v_claim_party IS NULL THEN
            SELECT cp.id INTO v_claim_party
            FROM claim_party cp
            WHERE cp.claim_id = v_claim.id
            LIMIT 1;
        END IF;

        FOR i IN 1..v_num_settlements LOOP
            -- Calculate amounts
            v_demand_amount := (v_claim.claim_amount * (0.8 + (i * 0.1)))::NUMERIC(12,2);

            -- Determine settlement status
            v_status := CASE
                WHEN v_claim.substatus IN ('closed_recovered', 'closed_no_recovery') THEN
                    CASE WHEN v_claim.substatus = 'closed_recovered' THEN 'paid' ELSE 'rejected' END
                WHEN v_claim.substatus = 'settlement_reached' THEN 'accepted'
                WHEN v_claim.substatus = 'negotiation' THEN 'negotiating'
                WHEN v_claim.substatus = 'demand_sent' THEN 'pending'
                ELSE 'pending'
            END;

            -- Settlement amount only if accepted/paid
            v_settlement_amount := CASE
                WHEN v_status IN ('accepted', 'paid') THEN (v_demand_amount * (0.6 + (v_claim_int % 4) * 0.1))::NUMERIC(12,2)
                ELSE NULL
            END;

            INSERT INTO settlement (
                client_id, claim_id, coverage_id, claim_party_id,
                demand_amount, demand_date,
                settlement_amount, settlement_date,
                status, agreed_liability_percentage,
                settlement_structure, is_drop_check,
                notes, created_by, created_at
            ) VALUES (
                v_client_id,
                v_claim.id,
                v_coverage.id,
                v_claim_party.id,
                v_demand_amount,
                (v_claim.date_of_loss + INTERVAL '1 day' * (15 + i * 5 + (v_claim_int % 10)))::DATE,
                v_settlement_amount,
                CASE WHEN v_settlement_amount IS NOT NULL
                    THEN (v_claim.date_of_loss + INTERVAL '1 day' * (30 + i * 5 + (v_claim_int % 15)))::DATE
                    ELSE NULL
                END,
                v_status,
                CASE WHEN v_status IN ('accepted', 'paid') THEN
                    (50 + (v_claim_int % 5) * 10)::NUMERIC
                    ELSE NULL
                END,
                'lump_sum',
                (v_claim_int % 5) = 0, -- 20% are drop checks
                'Settlement ' || i || ' for claim ' || v_claim.claim_number,
                v_user_id,
                NOW() - INTERVAL '1 day' * (v_row_num + i * 10)
            );
        END LOOP;
    END LOOP;
END $$;

SELECT 'Settlements created:' AS info;
SELECT status, COUNT(*) as count, SUM(COALESCE(settlement_amount, 0))::NUMERIC(12,2) as total_settled
FROM settlement
GROUP BY status
ORDER BY count DESC;
SELECT 'Total settlements:', COUNT(*) FROM settlement;
