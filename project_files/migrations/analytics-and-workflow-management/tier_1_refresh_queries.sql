-- ============================================================================
-- TIER 1 REFRESH QUERIES: BATCH POPULATION & BACKFILL
-- ============================================================================
-- These queries populate the analytics rollup tables. They should be run:
--   - Nightly batch job: Run after midnight for previous day's data
--   - Backfill: Run in a loop for historical dates
--
-- Parameters:
--   - :client_id: The tenant to process
--   - :summary_date / :snapshot_date: The date to populate (typically CURRENT_DATE - 1)
--
-- All queries use UPSERT (ON CONFLICT DO UPDATE) for idempotency.
-- Re-running a query for the same date will update existing records.
--
-- Backfill Strategy:
--   Generate a date series from earliest claim created_at to yesterday,
--   then run each refresh query for each date in the series.
-- ============================================================================


-- ============================================================================
-- DATE SERIES GENERATOR FOR BACKFILL
-- ============================================================================
-- Use this to generate the list of dates that need backfilling.
-- Returns one row per date from earliest claim to yesterday.
-- ============================================================================

-- SELECT generate_series(
--   (SELECT MIN(created_at)::date FROM claim WHERE client_id = :client_id),
--   CURRENT_DATE - 1,
--   '1 day'::interval
-- )::date AS summary_date;


-- ============================================================================
-- 1.1 DAILY RECOVERY SUMMARY - REFRESH
-- ============================================================================
-- Populates analytics.daily_recovery_summary for a single date.
--
-- Parameters:
--   - :client_id: Tenant ID
--   - :summary_date: Date to populate (typically CURRENT_DATE - 1)
--
-- Metrics captured:
--   - total_expected_recovery: Sum of expected_recovery across all claims (snapshot)
--   - total_actual_recovery: Sum of actual_recovery across all claims (snapshot)
--   - recovery_events_count/amount: Recovery events created on this date
--   - claims_created: Claims created on this date
--   - claims_closed: Claims closed on this date
--   - claims_active_eod: Active claims at end of this date
-- ============================================================================

INSERT INTO analytics.daily_recovery_summary (
  client_id,
  summary_date,
  total_expected_recovery,
  total_actual_recovery,
  recovery_events_count,
  recovery_events_amount,
  claims_created,
  claims_closed,
  claims_active_eod
)
SELECT
  c.client_id,
  :summary_date AS summary_date,

  -- Cumulative totals across all claims (snapshot)
  COALESCE(SUM(c.expected_recovery), 0) AS total_expected_recovery,
  COALESCE(SUM(c.actual_recovery), 0) AS total_actual_recovery,

  -- Recovery events created on this specific day
  (
    SELECT COUNT(*)
    FROM recovery_event re
    WHERE re.client_id = c.client_id
      AND re.created_at >= :summary_date
      AND re.created_at < :summary_date::date + INTERVAL '1 day'
      AND re.deleted_at IS NULL
  ) AS recovery_events_count,
  (
    SELECT COALESCE(SUM(re.recovery_amount), 0)
    FROM recovery_event re
    WHERE re.client_id = c.client_id
      AND re.created_at >= :summary_date
      AND re.created_at < :summary_date::date + INTERVAL '1 day'
      AND re.deleted_at IS NULL
  ) AS recovery_events_amount,

  -- Claims created on this day
  COUNT(*) FILTER (
    WHERE c.created_at >= :summary_date
    AND c.created_at < :summary_date::date + INTERVAL '1 day'
  ) AS claims_created,

  -- Claims closed on this day
  COUNT(*) FILTER (
    WHERE c.recovery_status IN ('recovered', 'closed_no_recovery')
    AND c.last_update >= :summary_date
    AND c.last_update < :summary_date::date + INTERVAL '1 day'
  ) AS claims_closed,

  -- Active claims at end of day (snapshot)
  COUNT(*) FILTER (
    WHERE c.recovery_status NOT IN ('recovered', 'closed_no_recovery')
  ) AS claims_active_eod

FROM claim c
WHERE c.client_id = :client_id
GROUP BY c.client_id

ON CONFLICT (client_id, summary_date)
DO UPDATE SET
  total_expected_recovery = EXCLUDED.total_expected_recovery,
  total_actual_recovery = EXCLUDED.total_actual_recovery,
  recovery_events_count = EXCLUDED.recovery_events_count,
  recovery_events_amount = EXCLUDED.recovery_events_amount,
  claims_created = EXCLUDED.claims_created,
  claims_closed = EXCLUDED.claims_closed,
  claims_active_eod = EXCLUDED.claims_active_eod;


