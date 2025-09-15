BEGIN;

WITH
-- Answers joined to their page so we can enforce "≤ 2 actions per page"
answers_by_page AS (
  SELECT
    a.id               AS answer_id,
    a.question_id,
    q.page_id,
    p.title            AS page_title,
    q.text             AS question_text,
    a.text             AS answer_text
  FROM answer a
  JOIN question q ON q.id = a.question_id
  JOIN page     p ON p.id = q.page_id
  WHERE a.client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa'
    AND q.client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa'
    AND p.client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa'
),

-- Pick at most 2 answers per page, and only for ~35% of pages overall
sparse_picks AS (
  SELECT *
  FROM (
    SELECT
      abp.*,
      row_number() OVER (PARTITION BY abp.page_id ORDER BY random()) AS rn,
      random() AS rpg
    FROM answers_by_page abp
  ) s
  WHERE s.rn <= 2
    AND s.rpg < 0.35
),

-- Build action rows with proper type + JSON definition that matches Zod schemas
to_actions AS (
  SELECT
    '1c118f90-3153-4dfb-b350-953e42f0d1aa'::uuid AS client_id,
    s.answer_id,

    -- Choose a type with weights: email 40%, event 20%, letter 15%, task 25%
    CASE
      WHEN r < 0.40 THEN 'email'
      WHEN r < 0.60 THEN 'event'
      WHEN r < 0.75 THEN 'letter'
      ELSE               'task'
    END AS type,

    -- Build the per-type JSON definition (all values wrapped in to_jsonb; NULLs as ::jsonb)
    CASE
      /* EMAIL */
      WHEN r < 0.40 THEN
        jsonb_strip_nulls(
          jsonb_build_object(
            'recipients',
              COALESCE((
                SELECT jsonb_agg(u.email)
                FROM (
                  SELECT email
                  FROM users
                  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa'
                    AND role = 'Admin'
                  ORDER BY random()
                  LIMIT (1 + floor(random()*3))::int  -- 1..3 recipients
                ) u
              ), '[]'::jsonb),
            'title',   to_jsonb(format('Notify: %s', s.question_text)),
            'message', to_jsonb(format('Selected answer: %s', s.answer_text)),
            'template_id',
              CASE WHEN random() < 0.40
                   THEN to_jsonb('TPL-'||substr(md5(random()::text),1,8))
                   ELSE NULL::jsonb
              END
          )
        )

      /* EVENT */
      WHEN r < 0.60 THEN
        jsonb_strip_nulls(
          jsonb_build_object(
            'title',   to_jsonb(format('Follow-up: %s', s.page_title)),
            'message', CASE WHEN random() < 0.60 THEN to_jsonb('Auto-generated calendar event.') ELSE NULL::jsonb END,
            'schedule', to_jsonb(now() + ((1 + floor(random()*45))::text || ' days')::interval)
          )
        )

      /* LETTER */
      WHEN r < 0.75 THEN
        jsonb_strip_nulls(
          jsonb_build_object(
            'address',
              COALESCE((
                SELECT jsonb_agg(u.email)
                FROM (
                  SELECT email
                  FROM users
                  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa'
                    AND role IN ('Admin')
                  ORDER BY random()
                  LIMIT (1 + floor(random()*2))::int  -- 1..2 addresses
                ) u
              ), '[]'::jsonb),
            'message',     to_jsonb(format('Letter re: %s → %s', s.page_title, s.question_text)),
            'template_id', CASE WHEN random() < 0.50
                                  THEN to_jsonb('LTR-'||substr(md5(random()::text),1,8))
                                  ELSE NULL::jsonb
                             END
          )
        )

      /* TASK */
      ELSE
        jsonb_strip_nulls(
          jsonb_build_object(
            'dept',      to_jsonb((ARRAY['Claims','Subrogation','SIU','Litigation']::text[])[1 + floor(random()*4)]),
            'desk_type', to_jsonb((ARRAY['Auto','Property','Injury','General']::text[])[1 + floor(random()*4)]),
            'desk',      to_jsonb((ARRAY['A1','B2','C3','D4','E5']::text[])[1 + floor(random()*5)]),
            'task_type', to_jsonb((ARRAY['Review','Call','Email','Request Records','Prepare Demand']::text[])[1 + floor(random()*5)]),
            'message',   CASE WHEN random() < 0.50 THEN to_jsonb('Auto-generated task.') ELSE NULL::jsonb END
          )
        )
    END AS definition,

    -- creators / updaters are Admins
    (SELECT id FROM users WHERE client_id='1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role='Admin' ORDER BY random() LIMIT 1) AS created_by,
    now() - (floor(random()*60) * interval '1 day') AS created_at,
    (SELECT id FROM users WHERE client_id='1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role='Admin' ORDER BY random() LIMIT 1) AS updated_by,
    now() - (floor(random()*30) * interval '1 day') AS updated_at
  FROM (
    SELECT s.*, random() AS r
    FROM sparse_picks s
  ) s
),

-- Insert actions (unique per answer)
ins_actions AS (
  INSERT INTO action (
    client_id, answer_id, type, definition,
    created_by, created_at, updated_by, updated_at
  )
  SELECT
    t.client_id, t.answer_id, t.type, t.definition,
    t.created_by, t.created_at, t.updated_by, t.updated_at
  FROM to_actions t
  ON CONFLICT (answer_id) DO NOTHING
  RETURNING id
),

-- Insert lots of logs per action (2..8 each) with varied statuses
ins_logs AS (
  INSERT INTO action_log (
    client_id, action_id, status, created_by, created_at
  )
  SELECT
    '1c118f90-3153-4dfb-b350-953e42f0d1aa'::uuid AS client_id,
    ia.id AS action_id,
    (ARRAY['queued','scheduled','executing','completed','failed','canceled']::text[])[1 + floor(random()*6)] AS status,
    (SELECT id FROM users WHERE client_id='1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role='Admin' ORDER BY random() LIMIT 1) AS created_by,
    now() - (floor(random()*45) * interval '1 day') AS created_at
  FROM ins_actions ia
  -- 2..8 logs per action
  CROSS JOIN LATERAL generate_series(1, (2 + floor(random()*7))::int) AS g(n)
  RETURNING id
)

SELECT
  (SELECT COUNT(*) FROM ins_actions) AS actions_inserted,
  (SELECT COUNT(*) FROM ins_logs)    AS action_logs_inserted;

COMMIT;
