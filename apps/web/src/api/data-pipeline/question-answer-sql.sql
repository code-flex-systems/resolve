-- Seed: questions & answers from broad libraries (page_id always valid)
-- Client: 1c118f90-3153-4dfb-b350-953e42f0d1aa
BEGIN;

WITH
pages AS (
  SELECT
    p.id    AS page_id,
    p.title AS page_title,
    CASE
      WHEN p.title ILIKE '%auto%' OR p.title ILIKE '%vehicle%' OR p.title ILIKE '%edr%' THEN 'auto'
      WHEN p.title ILIKE '%property%' OR p.title ILIKE '%home%'  OR p.title ILIKE '%homeowners%' OR p.title ILIKE '%xactimate%' THEN 'home'
      WHEN p.title ILIKE '%injury%' OR p.title ILIKE '%health%' OR p.title ILIKE '%hipaa%' OR p.title ILIKE '%medpay%' OR p.title ILIKE '%pip%' THEN 'injury'
      WHEN p.title ILIKE '%subro%' OR p.title ILIKE '%arbitration%' OR p.title ILIKE '%demand%' THEN 'subro'
      ELSE 'generic'
    END AS cat
  FROM page p
  WHERE p.client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa'
),

question_library(cat, type, text, placeholder, option_group) AS (
  VALUES
  -- Generic
  ('generic','single',   'Is this item applicable?',                         NULL,'yes_no_na'),
  ('generic','dropdown', 'Select current status',                            NULL,'status_generic'),
  ('generic','multi',    'Select required artifacts',                        NULL,'required_artifacts'),
  ('generic','freeform', 'Add notes (if any)',                               'Enter notes...',NULL),
  ('generic','single',   'Escalate for supervisor review?',                  NULL,'yes_no'),
  ('generic','dropdown', 'Set priority',                                     NULL,'priority'),
  ('generic','single',   'Are all documents received?',                      NULL,'yes_no'),
  ('generic','dropdown', 'Document status',                                  NULL,'doc_status'),
  ('generic','multi',    'Which parties are involved?',                      NULL,'parties_generic'),
  ('generic','single',   'Is insured contactable?',                          NULL,'yes_no'),
  ('generic','dropdown', 'Preferred contact method',                         NULL,'contact_method'),
  ('generic','multi',    'Outstanding tasks',                                NULL,'tasks_generic'),
  ('generic','single',   'Is arbitration appropriate?',                      NULL,'yes_no'),
  ('generic','dropdown', 'Jurisdiction / venue suitability',                 NULL,'venue_suitability'),
  ('generic','multi',    'Evidence on file',                                 NULL,'evidence_generic'),
  ('generic','dropdown', 'Recovery stage',                                   NULL,'recovery_stage'),

  -- Auto
  ('auto','single',      'Was the insured vehicle drivable from the scene?', NULL,'yes_no'),
  ('auto','dropdown',    'Police report status',                             NULL,'auto_police_status'),
  ('auto','multi',       'Applicable coverages',                             NULL,'auto_coverages'),
  ('auto','freeform',    'Describe the loss circumstances',                  'Intersection, weather, traffic control, etc.',NULL),
  ('auto','dropdown',    'Liability assessment (Auto)',                      NULL,'auto_liability'),
  ('auto','multi',       'Damage areas',                                     NULL,'auto_damage_area'),
  ('auto','dropdown',    'Vehicle use at time of loss',                      NULL,'auto_use'),
  ('auto','single',      'Is EDR data available?',                           NULL,'yes_no'),
  ('auto','dropdown',    'Total loss disposition',                           NULL,'total_loss'),
  ('auto','multi',       'Medical benefit types (Auto)',                     NULL,'auto_med_benefits'),

  -- Home/Property
  ('home','dropdown',    'Cause of loss (Property)',                         NULL,'property_perils'),
  ('home','single',      'Mitigation vendor assigned?',                      NULL,'yes_no'),
  ('home','multi',       'Areas affected',                                   NULL,'areas_affected'),
  ('home','freeform',    'Scope notes',                                      'Square footage, materials, access...',NULL),
  ('home','dropdown',    'Mitigation status',                                NULL,'mitigation_status'),
  ('home','multi',       'Estimate platform/tools',                          NULL,'estimate_tools'),
  ('home','single',      'Code upgrade coverage triggered?',                 NULL,'yes_no'),
  ('home','dropdown',    'Roof condition prior to loss',                     NULL,'roof_condition'),
  ('home','multi',       'Contents categories impacted',                     NULL,'contents_categories'),

  -- Injury/Health
  ('injury','dropdown',  'Mechanism of injury',                              NULL,'injury_mechanisms'),
  ('injury','single',    'HIPAA authorization on file?',                     NULL,'yes_no'),
  ('injury','multi',     'Liens identified',                                 NULL,'injury_liens'),
  ('injury','freeform',  'Treatment summary',                                'ER, diagnostics, specialist, PT, MMI...',NULL),
  ('injury','dropdown',  'Treatment phase',                                  NULL,'treatment_phase'),
  ('injury','single',    'IME/Peer review needed?',                          NULL,'yes_no'),
  ('injury','multi',     'Records requested from',                           NULL,'provider_types'),
  ('injury','dropdown',  'Work status',                                      NULL,'work_status'),

  -- Subrogation
  ('subro','single',     'Is subrogation viable?',                           NULL,'yes_no'),
  ('subro','dropdown',   'Liability assessment',                             NULL,'liability_assessment'),
  ('subro','multi',      'Supporting evidence available',                    NULL,'subro_evidence'),
  ('subro','freeform',   'Demand strategy notes',                            'Negotiation posture, comparables...',NULL),
  ('subro','dropdown',   'Arbitration program',                              NULL,'arbitration_program'),
  ('subro','multi',      'Recovery barriers',                                NULL,'recovery_barriers'),
  ('subro','single',     'Waiver of subrogation present?',                   NULL,'yes_no'),
  ('subro','dropdown',   'Statute timing',                                   NULL,'statute_timing')
),