-- ============================================================================
-- 1.2a DAILY RECOVERY BY DIMENSION - LINE OF BUSINESS
-- ============================================================================
-- Populates analytics.daily_recovery_by_dimension for 'line_of_business'.
--
-- Parameters:
--   - :client_id: Tenant ID
--   - :summary_date: Date to populate
-- ============================================================================

INSERT INTO analytics.daily_recovery_by_dimension (
  client_id,
  summary_date,
  dimension_type,
  dimension_value,
  claims_count,
  expected_recovery,
  actual_recovery,
  recovery_events_count,
  recovery_events_amount
)
SELECT
  c.client_id,
  :summary_date AS summary_date,
  'line_of_business' AS dimension_type,
  COALESCE(c.line_of_business, '__unspecified__') AS dimension_value,
  COUNT(*) AS claims_count,
  COALESCE(SUM(c.expected_recovery), 0) AS expected_recovery,
  COALESCE(SUM(c.actual_recovery), 0) AS actual_recovery,
  COUNT(DISTINCT re.id) AS recovery_events_count,
  COALESCE(SUM(re.recovery_amount), 0) AS recovery_events_amount
FROM claim c
LEFT JOIN recovery_event re
  ON re.claim_id = c.id
  AND re.client_id = c.client_id
  AND re.created_at >= :summary_date
  AND re.created_at < :summary_date::date + INTERVAL '1 day'
  AND re.deleted_at IS NULL
WHERE c.client_id = :client_id
GROUP BY c.client_id, c.line_of_business

ON CONFLICT (client_id, summary_date, dimension_type, dimension_value)
DO UPDATE SET
  claims_count = EXCLUDED.claims_count,
  expected_recovery = EXCLUDED.expected_recovery,
  actual_recovery = EXCLUDED.actual_recovery,
  recovery_events_count = EXCLUDED.recovery_events_count,
  recovery_events_amount = EXCLUDED.recovery_events_amount;


-- ============================================================================
-- 1.2b DAILY RECOVERY BY DIMENSION - RECOVERY STATUS
-- ============================================================================
-- Populates analytics.daily_recovery_by_dimension for 'recovery_status'.
--
-- Parameters:
--   - :client_id: Tenant ID
--   - :summary_date: Date to populate
-- ============================================================================

INSERT INTO analytics.daily_recovery_by_dimension (
  client_id,
  summary_date,
  dimension_type,
  dimension_value,
  claims_count,
  expected_recovery,
  actual_recovery,
  recovery_events_count,
  recovery_events_amount
)
SELECT
  c.client_id,
  :summary_date AS summary_date,
  'recovery_status' AS dimension_type,
  COALESCE(c.recovery_status, '__unspecified__') AS dimension_value,
  COUNT(*) AS claims_count,
  COALESCE(SUM(c.expected_recovery), 0) AS expected_recovery,
  COALESCE(SUM(c.actual_recovery), 0) AS actual_recovery,
  COUNT(DISTINCT re.id) AS recovery_events_count,
  COALESCE(SUM(re.recovery_amount), 0) AS recovery_events_amount
FROM claim c
LEFT JOIN recovery_event re
  ON re.claim_id = c.id
  AND re.client_id = c.client_id
  AND re.created_at >= :summary_date
  AND re.created_at < :summary_date::date + INTERVAL '1 day'
  AND re.deleted_at IS NULL
WHERE c.client_id = :client_id
GROUP BY c.client_id, c.recovery_status

ON CONFLICT (client_id, summary_date, dimension_type, dimension_value)
DO UPDATE SET
  claims_count = EXCLUDED.claims_count,
  expected_recovery = EXCLUDED.expected_recovery,
  actual_recovery = EXCLUDED.actual_recovery,
  recovery_events_count = EXCLUDED.recovery_events_count,
  recovery_events_amount = EXCLUDED.recovery_events_amount;


-- ============================================================================
-- 1.2c DAILY RECOVERY BY DIMENSION - SUBSTATUS
-- ============================================================================
-- Populates analytics.daily_recovery_by_dimension for 'substatus'.
--
-- Parameters:
--   - :client_id: Tenant ID
--   - :summary_date: Date to populate
-- ============================================================================

INSERT INTO analytics.daily_recovery_by_dimension (
  client_id,
  summary_date,
  dimension_type,
  dimension_value,
  claims_count,
  expected_recovery,
  actual_recovery,
  recovery_events_count,
  recovery_events_amount
)
SELECT
  c.client_id,
  :summary_date AS summary_date,
  'substatus' AS dimension_type,
  COALESCE(c.substatus, '__unspecified__') AS dimension_value,
  COUNT(*) AS claims_count,
  COALESCE(SUM(c.expected_recovery), 0) AS expected_recovery,
  COALESCE(SUM(c.actual_recovery), 0) AS actual_recovery,
  COUNT(DISTINCT re.id) AS recovery_events_count,
  COALESCE(SUM(re.recovery_amount), 0) AS recovery_events_amount
