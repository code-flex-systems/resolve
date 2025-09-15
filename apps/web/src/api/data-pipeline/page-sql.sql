-- Seed: page templates + page instances + parents + hierarchical positions
-- Client: 1c118f90-3153-4dfb-b350-953e42f0d1aa

-- 1) Insert page templates (table: page). Hidden/version use defaults.
INSERT INTO page (
  client_id, title, created_by, created_at, updated_by, updated_at
) VALUES
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Witness Statements Collection',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Litigation Referral Assessment',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'SIU Referral Screening',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Insured Recorded Statement – Auto',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Adverse Vehicle Identification',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Coverage Verification – Auto Policy',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'PIP Eligibility & Limits – Auto',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Photographic Evidence Review – Auto',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Total Loss Evaluation – Auto',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Coverage Denial Justification – Auto',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Towing & Storage Validation – Auto',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'FNOL Intake – Auto',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Insured Vehicle Identification',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Adverse Carrier Contact & Demand – Auto',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Salvage Coordination – Auto',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Repair Estimate Audit – Auto',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Medical Payments (MedPay) Review – Auto',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Event Data Recorder (EDR) Request',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Liability Assessment – Comparative Negligence (Auto)',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Subrogation Opportunity Review',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Demand Letter Preparation',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Lien Holders & Recovery Parties',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Estimate Review – Xactimate Audit',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Emergency Services Authorization (Mitigation)',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Mitigation Invoice Review – Property',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Proof of Loss Review – Property',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Ordinance or Law (Code Upgrade) Review',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Salvage & Recovery – Property',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Mortgagee / Lienholder Communication',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Additional Living Expense (ALE) Review',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Adverse Weather Data Corroboration',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Contents Inventory & Valuation',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Structural Damage Assessment – Property',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Peril Determination – Fire/Water/Wind/Hail/Theft',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'CAT Event Handling – Property',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Coverage Verification – Homeowners',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Property Photos & Measurements',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Claim Closure Checklist – Property',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Subrogation Potential – Property',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Depreciation / Recoverable Depreciation',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Exclusions & Endorsements Review – Homeowners',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Litigation Referral – Property',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Cause & Origin Investigation – Property',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Litigation Referral – Injury',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'IME / Peer Review Referral',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Provider Billing Audit – Injury',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Medicare/Medicaid Lien Check',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'ICD/CPT Code Validation',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'ERISA/Plan Language Review',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Subrogation Potential – Health Lien',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Medical Records Review – Injury',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Settlement Authority Checklist – BI',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Disability Assessment – Injury',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Release & Indemnity Review – Injury',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Liability Evaluation – Bodily Injury',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'FNOL Intake – Injury',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Treatment Plan Reasonableness – Injury',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Lost Wages Verification',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Pain & Suffering Evaluation',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Demand Package Review – BI',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'SIU Referral Screening – Injury',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'MMI (Maximum Medical Improvement) Check',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Coverage Verification – Health/MedPay',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'HIPAA Authorization & Records Request',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Reserve Adequacy Review – Injury',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Arbitration File Preparation',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Scene Inspection / Photography – Subro',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Demand Letter Preparation – Subro',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Arbitration Strategy – PIP/Property',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Intercompany Arbitration Filing',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Coverage & Right of Recovery Review',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Statute of Limitations Tracking – Subro',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Recovery Accounting & Posting',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Insured Cooperation & Statements – Subro',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Subrogation Intake & Assignment',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Waiver & Release Review – Subro',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Police/Fire Report Procurement – Subro',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Damages Calculation & Allocation – Subro',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Settlement Documentation & Closure',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Third-Party Carrier Contact – Subro',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Product Liability Screening – Subro',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Liability Theory Development – Subro',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Evidence Preservation & Chain of Custody',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Vendor/Expert Assignment – Subro',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  ),
(
    '1c118f90-3153-4dfb-b350-953e42f0d1aa',     -- client_id
    'Adverse Party Identification – Subro',    -- title
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- created_by
    now() - (floor(random()*240) * interval '1 day'),    -- created_at (~8 months)
    (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),       -- updated_by
    now() - (floor(1 + random()*(179)) * interval '1 day')  -- updated_at
  );


-- 2) Insert page instances (parent_instance_id initially NULL; position temporary)

