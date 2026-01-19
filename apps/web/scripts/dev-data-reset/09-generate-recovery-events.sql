-- =====================================================
-- 09-generate-recovery-events.sql
-- Add recovery events linked to settlements
-- Recovery events track actual money received
-- Distribution:
--   - Active settlements (11-25): 0-1 recovery events
--   - Recovery focus (26-35): 1-4 recovery events
--   - Party variations (36-45): 0-1 recovery events
--   - Edge case 48 (closed recovered): Full recovery
-- =====================================================

DO $$
DECLARE
    v_client_id UUID;
    v_user_id UUID;
    v_settlement RECORD;
    v_claim RECORD;
    v_num_recoveries INT;
    v_recovery_amount NUMERIC;
    v_total_recovered NUMERIC;
    i INT;
BEGIN
    SELECT id INTO v_client_id FROM client LIMIT 1;
    SELECT id INTO v_user_id FROM users WHERE email = 'owenfarthing@craig680.onmicrosoft.com' LIMIT 1;

    FOR v_settlement IN
        SELECT s.id, s.claim_id, s.settlement_amount, s.settlement_date, s.status
        FROM settlement s
        WHERE s.status IN ('accepted', 'paid')
        ORDER BY s.claim_id, s.id
    LOOP
        -- Get claim info
        SELECT c.id, c.claim_number, c.substatus INTO v_claim
        FROM claim c WHERE c.id = v_settlement.claim_id;

        -- Determine number of recovery events
        v_num_recoveries := CASE
            WHEN v_claim.id <= 25 THEN (v_settlement.id % 2) -- 0-1 for active
            WHEN v_claim.id <= 35 THEN 1 + (v_settlement.id % 4) -- 1-4 for recovery focus
            WHEN v_claim.id <= 45 THEN (v_settlement.id % 2) -- 0-1 for party variations
            WHEN v_claim.id = 48 THEN 2 -- Closed recovered - multiple recovery events
            ELSE 1
        END;

        -- Skip if no recoveries
        IF v_num_recoveries = 0 OR v_settlement.settlement_amount IS NULL THEN
            CONTINUE;
        END IF;

        v_total_recovered := 0;

        FOR i IN 1..v_num_recoveries LOOP
            -- Calculate recovery amount (partial recoveries leading to total)
            IF v_claim.id = 48 THEN
                -- Full recovery case - split evenly
                v_recovery_amount := (v_settlement.settlement_amount / v_num_recoveries)::NUMERIC(12,2);
            ELSE
                -- Partial recovery - diminishing amounts
                v_recovery_amount := (v_settlement.settlement_amount * (0.3 / i))::NUMERIC(12,2);
            END IF;

            -- Don't exceed settlement amount
            IF v_total_recovered + v_recovery_amount > v_settlement.settlement_amount THEN
                v_recovery_amount := v_settlement.settlement_amount - v_total_recovered;
            END IF;

            IF v_recovery_amount <= 0 THEN
                EXIT;
            END IF;

            INSERT INTO recovery_event (
                client_id, claim_id, settlement_id,
                recovery_amount, recovery_date, recovery_source,
                notes, created_by, created_at
            ) VALUES (
                v_client_id,
                v_settlement.claim_id,
                v_settlement.id,
                v_recovery_amount,
                (v_settlement.settlement_date + INTERVAL '1 day' * (10 + i * 5 + (v_settlement.id % 10)))::DATE,
                CASE (i % 4)
                    WHEN 1 THEN 'Check'
                    WHEN 2 THEN 'Wire Transfer'
                    WHEN 3 THEN 'EFT'
                    ELSE 'Check'
                END,
                'Recovery payment ' || i || ' of ' || v_num_recoveries,
                v_user_id,
                NOW() - INTERVAL '1 day' * (v_claim.id + i * 5)
            );

            v_total_recovered := v_total_recovered + v_recovery_amount;
        END LOOP;
    END LOOP;
END $$;

-- Update actual_recovery on claims based on recovery events
UPDATE claim c SET actual_recovery = (
    SELECT COALESCE(SUM(re.recovery_amount), 0)
    FROM recovery_event re
    WHERE re.claim_id = c.id AND re.deleted_at IS NULL
);

SELECT 'Recovery events created:' AS info;
SELECT recovery_source, COUNT(*) as count, SUM(recovery_amount)::NUMERIC(12,2) as total_amount
FROM recovery_event
GROUP BY recovery_source
ORDER BY count DESC;
SELECT 'Total recovery events:', COUNT(*) FROM recovery_event;

-- Summary of claims with recovery
SELECT 'Claims with recovery:' AS info;
SELECT
    c.claim_number,
    c.claim_amount,
    c.expected_recovery,
    c.actual_recovery,
    CASE
        WHEN c.expected_recovery > 0 THEN
            ROUND((c.actual_recovery / c.expected_recovery * 100)::NUMERIC, 1)
        ELSE NULL
    END as recovery_percentage
FROM claim c
WHERE c.actual_recovery > 0
ORDER BY c.actual_recovery DESC
LIMIT 10;
