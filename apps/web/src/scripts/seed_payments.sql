-- seed_payments.sql
-- Seeds claim_payment records for financial reporting
-- Depends on: claims, claim_coverage, claim_party
-- Generates 2-5 payments per claim for claims beyond 'investigation' substatus
-- Mix of indemnity (subrogable) and expense payments

DO $$
DECLARE
  v_client_id CONSTANT uuid := '00000000-0000-4000-8000-000000000001';
  v_user_id uuid;
  v_claim RECORD;
  v_coverage_id uuid;
  v_num_payments int;
  v_payment_amount numeric;
  v_claim_int int;
  v_row_num int := 0;
  v_payment_codes text[] := ARRAY['IND', 'EXP', 'MED', 'LEG', 'IND'];
  v_payment_labels text[] := ARRAY['Indemnity Payment', 'Expense Payment', 'Medical Payment', 'Legal Fee', 'Supplemental Indemnity'];
  v_is_subrogable boolean;
  v_is_expense boolean;
  i int;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE client_id = v_client_id LIMIT 1;

  -- Clean up orphaned payments from prior seeds
  DELETE FROM claim_payment WHERE client_id = v_client_id;
  DELETE FROM claim_payment WHERE NOT EXISTS (SELECT 1 FROM claim c WHERE c.id = claim_payment.claim_id);

  FOR v_claim IN
    SELECT c.id, c.claim_amount, c.date_of_loss, c.substatus, c.recovery_status
    FROM claim c
    WHERE c.client_id = v_client_id
    ORDER BY c.claim_number
  LOOP
    v_row_num := v_row_num + 1;
    v_claim_int := abs(('x' || right(v_claim.id::text, 8))::bit(32)::int);

    -- Get first coverage for this claim (required FK)
    SELECT cc.id INTO v_coverage_id
    FROM claim_coverage cc
    WHERE cc.claim_id = v_claim.id AND cc.deleted_at IS NULL
    LIMIT 1;

    -- Skip claims without coverage
    IF v_coverage_id IS NULL THEN
      CONTINUE;
    END IF;

    -- Investigation claims get 0-1 payments, others get 2-5
    v_num_payments := CASE
      WHEN v_claim.substatus = 'investigation' THEN v_claim_int % 2  -- 0-1
      WHEN v_claim.substatus IN ('demand_sent', 'negotiation') THEN 2 + (v_claim_int % 2)  -- 2-3
      WHEN v_claim.substatus IN ('settlement_reached', 'litigation') THEN 3 + (v_claim_int % 3)  -- 3-5
      WHEN v_claim.substatus IN ('closed_recovered', 'closed_no_recovery') THEN 2 + (v_claim_int % 3)  -- 2-4
      ELSE 1
    END;

    IF v_num_payments = 0 THEN
      CONTINUE;
    END IF;

    FOR i IN 1..v_num_payments LOOP
      -- Payment amounts: 5-25% of claim_amount per payment, varying by payment number
      v_payment_amount := round(
        v_claim.claim_amount * (0.05 + ((v_claim_int + i * 7) % 20) * 0.01), 2
      );

      -- Determine payment type from rotating codes
      v_is_subrogable := (v_payment_codes[1 + ((v_claim_int + i) % 5)] IN ('IND', 'MED'));
      v_is_expense := (v_payment_codes[1 + ((v_claim_int + i) % 5)] IN ('EXP', 'LEG'));

      INSERT INTO claim_payment (
        client_id, claim_id, coverage_id,
        payment_date, payment_amount,
        is_subrogable, is_expense,
        payment_code, description,
        created_by, created_at
      ) VALUES (
        v_client_id,
        v_claim.id,
        v_coverage_id,
        -- Payment dates spread from 15 to 120 days after date_of_loss
        (v_claim.date_of_loss + (15 + i * 20 + (v_claim_int % 15)))::date,
        v_payment_amount,
        v_is_subrogable,
        v_is_expense,
        v_payment_codes[1 + ((v_claim_int + i) % 5)],
        v_payment_labels[1 + ((v_claim_int + i) % 5)] || ' #' || i,
        v_user_id,
        NOW() - interval '1 day' * (180 - v_row_num)
      );
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Seeded % claim payments for client %', v_row_num, v_client_id;
END $$;

-- Verification
SELECT 'Claim Payments by type:' AS info;
SELECT payment_code, count(*) as count,
  sum(payment_amount)::numeric(12,2) as total,
  count(*) FILTER (WHERE is_subrogable) as subrogable_count,
  count(*) FILTER (WHERE is_expense) as expense_count
FROM claim_payment
GROUP BY payment_code ORDER BY count DESC;

SELECT 'Total payments:', count(*), sum(payment_amount)::numeric(12,2) as total FROM claim_payment;