-- Checklist: Auto (20 instances)
INSERT INTO page_instance (
  client_id, page_id, checklist_id, parent_instance_id, position,
  created_by, created_at, updated_by, updated_at
) VALUES
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Witness Statements Collection'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Auto'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      1,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Litigation Referral Assessment'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Auto'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      2,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'SIU Referral Screening'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Auto'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      3,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Insured Recorded Statement – Auto'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Auto'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      4,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Adverse Vehicle Identification'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Auto'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      5,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Coverage Verification – Auto Policy'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Auto'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      6,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'PIP Eligibility & Limits – Auto'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Auto'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      7,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Photographic Evidence Review – Auto'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Auto'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      8,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Total Loss Evaluation – Auto'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Auto'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      9,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Coverage Denial Justification – Auto'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Auto'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      10,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Towing & Storage Validation – Auto'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Auto'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      11,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'FNOL Intake – Auto'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Auto'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      12,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Insured Vehicle Identification'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Auto'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      13,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Adverse Carrier Contact & Demand – Auto'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Auto'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      14,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Salvage Coordination – Auto'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Auto'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      15,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Repair Estimate Audit – Auto'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Auto'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      16,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Medical Payments (MedPay) Review – Auto'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Auto'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      17,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Event Data Recorder (EDR) Request'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Auto'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      18,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Liability Assessment – Comparative Negligence (Auto)'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Auto'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      19,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Total Loss Evaluation – Auto'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Auto'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      20,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    );

-- Checklist: Home (27 instances)
INSERT INTO page_instance (
  client_id, page_id, checklist_id, parent_instance_id, position,
  created_by, created_at, updated_by, updated_at
) VALUES
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Litigation Referral Assessment'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Home'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      1,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Subrogation Opportunity Review'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Home'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      2,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Demand Letter Preparation'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Home'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      3,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Lien Holders & Recovery Parties'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Home'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      4,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Estimate Review – Xactimate Audit'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Home'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      5,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Emergency Services Authorization (Mitigation)'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Home'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      6,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Mitigation Invoice Review – Property'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Home'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      7,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Proof of Loss Review – Property'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Home'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      8,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Ordinance or Law (Code Upgrade) Review'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Home'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      9,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Salvage & Recovery – Property'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Home'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      10,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Mortgagee / Lienholder Communication'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Home'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      11,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Additional Living Expense (ALE) Review'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Home'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      12,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Adverse Weather Data Corroboration'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Home'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      13,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Contents Inventory & Valuation'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Home'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      14,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Structural Damage Assessment – Property'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Home'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      15,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Peril Determination – Fire/Water/Wind/Hail/Theft'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Home'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      16,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'CAT Event Handling – Property'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Home'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      17,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Coverage Verification – Homeowners'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Home'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      18,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Property Photos & Measurements'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Home'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      19,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Claim Closure Checklist – Property'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Home'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      20,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Subrogation Potential – Property'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Home'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      21,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Depreciation / Recoverable Depreciation'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Home'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      22,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Exclusions & Endorsements Review – Homeowners'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Home'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      23,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Litigation Referral – Property'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Home'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      24,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Cause & Origin Investigation – Property'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Home'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      25,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Lien Holders & Recovery Parties'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Home'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      26,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Adverse Weather Data Corroboration'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Home'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      27,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    );

