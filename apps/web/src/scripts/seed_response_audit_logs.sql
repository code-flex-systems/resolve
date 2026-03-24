-- seed_response_audit_logs.sql
-- Generate response_audit_logs from existing question_response data.
-- Creates one 'insert' audit log per response, plus 'update' entries for ~30%.
-- Timestamps are spread over the past 6 months for realistic distribution.
-- Depends on: question_response, question_response_answer, question, page_instance, page

DELETE FROM response_audit_logs;

-- Step 1: Build answer snapshots as JSONB per response
WITH answer_snapshots AS (
  SELECT
    qra.response_id,
    jsonb_agg(
      jsonb_build_object(
        'label', a.text,
        'additional_info', qra.additional_info
      )
    ) AS answers_json
  FROM question_response_answer qra
  JOIN answer a ON a.id = qra.answer_id
  GROUP BY qra.response_id
),

-- Step 2: Build full response context with synthetic timestamps
-- Spread responses over the past 6 months using row_number for even distribution
response_context AS (
  SELECT
    qr.id AS response_id,
    qr.client_id,
    qr.created_by AS user_id,
    qr.checklist_id,
    qr.instance_id,
    qr.claim_id,
    qr.question_id,
    q.text AS question_text,
    p.title AS page_label,
    qr.response_text,
    COALESCE(ans.answers_json, '[]'::jsonb) AS answers_json,
    -- Spread over past 180 days using row_number for even distribution
    -- Add time-of-day variation using hash of response_id
    now() - (interval '1 day' * (
      (ROW_NUMBER() OVER (ORDER BY qr.id))::numeric / (COUNT(*) OVER ())::numeric * 180
    )) + (interval '1 hour' * (abs(('x' || right(qr.id::text, 6))::bit(24)::int) % 10))
    AS synthetic_created_at
  FROM question_response qr
  JOIN question q ON q.id = qr.question_id
  JOIN page_instance pi ON pi.id = qr.instance_id
  JOIN page p ON p.id = pi.page_id
  LEFT JOIN answer_snapshots ans ON ans.response_id = qr.id
)

-- Step 3: Insert 'insert' audit logs for every response
INSERT INTO response_audit_logs (
  client_id, response_id, user_id, checklist_id, instance_id,
  claim_id, question_id, question_text, page_label,
  action, old_response_text, new_response_text,
  old_answers, new_answers, created_at
)
SELECT
  rc.client_id,
  rc.response_id,
  rc.user_id,
  rc.checklist_id,
  rc.instance_id,
  rc.claim_id,
  rc.question_id,
  rc.question_text,
  rc.page_label,
  'insert',
  NULL,
  rc.response_text,
  '[]'::jsonb,
  rc.answers_json,
  rc.synthetic_created_at
FROM response_context rc;

-- Step 4: Simulate 'update' entries for ~30% of responses
-- These represent users changing their answers 1-14 days after initial entry
WITH answer_snapshots AS (
  SELECT
    qra.response_id,
    jsonb_agg(
      jsonb_build_object(
        'label', a.text,
        'additional_info', qra.additional_info
      )
    ) AS answers_json
  FROM question_response_answer qra
  JOIN answer a ON a.id = qra.answer_id
  GROUP BY qra.response_id
),
response_context AS (
  SELECT
    qr.id AS response_id,
    qr.client_id,
    qr.created_by AS user_id,
    qr.checklist_id,
    qr.instance_id,
    qr.claim_id,
    qr.question_id,
    q.text AS question_text,
    p.title AS page_label,
    qr.response_text,
    COALESCE(ans.answers_json, '[]'::jsonb) AS answers_json,
    -- Same synthetic timestamp as step 2
    now() - (interval '1 day' * (
      (ROW_NUMBER() OVER (ORDER BY qr.id))::numeric / (COUNT(*) OVER ())::numeric * 180
    )) + (interval '1 hour' * (abs(('x' || right(qr.id::text, 6))::bit(24)::int) % 10))
    AS synthetic_created_at
  FROM question_response qr
  JOIN question q ON q.id = qr.question_id
  JOIN page_instance pi ON pi.id = qr.instance_id
  JOIN page p ON p.id = pi.page_id
  LEFT JOIN answer_snapshots ans ON ans.response_id = qr.id
  -- Select ~30% using hash of response_id
  WHERE abs(('x' || right(qr.id::text, 8))::bit(32)::int) % 10 < 3
)
INSERT INTO response_audit_logs (
  client_id, response_id, user_id, checklist_id, instance_id,
  claim_id, question_id, question_text, page_label,
  action, old_response_text, new_response_text,
  old_answers, new_answers, created_at
)
SELECT
  rc.client_id,
  rc.response_id,
  rc.user_id,
  rc.checklist_id,
  rc.instance_id,
  rc.claim_id,
  rc.question_id,
  rc.question_text,
  rc.page_label,
  'update',
  CASE WHEN rc.response_text IS NOT NULL AND rc.response_text != ''
    THEN 'Previous response (updated)'
    ELSE NULL
  END,
  rc.response_text,
  CASE WHEN jsonb_array_length(rc.answers_json) > 1
    THEN jsonb_build_array(rc.answers_json->0)
    ELSE '[]'::jsonb
  END,
  rc.answers_json,
  -- Update happened 1-14 days after the insert
  rc.synthetic_created_at + interval '1 day' * (1 + abs(('x' || right(rc.response_id::text, 4))::bit(16)::int) % 14)
FROM response_context rc;

-- Verification
SELECT 'Response audit logs:' AS info;
SELECT action, count(*) AS count
FROM response_audit_logs
GROUP BY action
ORDER BY action;

SELECT 'Total:', count(*) FROM response_audit_logs;

SELECT 'Distribution by month:' AS info;
SELECT to_char(created_at, 'YYYY-MM') AS month, count(*) AS events
FROM response_audit_logs
GROUP BY 1 ORDER BY 1;