option_library(group_key, label) AS (
  VALUES
  -- yes/no variants
  ('yes_no','Yes'),('yes_no','No'),
  ('yes_no_na','Yes'),('yes_no_na','No'),('yes_no_na','N/A'),
  -- generic status/priority/etc
  ('status_generic','Not Started'),('status_generic','In Progress'),
  ('status_generic','Pending Docs'),('status_generic','Complete'),('status_generic','N/A'),
  ('priority','Low'),('priority','Normal'),('priority','High'),('priority','Urgent'),
  ('doc_status','Not Requested'),('doc_status','Requested'),('doc_status','Received - Complete'),('doc_status','Received - Incomplete'),
  ('contact_method','Phone'),('contact_method','Email'),('contact_method','Mail'),('contact_method','Portal'),
  ('recovery_stage','Intake'),('recovery_stage','Investigation'),('recovery_stage','Demand'),('recovery_stage','Arbitration'),('recovery_stage','Closed'),
  ('venue_suitability','Favorable'),('venue_suitability','Neutral'),('venue_suitability','Unfavorable'),
  -- generic pools
  ('parties_generic','Insured'),('parties_generic','Adverse Driver'),('parties_generic','Witness'),('parties_generic','Vendor'),('parties_generic','Attorney'),
  ('tasks_generic','Obtain Statement'),('tasks_generic','Order Records'),('tasks_generic','Review Estimate'),('tasks_generic','Contact Adverse'),('tasks_generic','Prepare Demand'),
  ('evidence_generic','Photos'),('evidence_generic','Invoices'),('evidence_generic','Witness Statements'),('evidence_generic','Police/Fire Report'),('evidence_generic','Expert Report'),
  ('required_artifacts','Photos'),('required_artifacts','Invoices'),('required_artifacts','Statements'),('required_artifacts','Reports'),('required_artifacts','Estimate'),
  -- auto
  ('auto_police_status','Not Requested'),('auto_police_status','Requested'),('auto_police_status','Received - No Citations'),('auto_police_status','Received - With Citations'),
  ('auto_coverages','Liability'),('auto_coverages','Collision'),('auto_coverages','Comprehensive'),('auto_coverages','MedPay/PIP'),('auto_coverages','UM/UIM'),
  ('auto_damage_area','Front'),('auto_damage_area','Rear'),('auto_damage_area','Left Side'),('auto_damage_area','Right Side'),('auto_damage_area','Undercarriage'),
  ('auto_use','Personal'),('auto_use','Commercial'),('auto_use','Rideshare/TNC'),('auto_use','Rental'),
  ('auto_liability','Clear Adverse'),('auto_liability','Shared Fault'),('auto_liability','No Liability'),('auto_liability','Unclear'),
  ('total_loss','No'),('total_loss','Pending'),('total_loss','Salvage'),('total_loss','Retained Salvage'),
  ('auto_med_benefits','MedPay'),('auto_med_benefits','PIP'),('auto_med_benefits','BI'),
  -- home/property
  ('property_perils','Water'),('property_perils','Wind/Hail'),('property_perils','Fire/Smoke'),('property_perils','Theft/Vandalism'),('property_perils','Other'),
  ('areas_affected','Roof'),('areas_affected','Exterior'),('areas_affected','Interior Walls'),('areas_affected','Flooring'),('areas_affected','Contents'),
  ('mitigation_status','Not Started'),('mitigation_status','In Progress'),('mitigation_status','Completed'),('mitigation_status','Invoice Pending'),
  ('estimate_tools','Xactimate'),('estimate_tools','Symbility'),('estimate_tools','Contractor Proposal'),('estimate_tools','Manual Spreadsheet'),
  ('roof_condition','New (0–5 yrs)'),('roof_condition','Mid-life (6–15 yrs)'),('roof_condition','End-of-life (16+ yrs)'),('roof_condition','Unknown'),
  ('contents_categories','Electronics'),('contents_categories','Furniture'),('contents_categories','Clothing/Soft Goods'),('contents_categories','Appliances'),('contents_categories','Misc'),
  -- injury/health
  ('injury_mechanisms','Rear-End'),('injury_mechanisms','Slip/Fall'),('injury_mechanisms','T-Bone'),('injury_mechanisms','Head-On'),('injury_mechanisms','Other'),
  ('injury_liens','ERISA'),('injury_liens','Medicaid'),('injury_liens','Medicare'),('injury_liens','Hospital'),('injury_liens','None'),
  ('treatment_phase','Acute'),('treatment_phase','Ongoing'),('treatment_phase','Discharged'),('treatment_phase','MMI'),
  ('provider_types','Hospital'),('provider_types','Primary Care'),('provider_types','Ortho'),('provider_types','PT/OT'),('provider_types','Imaging'),
  ('work_status','Full Duty'),('work_status','Restricted'),('work_status','Off Work'),('work_status','Unknown'),
  -- subro
  ('liability_assessment','Clear Adverse'),('liability_assessment','Shared Fault'),('liability_assessment','Unclear'),('liability_assessment','No Liability'),
  ('subro_evidence','Police Report'),('subro_evidence','Photos'),('subro_evidence','Witness Statements'),('subro_evidence','Invoices'),('subro_evidence','Expert Report'),
  ('recovery_barriers','Coverage Dispute'),('recovery_barriers','Causation Dispute'),('recovery_barriers','Damages Dispute'),('recovery_barriers','SOL Risk'),('recovery_barriers','Unresponsive Carrier'),
  ('arbitration_program','PIP'),('arbitration_program','Property'),('arbitration_program','UM/UIM'),
  ('statute_timing','> 1 year'),('statute_timing','6–12 months'),('statute_timing','< 6 months')
),