-- Checklist: Health & Personal Injury (27 instances)
INSERT INTO page_instance (
  client_id, page_id, checklist_id, parent_instance_id, position,
  created_by, created_at, updated_by, updated_at
) VALUES
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Litigation Referral Assessment'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Health & Personal Injury'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      1,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Demand Letter Preparation'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Health & Personal Injury'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      2,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Witness Statements Collection'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Health & Personal Injury'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      3,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Litigation Referral – Injury'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Health & Personal Injury'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      4,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'IME / Peer Review Referral'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Health & Personal Injury'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      5,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Provider Billing Audit – Injury'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Health & Personal Injury'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      6,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Medicare/Medicaid Lien Check'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Health & Personal Injury'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      7,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'ICD/CPT Code Validation'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Health & Personal Injury'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      8,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'ERISA/Plan Language Review'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Health & Personal Injury'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      9,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Subrogation Potential – Health Lien'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Health & Personal Injury'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      10,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Medical Records Review – Injury'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Health & Personal Injury'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      11,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Settlement Authority Checklist – BI'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Health & Personal Injury'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      12,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Disability Assessment – Injury'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Health & Personal Injury'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      13,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Release & Indemnity Review – Injury'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Health & Personal Injury'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      14,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Liability Evaluation – Bodily Injury'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Health & Personal Injury'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      15,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'FNOL Intake – Injury'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Health & Personal Injury'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      16,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Treatment Plan Reasonableness – Injury'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Health & Personal Injury'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      17,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Lost Wages Verification'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Health & Personal Injury'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      18,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Pain & Suffering Evaluation'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Health & Personal Injury'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      19,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Demand Package Review – BI'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Health & Personal Injury'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      20,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'SIU Referral Screening – Injury'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Health & Personal Injury'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      21,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'MMI (Maximum Medical Improvement) Check'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Health & Personal Injury'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      22,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Coverage Verification – Health/MedPay'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Health & Personal Injury'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      23,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'HIPAA Authorization & Records Request'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Health & Personal Injury'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      24,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Reserve Adequacy Review – Injury'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Health & Personal Injury'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      25,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Demand Package Review – BI'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Health & Personal Injury'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      26,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'ICD/CPT Code Validation'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Health & Personal Injury'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      27,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    );

-- Checklist: General Subrogation (23 instances)
INSERT INTO page_instance (
  client_id, page_id, checklist_id, parent_instance_id, position,
  created_by, created_at, updated_by, updated_at
) VALUES
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Arbitration File Preparation'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'General Subrogation'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      1,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Demand Letter Preparation'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'General Subrogation'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      2,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Scene Inspection / Photography – Subro'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'General Subrogation'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      3,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Demand Letter Preparation – Subro'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'General Subrogation'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      4,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Arbitration Strategy – PIP/Property'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'General Subrogation'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      5,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Intercompany Arbitration Filing'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'General Subrogation'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      6,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Coverage & Right of Recovery Review'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'General Subrogation'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      7,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Statute of Limitations Tracking – Subro'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'General Subrogation'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      8,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Recovery Accounting & Posting'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'General Subrogation'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      9,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Insured Cooperation & Statements – Subro'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'General Subrogation'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      10,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Subrogation Intake & Assignment'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'General Subrogation'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      11,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Waiver & Release Review – Subro'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'General Subrogation'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      12,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Police/Fire Report Procurement – Subro'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'General Subrogation'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      13,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Damages Calculation & Allocation – Subro'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'General Subrogation'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      14,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Settlement Documentation & Closure'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'General Subrogation'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      15,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Third-Party Carrier Contact – Subro'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'General Subrogation'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      16,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Product Liability Screening – Subro'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'General Subrogation'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      17,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Liability Theory Development – Subro'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'General Subrogation'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      18,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Evidence Preservation & Chain of Custody'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'General Subrogation'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      19,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Vendor/Expert Assignment – Subro'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'General Subrogation'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      20,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Adverse Party Identification – Subro'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'General Subrogation'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      21,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Subrogation Opportunity Review'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'General Subrogation'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      22,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    ),
(
      '1c118f90-3153-4dfb-b350-953e42f0d1aa',                     -- client_id
      (
  SELECT id FROM page
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND title = 'Scene Inspection / Photography – Subro'
  ORDER BY id LIMIT 1
),            -- page_id (template)
      (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'General Subrogation'
  ORDER BY id LIMIT 1
),-- checklist_id
      NULL,                               -- parent_instance_id (set later)
      23,                         -- position (placeholder)
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- created_by
      now() - (floor(random()*120) * interval '1 day'),                    -- created_at
      (
  SELECT id FROM users
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND role = 'Admin'
  ORDER BY random() LIMIT 1
),                       -- updated_by
      now() - (floor(1 + random()*(89)) * interval '1 day')            -- updated_at
    );


-- 3) Assign parent_instance_id safely (max depth 5, no cycles)

-- Parent assignment for checklist: Auto
WITH ranked AS (
  SELECT id, created_at, NTILE(5) OVER (ORDER BY created_at) AS gen
  FROM page_instance
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa'
    AND checklist_id = (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Auto'
  ORDER BY id LIMIT 1
)
),
candidates AS (
  SELECT c.id AS child_id,
         (
           SELECT p.id
           FROM ranked p
           WHERE p.gen < c.gen
           ORDER BY random()
           LIMIT 1
         ) AS parent_id
  FROM ranked c
  WHERE c.gen >= 2
    AND random() < 0.7
)
UPDATE page_instance pi
SET parent_instance_id = cand.parent_id
FROM candidates cand
WHERE pi.id = cand.child_id
  AND pi.parent_instance_id IS NULL
  AND cand.parent_id IS NOT NULL;

