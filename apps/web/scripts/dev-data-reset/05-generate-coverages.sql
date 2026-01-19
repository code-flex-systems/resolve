-- =====================================================
-- 05-generate-coverages.sql
-- Add coverages to claims (1-3 coverages per claim)
-- Non-Auto LOB coverage types based on claim prefix:
--   PROP: dwelling, personal_property, loss_of_use
--   GL: liability, medical_payments, other
--   WC: medical_payments, liability, other
--   PL: liability, other
-- =====================================================

DO $$
DECLARE
    v_client_id UUID;
    v_user_id UUID;
    v_claim RECORD;
    v_prop_types TEXT[] := ARRAY['dwelling', 'personal_property', 'loss_of_use'];
    v_gl_types TEXT[] := ARRAY['liability', 'medical_payments', 'other'];
    v_wc_types TEXT[] := ARRAY['medical_payments', 'liability', 'other'];
    v_pl_types TEXT[] := ARRAY['liability', 'other', 'liability'];
    v_coverage_type TEXT;
    v_num_coverages INT;
    i INT;
BEGIN
    SELECT id INTO v_client_id FROM client LIMIT 1;
    SELECT id INTO v_user_id FROM users WHERE email = 'owenfarthing@craig680.onmicrosoft.com' LIMIT 1;

    FOR v_claim IN SELECT id, claim_number, claim_amount FROM claim ORDER BY id LOOP
        -- Determine number of coverages (1-3 based on claim pattern)
        v_num_coverages := 1 + (v_claim.id % 3);

        FOR i IN 1..v_num_coverages LOOP
            -- Select coverage type based on claim LOB (from claim_number prefix)
            v_coverage_type := CASE
                WHEN v_claim.claim_number LIKE 'PROP-%' THEN v_prop_types[1 + ((i - 1) % 3)]
                WHEN v_claim.claim_number LIKE 'GL-%' THEN v_gl_types[1 + ((i - 1) % 3)]
                WHEN v_claim.claim_number LIKE 'WC-%' THEN v_wc_types[1 + ((i - 1) % 3)]
                WHEN v_claim.claim_number LIKE 'PL-%' THEN v_pl_types[1 + ((i - 1) % 3)]
                ELSE 'other'
            END;

            INSERT INTO claim_coverage (
                client_id, claim_id, loss_type,
                coverage_amount, amount_reserved, deductible_amount,
                deductible_status, statute_preserved, subro_applicable,
                created_by, created_at
            ) VALUES (
                v_client_id,
                v_claim.id,
                v_coverage_type,
                -- Coverage amount varies by type and claim
                CASE
                    WHEN v_coverage_type = 'dwelling' THEN (100000 + v_claim.id * 2000)::NUMERIC
                    WHEN v_coverage_type = 'personal_property' THEN (50000 + v_claim.id * 1000)::NUMERIC
                    WHEN v_coverage_type = 'liability' THEN (100000 + v_claim.id * 1500)::NUMERIC
                    WHEN v_coverage_type = 'medical_payments' THEN (25000 + v_claim.id * 500)::NUMERIC
                    ELSE (10000 + v_claim.id * 200)::NUMERIC
                END,
                -- Amount reserved (portion of claim being worked)
                CASE
                    WHEN i = 1 THEN (v_claim.claim_amount * 0.6)
                    WHEN i = 2 THEN (v_claim.claim_amount * 0.25)
                    ELSE (v_claim.claim_amount * 0.15)
                END,
                -- Deductible (varies by coverage type)
                CASE
                    WHEN v_coverage_type IN ('dwelling', 'personal_property') THEN
                        CASE (v_claim.id % 4)
                            WHEN 0 THEN 500
                            WHEN 1 THEN 1000
                            WHEN 2 THEN 2500
                            ELSE 0
                        END
                    ELSE 0
                END,
                -- Deductible status
                CASE
                    WHEN (v_claim.id % 3) = 0 THEN 'waived'
                    WHEN (v_claim.id % 3) = 1 THEN 'not_confirmed'
                    ELSE 'applies'
                END,
                -- Statute preserved (most are)
                (v_claim.id % 10) != 0,
                -- Subro applicable (property and liability generally are)
                v_coverage_type IN ('dwelling', 'personal_property', 'liability'),
                v_user_id,
                NOW() - INTERVAL '1 day' * (v_claim.id % 100)
            );
        END LOOP;
    END LOOP;
END $$;

-- Update total_incurred on claims based on coverage reserves
UPDATE claim c SET total_incurred = (
    SELECT COALESCE(SUM(cc.amount_reserved), 0)
    FROM claim_coverage cc
    WHERE cc.claim_id = c.id AND cc.deleted_at IS NULL
);

SELECT 'Coverages created:' AS info;
SELECT loss_type, COUNT(*) as count FROM claim_coverage GROUP BY loss_type ORDER BY count DESC;
SELECT 'Total coverages:', COUNT(*) FROM claim_coverage;
