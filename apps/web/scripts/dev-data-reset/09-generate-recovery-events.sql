-- =====================================================
-- 09-generate-recovery-events.sql
-- Add recovery events linked to settlements
-- Recovery events track actual money received
-- Distribution:
--   - EVERY qualifying settlement gets 1-4 recovery events
--   - closed_recovered claims: recoveries sum to 90-100%
--   - All other claims: recoveries sum to 40-95%
--   - Recovery sources rotate: Check, Wire Transfer, EFT, ACH
--   - Expected output: 80-150+ recovery events
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
    v_target_pct NUMERIC;
    v_per_recovery_pct NUMERIC;
    v_settlement_int INT;
    v_row_num INT := 0;
    v_recovery_date DATE;
    v_sources TEXT[] := ARRAY['Check', 'Wire Transfer', 'EFT', 'ACH'];
    i INT;
BEGIN
    SELECT id INTO v_client_id FROM client LIMIT 1;
    SELECT id INTO v_user_id FROM users ORDER BY created_at ASC LIMIT 1;

    FOR v_settlement IN
        SELECT s.id, s.claim_id, s.settlement_amount, s.settlement_date, s.status
        FROM settlement s
        WHERE s.status IN ('accepted', 'paid')
          AND s.settlement_amount IS NOT NULL
          AND s.settlement_amount > 0
        ORDER BY s.claim_id, s.id
    LOOP
        v_row_num := v_row_num + 1;

        -- Derive a stable integer from the settlement UUID for deterministic variation
        v_settlement_int := abs(('x' || right(v_settlement.id::text, 8))::bit(32)::int);

        -- Get claim info (specifically substatus for closed_recovered detection)
        SELECT c.id, c.claim_number, c.substatus INTO v_claim
        FROM claim c WHERE c.id = v_settlement.claim_id;

        -- Every settlement gets 1-4 recovery events (never 0)
        v_num_recoveries := 1 + (v_settlement_int % 4);  -- 1, 2, 3, or 4

        -- Determine target recovery percentage of settlement amount
        IF v_claim.substatus = 'closed_recovered' THEN
            -- closed_recovered: 90-100% recovery
            v_target_pct := 0.90 + (v_settlement_int % 11) * 0.01;  -- 0.90 to 1.00
        ELSE
            -- All others: 40-95% recovery (partial — full recovery is rare)
            v_target_pct := 0.40 + (v_settlement_int % 56) * 0.01;  -- 0.40 to 0.95
        END IF;

        v_total_recovered := 0;

        -- Base recovery date: 10-45 days after settlement date
        v_recovery_date := v_settlement.settlement_date + (10 + (v_settlement_int % 36));

        FOR i IN 1..v_num_recoveries LOOP
            IF i = v_num_recoveries THEN
                -- Last recovery: whatever remains to hit the target
                v_recovery_amount := ROUND(
                    (v_settlement.settlement_amount * v_target_pct) - v_total_recovered, 2
                );
            ELSE
                -- Distribute remaining target unevenly using diminishing fractions
                -- Each recovery gets a portion of the remaining target amount
                v_per_recovery_pct := (0.35 + (((v_settlement_int + i) % 30) * 0.01));  -- 0.35-0.64 of remaining
                v_recovery_amount := ROUND(
                    (v_settlement.settlement_amount * v_target_pct - v_total_recovered) * v_per_recovery_pct, 2
                );
            END IF;

            -- Safety: ensure positive amount
            IF v_recovery_amount <= 0 THEN
                EXIT;
            END IF;

            -- Cap at settlement amount
            IF v_total_recovered + v_recovery_amount > v_settlement.settlement_amount THEN
                v_recovery_amount := ROUND(v_settlement.settlement_amount - v_total_recovered, 2);
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
                v_recovery_date,
                v_sources[1 + ((v_settlement_int + i) % 4)],
                'Recovery payment ' || i || ' of ' || v_num_recoveries ||
                    ' (' || ROUND(v_recovery_amount / v_settlement.settlement_amount * 100, 1) || '% of settlement)',
                v_user_id,
                v_recovery_date::TIMESTAMP + INTERVAL '1 hour' * (8 + (v_settlement_int % 10))
            );

            v_total_recovered := v_total_recovered + v_recovery_amount;

            -- Space subsequent recoveries 15-30 days apart
            v_recovery_date := v_recovery_date + (15 + ((v_settlement_int + i) % 16));
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Generated recovery events for % settlements', v_row_num;
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
LIMIT 15;