FROM claim c
LEFT JOIN recovery_event re
  ON re.claim_id = c.id
  AND re.client_id = c.client_id
  AND re.created_at >= :summary_date
  AND re.created_at < :summary_date::date + INTERVAL '1 day'
  AND re.deleted_at IS NULL
WHERE c.client_id = :client_id
GROUP BY c.client_id, c.substatus

ON CONFLICT (client_id, summary_date, dimension_type, dimension_value)
DO UPDATE SET
  claims_count = EXCLUDED.claims_count,
  expected_recovery = EXCLUDED.expected_recovery,
  actual_recovery = EXCLUDED.actual_recovery,
  recovery_events_count = EXCLUDED.recovery_events_count,
  recovery_events_amount = EXCLUDED.recovery_events_amount;


-- ============================================================================
-- 1.2d DAILY RECOVERY BY DIMENSION - RECOVERY SOURCE
-- ============================================================================
-- Populates analytics.daily_recovery_by_dimension for 'recovery_source'.
--
-- Note: expected_recovery and actual_recovery are set to 0 for this dimension
-- as they're not meaningful at the source level.
--
-- Parameters:
--   - :client_id: Tenant ID
--   - :summary_date: Date to populate
-- ============================================================================

INSERT INTO analytics.daily_recovery_by_dimension (
  client_id,
  summary_date,
  dimension_type,
  dimension_value,
  claims_count,
  expected_recovery,
  actual_recovery,
  recovery_events_count,
  recovery_events_amount
)
SELECT
  :client_id AS client_id,
  :summary_date AS summary_date,
  'recovery_source' AS dimension_type,
  COALESCE(re.recovery_source, '__unspecified__') AS dimension_value,
  COUNT(DISTINCT re.claim_id) AS claims_count,
  0 AS expected_recovery,  -- Not meaningful for source dimension
  0 AS actual_recovery,    -- Not meaningful for source dimension
  COUNT(*) AS recovery_events_count,
  COALESCE(SUM(re.recovery_amount), 0) AS recovery_events_amount
FROM recovery_event re
WHERE re.client_id = :client_id
  AND re.created_at >= :summary_date
  AND re.created_at < :summary_date::date + INTERVAL '1 day'
  AND re.deleted_at IS NULL
GROUP BY re.recovery_source

ON CONFLICT (client_id, summary_date, dimension_type, dimension_value)
DO UPDATE SET
  claims_count = EXCLUDED.claims_count,
  expected_recovery = EXCLUDED.expected_recovery,
  actual_recovery = EXCLUDED.actual_recovery,
  recovery_events_count = EXCLUDED.recovery_events_count,
  recovery_events_amount = EXCLUDED.recovery_events_amount;


-- ============================================================================
-- 1.6 DAILY WORKFLOW STAGE SNAPSHOT - REFRESH
-- ============================================================================
-- Populates analytics.daily_workflow_stage_snapshot for a single date.
--
-- This captures the state of claims at each desk location at end of day,
-- including time-in-stage metrics and SLA breach counts.
--
-- Parameters:
--   - :client_id: Tenant ID
--   - :snapshot_date: Date to populate (typically CURRENT_DATE - 1)
--
-- Dependencies:
--   - claim_desk_location_transition table must be populated
--   - workflow_definition and workflow_threshold for SLA lookups
-- ============================================================================