-- choose 3–6 questions per page
picked_cat AS (
  SELECT pg.page_id, ql.type, ql.text, ql.placeholder, ql.option_group
  FROM pages pg
  JOIN LATERAL (
    SELECT type, text, placeholder, option_group
    FROM question_library
    WHERE cat = pg.cat
    ORDER BY random()
    LIMIT (2 + floor(random()*3))::int    -- 2..4
  ) ql ON TRUE
),
picked_gen AS (
  SELECT pg.page_id, ql.type, ql.text, ql.placeholder, ql.option_group
  FROM pages pg
  JOIN LATERAL (
    SELECT type, text, placeholder, option_group
    FROM question_library
    WHERE cat = 'generic'
    ORDER BY random()
    LIMIT (1 + floor(random()*3))::int    -- 1..3
  ) ql ON TRUE
),
picked_all AS (
  SELECT * FROM picked_cat
  UNION ALL
  SELECT * FROM picked_gen
),
per_page_questions AS (
  SELECT
    page_id, type, text, placeholder, option_group,
    row_number() OVER (PARTITION BY page_id ORDER BY text) AS position
  FROM picked_all
),

-- insert questions; return text so we can join to recover option_group later
ins_questions AS (
  INSERT INTO question (
    client_id, page_id, text, position, type,
    description_text, description_image_url, placeholder, hidden,
    created_by, created_at, updated_by, updated_at
  )
  SELECT
    '1c118f90-3153-4dfb-b350-953e42f0d1aa' AS client_id,
    q.page_id,
    q.text,
    q.position,
    q.type,
    NULL::text,
    NULL::text,
    q.placeholder,
    (random() < 0.05),
    (SELECT id FROM users WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin' ORDER BY random() LIMIT 1),
    (now() - (floor(random()*120) * interval '1 day')),
    (SELECT id FROM users WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin' ORDER BY random() LIMIT 1),
    (now() - (floor(1 + random()*90) * interval '1 day'))
  FROM per_page_questions q
  RETURNING id, page_id, type, text
),

-- compute option counts & group_key by joining the returned questions back to per_page_questions
q_counts AS (
  SELECT
    iq.id AS question_id,
    iq.page_id,
    iq.type,
    COALESCE(ppq.option_group, CASE
      WHEN iq.type = 'single'   THEN 'yes_no_na'
      WHEN iq.type = 'dropdown' THEN 'status_generic'
      WHEN iq.type = 'multi'    THEN 'required_artifacts'
      ELSE NULL
    END) AS group_key,
    CASE
      WHEN iq.type = 'single'   THEN (2 + floor(random()*2))::int   -- 2..3
      WHEN iq.type = 'dropdown' THEN (3 + floor(random()*4))::int   -- 3..6
      WHEN iq.type = 'multi'    THEN (3 + floor(random()*4))::int   -- 3..6
      ELSE 0
    END AS opt_count
  FROM ins_questions iq
  JOIN per_page_questions ppq
    ON ppq.page_id = iq.page_id AND ppq.text = iq.text AND ppq.type = iq.type
),

-- sample labels for each question
answer_opts AS (
  SELECT
    q.question_id,
    q.page_id,
    q.type,
    o.label,
    row_number() OVER (PARTITION BY q.question_id ORDER BY random()) AS position
  FROM q_counts q
  JOIN LATERAL (
    SELECT label
    FROM option_library o
    WHERE o.group_key = q.group_key
    ORDER BY random()
    LIMIT GREATEST(q.opt_count, 0)
  ) o ON TRUE
),

-- choose <=1 link per question
link_choice AS (
  SELECT
    q.question_id,
    CASE WHEN random() < 0.35 AND q.opt_count > 0
         THEN (1 + floor(random()*q.opt_count))::int
         ELSE NULL::int
    END AS link_pos
  FROM q_counts q
),

-- enrich answers with a stable has_add flag
answer_enriched AS (
  SELECT
    a.question_id,
    a.page_id,
    a.type,
    a.label,
    a.position,
    (a.type <> 'dropdown' AND random() < 0.25) AS has_add
  FROM answer_opts a
),

-- insert answers
ins_answers AS (
  INSERT INTO answer (
    client_id, question_id, text, position, grade,
    description_text, description_image_url,
    has_additional_info, additional_info_placeholder, additional_info_num_lines,
    calls_instance_id, hidden, created_by, created_at, updated_by, updated_at
  )
  SELECT
    '1c118f90-3153-4dfb-b350-953e42f0d1aa' AS client_id,
    e.question_id,
    e.label AS text,
    e.position,
    NULL::numeric,
    NULL::text,
    NULL::text,
    e.has_add,
    CASE WHEN e.has_add THEN 'Provide details...' ELSE NULL END,
    CASE WHEN e.has_add THEN (2 + floor(random()*4))::int ELSE NULL END,
    CASE
      WHEN lc.link_pos IS NOT NULL AND e.position = lc.link_pos THEN (
        SELECT c.id
        FROM page_instance c
        JOIN page_instance p ON p.id = c.parent_instance_id
        WHERE c.client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa'
          AND p.client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa'
          AND p.page_id = e.page_id
        ORDER BY random()
        LIMIT 1
      )
      ELSE NULL
    END,
    (random() < 0.03),
    (SELECT id FROM users WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin' ORDER BY random() LIMIT 1),
    (now() - (floor(random()*90) * interval '1 day')),
    (SELECT id FROM users WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin' ORDER BY random() LIMIT 1),
    (now() - (floor(1 + random()*60) * interval '1 day'))
  FROM answer_enriched e
  LEFT JOIN link_choice lc ON lc.question_id = e.question_id
  RETURNING id
)

SELECT
  (SELECT COUNT(*) FROM pages)         AS pages_covered,
  (SELECT COUNT(*) FROM ins_questions) AS questions_inserted,
  (SELECT COUNT(*) FROM ins_answers)   AS answers_inserted;

COMMIT;