-- Parent assignment for checklist: Home
WITH ranked AS (
  SELECT id, created_at, NTILE(5) OVER (ORDER BY created_at) AS gen
  FROM page_instance
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa'
    AND checklist_id = (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Home'
  ORDER BY id LIMIT 1
)
),
candidates AS (
  SELECT c.id AS child_id,
         (
           SELECT p.id
           FROM ranked p
           WHERE p.gen < c.gen
           ORDER BY random()
           LIMIT 1
         ) AS parent_id
  FROM ranked c
  WHERE c.gen >= 2
    AND random() < 0.7
)
UPDATE page_instance pi
SET parent_instance_id = cand.parent_id
FROM candidates cand
WHERE pi.id = cand.child_id
  AND pi.parent_instance_id IS NULL
  AND cand.parent_id IS NOT NULL;

-- Parent assignment for checklist: Health & Personal Injury
WITH ranked AS (
  SELECT id, created_at, NTILE(5) OVER (ORDER BY created_at) AS gen
  FROM page_instance
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa'
    AND checklist_id = (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Health & Personal Injury'
  ORDER BY id LIMIT 1
)
),
candidates AS (
  SELECT c.id AS child_id,
         (
           SELECT p.id
           FROM ranked p
           WHERE p.gen < c.gen
           ORDER BY random()
           LIMIT 1
         ) AS parent_id
  FROM ranked c
  WHERE c.gen >= 2
    AND random() < 0.7
)
UPDATE page_instance pi
SET parent_instance_id = cand.parent_id
FROM candidates cand
WHERE pi.id = cand.child_id
  AND pi.parent_instance_id IS NULL
  AND cand.parent_id IS NOT NULL;

-- Parent assignment for checklist: General Subrogation
WITH ranked AS (
  SELECT id, created_at, NTILE(5) OVER (ORDER BY created_at) AS gen
  FROM page_instance
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa'
    AND checklist_id = (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'General Subrogation'
  ORDER BY id LIMIT 1
)
),
candidates AS (
  SELECT c.id AS child_id,
         (
           SELECT p.id
           FROM ranked p
           WHERE p.gen < c.gen
           ORDER BY random()
           LIMIT 1
         ) AS parent_id
  FROM ranked c
  WHERE c.gen >= 2
    AND random() < 0.7
)
UPDATE page_instance pi
SET parent_instance_id = cand.parent_id
FROM candidates cand
WHERE pi.id = cand.child_id
  AND pi.parent_instance_id IS NULL
  AND cand.parent_id IS NOT NULL;


-- 4) Recompute positions to reflect hierarchy (preorder: parent before children)

-- Position reorder for checklist: Auto
WITH RECURSIVE tree AS (
  -- roots
  SELECT
    pi.id,
    pi.parent_instance_id,
    pi.created_at,
    1 AS depth,
    -- sort key for stable ordering: created_at then id
    to_char(pi.created_at, 'YYYYMMDDHH24MISSMS') || '-' || lpad(pi.id::text, 10, '0') AS sortkey
  FROM page_instance pi
  WHERE pi.client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa'
    AND pi.checklist_id = (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Auto'
  ORDER BY id LIMIT 1
)
    AND pi.parent_instance_id IS NULL

  UNION ALL

  -- children
  SELECT
    c.id,
    c.parent_instance_id,
    c.created_at,
    t.depth + 1 AS depth,
    t.sortkey || '.' ||
      to_char(c.created_at, 'YYYYMMDDHH24MISSMS') || '-' || lpad(c.id::text, 10, '0') AS sortkey
  FROM page_instance c
  JOIN tree t ON c.parent_instance_id = t.id
  WHERE c.client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa'
    AND c.checklist_id = (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Auto'
  ORDER BY id LIMIT 1
)
),
ordered AS (
  SELECT id, row_number() OVER (ORDER BY sortkey) AS pos
  FROM tree
)
UPDATE page_instance p
SET position = o.pos
FROM ordered o
WHERE p.id = o.id;