WITH location_sla AS (
  -- Get SLA threshold for each desk location
  SELECT DISTINCT ON (dl.id)
    dl.id AS desk_location_id,
    wt.threshold_value AS sla_hours
  FROM desk_location dl
  LEFT JOIN workflow_definition wd_specific
    ON wd_specific.desk_location_id = dl.id
    AND wd_specific.client_id = dl.client_id
    AND wd_specific.is_active = true
    AND wd_specific.deleted_at IS NULL
  LEFT JOIN workflow_definition wd_global
    ON wd_global.desk_location_id IS NULL
    AND wd_global.client_id = dl.client_id
    AND wd_global.is_active = true
    AND wd_global.deleted_at IS NULL
  LEFT JOIN workflow_threshold wt
    ON wt.workflow_definition_id = COALESCE(wd_specific.id, wd_global.id)
    AND wt.threshold_type = 'location_age'
    AND wt.is_active = true
    AND wt.deleted_at IS NULL
  WHERE dl.client_id = :client_id
    AND dl.is_active = true
    AND dl.deleted_at IS NULL
),
current_transitions AS (
  -- Get the most recent transition for each claim
  SELECT DISTINCT ON (cdlt.claim_id)
    cdlt.claim_id,
    cdlt.desk_location_id,
    cdlt.entered_at
  FROM claim_desk_location_transition cdlt
  WHERE cdlt.client_id = :client_id
    AND cdlt.deleted_at IS NULL
  ORDER BY cdlt.claim_id, cdlt.entered_at DESC
),
claim_stage_times AS (
  -- Calculate hours in stage for each active claim
  SELECT
    c.desk_location_id,
    EXTRACT(EPOCH FROM (NOW() - ct.entered_at)) / 3600 AS hours_in_stage
  FROM claim c
  INNER JOIN current_transitions ct
    ON ct.claim_id = c.id
    AND ct.desk_location_id = c.desk_location_id
  WHERE c.client_id = :client_id
    AND c.desk_location_id IS NOT NULL
    AND c.recovery_status NOT IN ('recovered', 'closed_no_recovery')
)
INSERT INTO analytics.daily_workflow_stage_snapshot (
  client_id,
  snapshot_date,
  desk_location_id,
  claims_count,
  avg_hours_in_stage,
  median_hours_in_stage,
  claims_breaching_sla
)
SELECT
  :client_id AS client_id,
  :snapshot_date AS snapshot_date,
  cst.desk_location_id,
  COUNT(*) AS claims_count,
  AVG(cst.hours_in_stage) AS avg_hours_in_stage,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cst.hours_in_stage) AS median_hours_in_stage,
  COUNT(*) FILTER (
    WHERE ls.sla_hours IS NOT NULL
    AND cst.hours_in_stage > ls.sla_hours
  ) AS claims_breaching_sla
FROM claim_stage_times cst
LEFT JOIN location_sla ls ON ls.desk_location_id = cst.desk_location_id
GROUP BY cst.desk_location_id

ON CONFLICT (client_id, snapshot_date, desk_location_id)
DO UPDATE SET
  claims_count = EXCLUDED.claims_count,
  avg_hours_in_stage = EXCLUDED.avg_hours_in_stage,
  median_hours_in_stage = EXCLUDED.median_hours_in_stage,
  claims_breaching_sla = EXCLUDED.claims_breaching_sla;


-- ============================================================================
-- NIGHTLY BATCH JOB ORCHESTRATION
-- ============================================================================
-- The nightly batch job should execute these queries in order for each client:
--
-- 1. Daily Recovery Summary
-- 2. Daily Recovery by Dimension (all 4 dimension types)
-- 3. Daily Workflow Stage Snapshot
--
-- Pseudocode for the batch job:
--
-- for each client_id in (SELECT id FROM client):
--   summary_date = CURRENT_DATE - 1
--
--   -- 1.1 Daily Recovery Summary
--   EXECUTE refresh_daily_recovery_summary(client_id, summary_date)
--
--   -- 1.2 Daily Recovery by Dimension
--   EXECUTE refresh_daily_recovery_by_lob(client_id, summary_date)
--   EXECUTE refresh_daily_recovery_by_status(client_id, summary_date)
--   EXECUTE refresh_daily_recovery_by_substatus(client_id, summary_date)
--   EXECUTE refresh_daily_recovery_by_source(client_id, summary_date)
--
--   -- 1.6 Daily Workflow Stage Snapshot
--   EXECUTE refresh_daily_workflow_stage_snapshot(client_id, summary_date)
--
-- ============================================================================


-- ============================================================================
-- BACKFILL ORCHESTRATION
-- ============================================================================
-- To backfill historical data, run the refresh queries for each date.
--
-- Pseudocode for backfill:
--
-- for each client_id in (SELECT id FROM client):
--   start_date = (SELECT MIN(created_at)::date FROM claim WHERE client_id = client_id)
--   end_date = CURRENT_DATE - 1
--
--   for each summary_date in generate_series(start_date, end_date, '1 day'):
--     EXECUTE refresh_daily_recovery_summary(client_id, summary_date)
--     EXECUTE refresh_daily_recovery_by_lob(client_id, summary_date)
--     EXECUTE refresh_daily_recovery_by_status(client_id, summary_date)
--     EXECUTE refresh_daily_recovery_by_substatus(client_id, summary_date)
--     EXECUTE refresh_daily_recovery_by_source(client_id, summary_date)
--     EXECUTE refresh_daily_workflow_stage_snapshot(client_id, summary_date)
--
-- Note: Backfill may take significant time for large date ranges.
-- Consider batching by week or month for very large datasets.
-- ============================================================================
