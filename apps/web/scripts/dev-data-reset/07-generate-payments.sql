-- =====================================================
-- 07-generate-payments.sql
-- Add payments to claims (0-5 payments per claim)
-- Distribution:
--   - Simple claims (1-10): 0-1 payments
--   - Active settlements (11-25): 1-3 payments
--   - Recovery focus (26-35): 2-4 payments
--   - Party variations (36-45): 1-2 payments
--   - Edge cases (46-50): varies
-- =====================================================

DO $$
DECLARE
    v_client_id UUID;
    v_user_id UUID;
    v_claim RECORD;
    v_coverage RECORD;
    v_num_payments INT;
    v_payment_amount NUMERIC;
    v_claim_int INTEGER;
    v_row_num INTEGER := 0;
    i INT;
BEGIN
    SELECT id INTO v_client_id FROM client LIMIT 1;
    SELECT id INTO v_user_id FROM users ORDER BY created_at ASC LIMIT 1;

    FOR v_claim IN
        SELECT c.id, c.claim_number, c.claim_amount, c.date_of_loss
        FROM claim c
        ORDER BY c.id
    LOOP
        v_row_num := v_row_num + 1;
        v_claim_int := abs(('x' || right(v_claim.id::text, 8))::bit(32)::int);

        -- Determine number of payments based on claim category
        v_num_payments := CASE
            WHEN v_row_num <= 10 THEN v_claim_int % 2 -- 0-1 for simple
            WHEN v_row_num <= 25 THEN 1 + (v_claim_int % 3) -- 1-3 for active
            WHEN v_row_num <= 35 THEN 2 + (v_claim_int % 3) -- 2-4 for recovery
            WHEN v_row_num <= 45 THEN 1 + (v_claim_int % 2) -- 1-2 for party variations
            WHEN v_row_num = 47 THEN 0 -- Minimal data claim - no payments
            WHEN v_row_num = 48 THEN 3 -- Closed with full recovery - multiple payments
            WHEN v_row_num = 49 THEN 1 -- Closed no recovery - one payment
            ELSE 2 + (v_claim_int % 3) -- Edge cases
        END;

        -- Get first coverage for this claim
        SELECT cc.id INTO v_coverage
        FROM claim_coverage cc
        WHERE cc.claim_id = v_claim.id
        LIMIT 1;

        FOR i IN 1..v_num_payments LOOP
            -- Calculate payment amount (portion of claim amount)
            v_payment_amount := (v_claim.claim_amount * (0.1 + (i * 0.15)))::NUMERIC(12,2);

            INSERT INTO claim_payment (
                client_id, claim_id, coverage_id,
                payment_amount, payment_date, payment_code,
                description, is_expense, is_subrogable,
                created_by, created_at
            ) VALUES (
                v_client_id,
                v_claim.id,
                v_coverage.id,
                v_payment_amount,
                (v_claim.date_of_loss + INTERVAL '1 day' * (5 + i * 5 + (v_claim_int % 10)))::DATE,
                CASE (i % 5)
                    WHEN 1 THEN 'IND' -- Indemnity
                    WHEN 2 THEN 'EXP' -- Expense
                    WHEN 3 THEN 'MED' -- Medical
                    WHEN 4 THEN 'LEG' -- Legal
                    ELSE 'OTH' -- Other
                END,
                CASE (i % 5)
                    WHEN 1 THEN 'Indemnity payment - property damage'
                    WHEN 2 THEN 'Expense - towing and storage'
                    WHEN 3 THEN 'Medical expense reimbursement'
                    WHEN 4 THEN 'Legal fees - representation'
                    ELSE 'Miscellaneous payment'
                END,
                (i % 5) IN (2, 4), -- Expenses and legal are expense payments
                (i % 5) IN (1, 3), -- Indemnity and medical are subrogable
                v_user_id,
                NOW() - INTERVAL '1 day' * (v_row_num + i * 5)
            );
        END LOOP;
    END LOOP;
END $$;

SELECT 'Payments created:' AS info;
SELECT payment_code, COUNT(*) as count, SUM(payment_amount)::NUMERIC(12,2) as total_amount
FROM claim_payment
GROUP BY payment_code
ORDER BY count DESC;
SELECT 'Total payments:', COUNT(*) FROM claim_payment;