-- Position reorder for checklist: Home
WITH RECURSIVE tree AS (
  -- roots
  SELECT
    pi.id,
    pi.parent_instance_id,
    pi.created_at,
    1 AS depth,
    -- sort key for stable ordering: created_at then id
    to_char(pi.created_at, 'YYYYMMDDHH24MISSMS') || '-' || lpad(pi.id::text, 10, '0') AS sortkey
  FROM page_instance pi
  WHERE pi.client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa'
    AND pi.checklist_id = (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Home'
  ORDER BY id LIMIT 1
)
    AND pi.parent_instance_id IS NULL

  UNION ALL

  -- children
  SELECT
    c.id,
    c.parent_instance_id,
    c.created_at,
    t.depth + 1 AS depth,
    t.sortkey || '.' ||
      to_char(c.created_at, 'YYYYMMDDHH24MISSMS') || '-' || lpad(c.id::text, 10, '0') AS sortkey
  FROM page_instance c
  JOIN tree t ON c.parent_instance_id = t.id
  WHERE c.client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa'
    AND c.checklist_id = (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Home'
  ORDER BY id LIMIT 1
)
),
ordered AS (
  SELECT id, row_number() OVER (ORDER BY sortkey) AS pos
  FROM tree
)
UPDATE page_instance p
SET position = o.pos
FROM ordered o
WHERE p.id = o.id;

-- Position reorder for checklist: Health & Personal Injury
WITH RECURSIVE tree AS (
  -- roots
  SELECT
    pi.id,
    pi.parent_instance_id,
    pi.created_at,
    1 AS depth,
    -- sort key for stable ordering: created_at then id
    to_char(pi.created_at, 'YYYYMMDDHH24MISSMS') || '-' || lpad(pi.id::text, 10, '0') AS sortkey
  FROM page_instance pi
  WHERE pi.client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa'
    AND pi.checklist_id = (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Health & Personal Injury'
  ORDER BY id LIMIT 1
)
    AND pi.parent_instance_id IS NULL

  UNION ALL

  -- children
  SELECT
    c.id,
    c.parent_instance_id,
    c.created_at,
    t.depth + 1 AS depth,
    t.sortkey || '.' ||
      to_char(c.created_at, 'YYYYMMDDHH24MISSMS') || '-' || lpad(c.id::text, 10, '0') AS sortkey
  FROM page_instance c
  JOIN tree t ON c.parent_instance_id = t.id
  WHERE c.client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa'
    AND c.checklist_id = (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'Health & Personal Injury'
  ORDER BY id LIMIT 1
)
),
ordered AS (
  SELECT id, row_number() OVER (ORDER BY sortkey) AS pos
  FROM tree
)
UPDATE page_instance p
SET position = o.pos
FROM ordered o
WHERE p.id = o.id;

-- Position reorder for checklist: General Subrogation
WITH RECURSIVE tree AS (
  -- roots
  SELECT
    pi.id,
    pi.parent_instance_id,
    pi.created_at,
    1 AS depth,
    -- sort key for stable ordering: created_at then id
    to_char(pi.created_at, 'YYYYMMDDHH24MISSMS') || '-' || lpad(pi.id::text, 10, '0') AS sortkey
  FROM page_instance pi
  WHERE pi.client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa'
    AND pi.checklist_id = (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'General Subrogation'
  ORDER BY id LIMIT 1
)
    AND pi.parent_instance_id IS NULL

  UNION ALL

  -- children
  SELECT
    c.id,
    c.parent_instance_id,
    c.created_at,
    t.depth + 1 AS depth,
    t.sortkey || '.' ||
      to_char(c.created_at, 'YYYYMMDDHH24MISSMS') || '-' || lpad(c.id::text, 10, '0') AS sortkey
  FROM page_instance c
  JOIN tree t ON c.parent_instance_id = t.id
  WHERE c.client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa'
    AND c.checklist_id = (
  SELECT id FROM checklist
  WHERE client_id = '1c118f90-3153-4dfb-b350-953e42f0d1aa' AND name = 'General Subrogation'
  ORDER BY id LIMIT 1
)
),
ordered AS (
  SELECT id, row_number() OVER (ORDER BY sortkey) AS pos
  FROM tree
)
UPDATE page_instance p
SET position = o.pos
FROM ordered o
WHERE p.id = o.id;
