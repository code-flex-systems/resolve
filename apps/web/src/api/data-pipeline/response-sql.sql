BEGIN;

WITH
-- tune how many eligible combos get a response
params AS (
  SELECT 0.55::float AS response_rate  -- ~55% of eligible question/instance/claim combos
),

-- Admin picker helpers
rand_admin AS (
  SELECT id
  FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),

-- Build eligible tuples where the page_instance's page matches the question's page,
-- and the claim belongs to the same checklist via checklist_claim.
eligible AS (
  SELECT
    pi.checklist_id,
    pi.id                 AS instance_id,
    cc.claim_id,
    q.id                  AS question_id,
    q.type                AS qtype,
    q.text                AS question_text,
    p.title               AS page_label,
    q.page_id,
    -- random ordering key per tuple
    random()              AS r
  FROM page_instance pi
  JOIN page        p  ON p.id = pi.page_id
                     AND p.client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa'
  JOIN question    q  ON q.page_id = p.id
                     AND q.client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa'
  JOIN checklist_claim cc
                     ON cc.checklist_id = pi.checklist_id
                    AND cc.client_id    = '1c118f90-3153-4dfb-b350-953e42f0d1aa'
  WHERE pi.client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa'
),

-- Randomly pick a subset (avoid over-seeding); ensure at most one row per unique tuple
picked AS (
  SELECT e.*
  FROM eligible e
  JOIN params p ON TRUE
  WHERE e.r < p.response_rate
),

-- Insert responses; freeform gets text, others NULL. Use Admins only for created/updated.
ins_responses AS (
  INSERT INTO question_response (
    checklist_id, instance_id, claim_id, question_id,
    response_text,
    created_by, created_at, updated_by, updated_at,
    client_id
  )
  SELECT
    p.checklist_id,
    p.instance_id,
    p.claim_id,
    p.question_id,
    CASE
      WHEN p.qtype = 'freeform'
      THEN 'Auto-generated note: initial response captured.'
      ELSE NULL
    END AS response_text,
    (SELECT id FROM rand_admin) AS created_by,
    now() - (floor(random()*60) * interval '1 day') AS created_at,
    (SELECT id FROM rand_admin) AS updated_by,
    now() - (floor(1 + random()*30) * interval '1 day') AS updated_at,
    '1c118f90-3153-4dfb-b350-953e42f0d1aa' AS client_id
  FROM picked p
  ON CONFLICT (checklist_id, instance_id, claim_id, question_id) DO NOTHING
  RETURNING id AS response_id, checklist_id, instance_id, claim_id, question_id
),

-- For each inserted response, compute how many answers to select (0 for freeform)
response_counts AS (
  SELECT
    r.response_id,
    r.question_id,
    q.type AS qtype,
    CASE
      WHEN q.type IN ('single','dropdown') THEN 1
      WHEN q.type = 'multi'                THEN (2 + floor(random()*2))::int  -- 2..3
      ELSE 0
    END AS cnt
  FROM ins_responses r
  JOIN question q ON q.id = r.question_id
),

-- Build an answer pool per response from that response's question
response_answer_pool AS (
  SELECT
    rc.response_id,
    a.id   AS answer_id,
    a.text AS answer_text,
    a.has_additional_info,
    row_number() OVER (PARTITION BY rc.response_id ORDER BY random()) AS rn
  FROM response_counts rc
  JOIN answer a ON a.question_id = rc.question_id
               AND a.client_id   = '1c118f90-3153-4dfb-b350-953e42f0d1aa'
),

-- Pick the desired number of answers per response
picked_answers AS (
  SELECT rap.response_id, rap.answer_id, rap.answer_text, rap.has_additional_info
  FROM response_answer_pool rap
  JOIN response_counts rc
    ON rc.response_id = rap.response_id
  WHERE rap.rn <= rc.cnt
),

-- Insert question_response_answer rows with occasional additional_info where allowed
ins_response_answers AS (
  INSERT INTO question_response_answer (
    response_id, answer_id, additional_info
  )
  SELECT
    pa.response_id,
    pa.answer_id,
    CASE WHEN pa.has_additional_info AND random() < 0.7
         THEN 'Additional details provided.'
         ELSE NULL
    END AS additional_info
  FROM picked_answers pa
  RETURNING id, response_id
)

-- Single SELECT so the CTEs are still in scope
SELECT
  (SELECT COUNT(*) FROM ins_responses)        AS responses_inserted,
  (SELECT COUNT(*) FROM ins_response_answers) AS response_answers_inserted;

COMMIT;
