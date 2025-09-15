delete from comment;

BEGIN;

WITH
-- 🔧 knobs
params AS (
  SELECT
    0.85::float AS general_rate   -- ~85% of (checklist,claim) get general comments
),

-- 🗣️ Pool of realistic, short comment bodies (<500 chars)
comment_pool(body) AS (
  VALUES
  ('Awaiting police report from agency.'),
  ('Contacted insured; voicemail left.'),
  ('Coverage confirmed; proceed with investigation.'),
  ('Need photos of damage from shop.'),
  ('Estimate appears high; send for audit.'),
  ('Requesting repair invoices.'),
  ('Witness contact info missing.'),
  ('Adverse carrier unresponsive; follow up.'),
  ('Consider SIU referral indicators.'),
  ('Need signed release to obtain records.'),
  ('Schedule recorded statement.'),
  ('Confirm salvage status.'),
  ('Medical records pending from provider.'),
  ('Verify deductible and limits.'),
  ('ALE receipts requested.'),
  ('Contents list incomplete.'),
  ('Storm date confirmed using weather report.'),
  ('Demand letter drafted; awaiting approval.'),
  ('Arbitration filing considered.'),
  ('Lienholder notified.'),
  ('Secure scene photos.'),
  ('CAT event—use expedited workflow.'),
  ('Coverage dispute potential; escalate.'),
  ('Subrogation potential positive.'),
  ('Check SOL timelines.'),
  ('Document uploaded to file.'),
  ('Vendor assigned; awaiting ETA.'),
  ('Contact adverse driver for statement.'),
  ('Calculate loss of use.'),
  ('Request EDR download.'),
  ('Clarify prior damage.'),
  ('Validate towing/storage charges.'),
  ('Out-of-pocket expenses documented.'),
  ('Depreciation calculation reviewed.'),
  ('Invoice appears duplicate.'),
  ('File ready for supervisor review.'),
  ('No liability; closing pending.'),
  ('Shared fault likely.'),
  ('Settlement authority requested.'),
  ('IME recommended.'),
  ('Provider billing seems excessive.'),
  ('ALERT: conflicting statements.'),
  ('Scene sketch added.'),
  ('Police report received; citations noted.'),
  ('Coverage denial drafted.'),
  ('Check arbitration eligibility.'),
  ('Confirm tenant/occupancy.'),
  ('Mortgagee added to file.'),
  ('Proof of loss signed.'),
  ('Code upgrade applied.'),
  ('Roof age inconsistent; verify.')
),

-- 👥 random admin helper (per use-site calls ORDER BY random() LIMIT 1)
-- (kept inline in inserts)

