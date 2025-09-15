-- Create missing logs for existing responses
BEGIN;

INSERT INTO response_audit_logs (
  client_id,
  response_id, user_id,
  checklist_id, instance_id, claim_id, question_id,
  question_text, page_label,
  action,
  old_response_text, new_response_text,
  old_answers, new_answers
)
SELECT
  qr.client_id,
  qr.id                                AS response_id,

  -- Prefer the updater if they're an Admin; otherwise pick a random Admin; else fall back to creator
  COALESCE(
    CASE WHEN upd.role = 'Admin' THEN qr.updated_by END,
    adm.admin_id,
    qr.created_by
  )                                     AS user_id,

  qr.checklist_id,
  qr.instance_id,
  qr.claim_id,
  qr.question_id,

  q.text                                AS question_text,
  p.title                               AS page_label,

  'insert'                              AS action,

  NULL                                   AS old_response_text,
  qr.response_text                       AS new_response_text,

  '[]'::jsonb                            AS old_answers,
  COALESCE(ans.new_answers, '[]'::jsonb) AS new_answers
FROM question_response qr
JOIN question q         ON q.id = qr.question_id
JOIN page_instance pi   ON pi.id = qr.instance_id
JOIN page p             ON p.id = pi.page_id

-- If the updater is an Admin, we'll use them
LEFT JOIN users upd
  ON upd.id = qr.updated_by AND upd.client_id = qr.client_id

-- Fallback random Admin for this client
LEFT JOIN LATERAL (
  SELECT u.id AS admin_id
  FROM users u
  WHERE u.client_id = qr.client_id AND u.role = 'Admin'
  ORDER BY random() LIMIT 1
) adm ON TRUE

-- Aggregate the answers chosen for this response (may be empty)
LEFT JOIN LATERAL (
  SELECT jsonb_agg(
           jsonb_build_object(
             'label', a.text,
             'additional_info', qra.additional_info
           )
           ORDER BY qra.id
         ) AS new_answers
  FROM question_response_answer qra
  JOIN answer a ON a.id = qra.answer_id
  WHERE qra.response_id = qr.id
) ans ON TRUE

-- Idempotent: skip if we've already logged an 'insert' for this response
WHERE NOT EXISTS (
  SELECT 1
  FROM response_audit_logs l
  WHERE l.response_id = qr.id
    AND l.action = 'insert'
);

COMMIT;