-- =======================
-- 1) GENERAL COMMENTS
-- =======================
general_pairs AS (
  SELECT DISTINCT
    cc.checklist_id,
    cc.claim_id
  FROM checklist_claim cc
  WHERE cc.client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa'
),
general_selected AS (
  SELECT gp.*
  FROM general_pairs gp
  JOIN params p ON TRUE
  WHERE random() < p.general_rate
),
general_counts AS (
  SELECT
    gs.checklist_id,
    gs.claim_id,
    (1 + floor(random()*3))::int AS n   -- 1..3 comments per selected pair
  FROM general_selected gs
),
general_rows AS (
  SELECT
    gc.checklist_id,
    gc.claim_id
  FROM general_counts gc
  JOIN LATERAL generate_series(1, gc.n) AS g(n) ON TRUE
),
ins_general AS (
  INSERT INTO comment (
    client_id, body,
    checklist_id, claim_id, instance_id, question_id,
    created_by, created_at, updated_at
  )
  SELECT
    '1c118f90-3153-4dfb-b350-953e42f0d1aa'::uuid AS client_id,
    cp.body,
    gr.checklist_id,
    gr.claim_id,
    NULL::int  AS instance_id,
    NULL::int  AS question_id,
    (SELECT id FROM users WHERE client_id='1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role='Admin' ORDER BY random() LIMIT 1) AS created_by,
    now() - (floor(random()*45) * interval '1 day') AS created_at,
    CASE WHEN random() < 0.35 THEN now() - (floor(random()*30) * interval '1 day') ELSE NULL END AS updated_at
  FROM general_rows gr
  CROSS JOIN LATERAL (
  SELECT body
  FROM (
    SELECT body,
           row_number() OVER () AS rn,
           count(*)    OVER () AS total
    FROM comment_pool
  ) pool
  WHERE rn = 1 + (abs(hashtextextended(
                     concat_ws(':', gr.checklist_id::text,
                                   gr.claim_id::text,
                                   floor(random()*1e9)::text), 0)) % total)
  LIMIT 1
) cp

  WHERE NOT EXISTS (
    SELECT 1
    FROM comment c
    WHERE c.client_id   = '1c118f90-3153-4dfb-b350-953e42f0d1aa'
      AND c.checklist_id= gr.checklist_id
      AND c.claim_id    = gr.claim_id
      AND c.instance_id IS NULL
      AND c.question_id IS NULL
      AND c.body        = cp.body
  )
  RETURNING id
),

-- =======================
-- 2) SPECIFIC (instance + question) COMMENTS
--    ≤ 2 per (instance, claim) and only if k > 0
-- =======================
specific_pairs AS (
  SELECT DISTINCT
    pi.id         AS instance_id,
    pi.checklist_id,
    pi.page_id,
    cc.claim_id,
    -- decide 0, 1, or 2 specific comments for this (instance,claim)
    (CASE
       WHEN random() < 0.55 THEN 1 + floor(random()*2)  -- 55% chance → 1 or 2
       ELSE 0
     END)::int AS k
  FROM page_instance pi
  JOIN checklist_claim cc
    ON cc.checklist_id = pi.checklist_id
   AND cc.client_id    = '1c118f90-3153-4dfb-b350-953e42f0d1aa'
  WHERE pi.client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa'
),
specific_candidates AS (
  SELECT
    sp.instance_id,
    sp.checklist_id,
    sp.claim_id,
    q.id AS question_id,
    sp.k,
    row_number() OVER (PARTITION BY sp.instance_id, sp.claim_id ORDER BY random()) AS rn
  FROM specific_pairs sp
  JOIN question q
    ON q.page_id   = sp.page_id
   AND q.client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa'
),
specific_picked AS (
  SELECT
    sc.instance_id,
    sc.checklist_id,
    sc.claim_id,
    sc.question_id
  FROM specific_candidates sc
  WHERE sc.k > 0
    AND sc.rn <= sc.k     -- ≤ 2 per (instance,claim)
),
ins_specific AS (
  INSERT INTO comment (
    client_id, body,
    checklist_id, claim_id, instance_id, question_id,
    created_by, created_at, updated_at
  )
  SELECT
    '1c118f90-3153-4dfb-b350-953e42f0d1aa'::uuid AS client_id,
    cp.body,
    sp.checklist_id,
    sp.claim_id,
    sp.instance_id,
    sp.question_id,
    (SELECT id FROM users WHERE client_id='1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role='Admin' ORDER BY random() LIMIT 1) AS created_by,
    now() - (floor(random()*45) * interval '1 day') AS created_at,
    CASE WHEN random() < 0.35 THEN now() - (floor(random()*30) * interval '1 day') ELSE NULL END AS updated_at
  FROM specific_picked sp
  CROSS JOIN LATERAL (
  SELECT body
  FROM (
    SELECT body,
           row_number() OVER () AS rn,
           count(*)    OVER () AS total
    FROM comment_pool
  ) pool
  WHERE rn = 1 + (abs(hashtextextended(
                     concat_ws(':', sp.instance_id::text,
                                   sp.question_id::text,
                                   sp.claim_id::text,
                                   floor(random()*1e9)::text), 0)) % total)
  LIMIT 1
) cp


  WHERE NOT EXISTS (
    SELECT 1
    FROM comment c
    WHERE c.client_id    = '1c118f90-3153-4dfb-b350-953e42f0d1aa'
      AND c.checklist_id = sp.checklist_id
      AND c.claim_id     = sp.claim_id
      AND c.instance_id  = sp.instance_id
      AND c.question_id  = sp.question_id
      AND c.body         = cp.body
  )
  RETURNING id
)

-- one SELECT so all CTEs execute
SELECT
  (SELECT COUNT(*) FROM ins_general)  AS general_comments_inserted,
  (SELECT COUNT(*) FROM ins_specific) AS specific_comments_inserted;

COMMIT;
