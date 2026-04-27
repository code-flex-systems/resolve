-- ============================================================================
-- TIER 1 DASHBOARD QUERIES: RECOVERY & AGGREGATE METRICS
-- ============================================================================
-- These queries read from the analytics rollup tables to serve management
-- dashboards. They represent "a day's work" with 24-hour staleness tolerance.
--
-- Rollup tables are populated by nightly batch jobs (see tier_1_refresh_queries.sql).
--
-- General Notes:
--   - All queries enforce tenant isolation via client_id filtering
--   - Date range filters (start_date, end_date) are typically required
--   - Raw numeric values returned; frontend handles formatting
-- ============================================================================


-- ============================================================================
-- 1.1 DAILY RECOVERY SUMMARY - TIME SERIES
-- ============================================================================
-- Description:
--   Recovery metrics over time for the time-series dashboard chart.
--   Shows expected/actual recovery, variance, rate, and claim lifecycle.
--
-- Business Use:
--   Main recovery dashboard chart with QoQ comparisons.
--
-- Required Filters:
--   - start_date: Beginning of date range
--   - end_date: End of date range
--
-- Note on Additional Filters:
--   Because this is a pre-aggregated rollup, we cannot filter by dimensions
--   like recovery_status or line_of_business. For dimension-filtered metrics,
--   use the daily_recovery_by_dimension queries (1.2).
--
-- Staleness Tolerance: 24 hours. Display "Data through {max summary_date}".
-- ============================================================================

SELECT
  drs.summary_date,
  drs.total_expected_recovery,
  drs.total_actual_recovery,
  drs.total_actual_recovery - drs.total_expected_recovery AS variance,
  CASE
    WHEN drs.total_expected_recovery > 0 THEN
      drs.total_actual_recovery / drs.total_expected_recovery
    ELSE NULL
  END AS recovery_rate,
  drs.recovery_events_count,
  drs.recovery_events_amount,
  drs.claims_created,
  drs.claims_closed,
  drs.claims_active_eod
FROM analytics.daily_recovery_summary drs
WHERE drs.client_id = :client_id
  AND drs.summary_date >= :start_date
  AND drs.summary_date <= :end_date
ORDER BY drs.summary_date ASC;


-- ============================================================================
-- 1.2a RECOVERY BY DIMENSION - TIME SERIES
-- ============================================================================
-- Description:
--   Recovery metrics segmented by a dimension over time.
--   Enables drill-down analysis by LOB, status, source, etc.
--
-- Business Use:
--   Breakdown charts showing recovery performance by segment.
--
-- Required Filters:
--   - start_date: Beginning of date range
--   - end_date: End of date range
--   - dimension_type: Which dimension to analyze
--     ('line_of_business', 'recovery_status', 'substatus', 'recovery_source')
--
-- Optional Filters:
--   - dimension_values: Array of specific values to include
--
-- Staleness Tolerance: 24 hours.
-- ============================================================================

SELECT
  drbd.summary_date,
  drbd.dimension_value,
  SUM(drbd.claims_count) AS claims_count,
  SUM(drbd.expected_recovery) AS expected_recovery,
  SUM(drbd.actual_recovery) AS actual_recovery,
  SUM(drbd.recovery_events_count) AS recovery_events_count,
  SUM(drbd.recovery_events_amount) AS recovery_events_amount
FROM analytics.daily_recovery_by_dimension drbd
WHERE drbd.client_id = :client_id
  AND drbd.dimension_type = :dimension_type
  AND drbd.summary_date >= :start_date
  AND drbd.summary_date <= :end_date
  -- Optional: filter to specific dimension values
  -- AND (:dimension_values IS NULL OR drbd.dimension_value = ANY(:dimension_values))
GROUP BY drbd.summary_date, drbd.dimension_value
ORDER BY drbd.summary_date ASC, SUM(drbd.recovery_events_amount) DESC;


-- ============================================================================
-- 1.2b RECOVERY BY DIMENSION - PERIOD TOTALS
-- ============================================================================
-- Description:
--   Aggregated recovery metrics by dimension for a date range.
--   No time-series breakdown, just totals per dimension value.
--
-- Business Use:
--   Summary cards, pie charts, or tables showing breakdown by segment.
--
-- Required Filters:
--   - start_date: Beginning of date range
--   - end_date: End of date range
--   - dimension_type: Which dimension to analyze
--
-- Staleness Tolerance: 24 hours.
-- ============================================================================

SELECT
  drbd.dimension_value,
  SUM(drbd.claims_count) AS claims_count,
  SUM(drbd.expected_recovery) AS expected_recovery,
  SUM(drbd.actual_recovery) AS actual_recovery,
  SUM(drbd.recovery_events_count) AS recovery_events_count,
  SUM(drbd.recovery_events_amount) AS recovery_events_amount
FROM analytics.daily_recovery_by_dimension drbd
WHERE drbd.client_id = :client_id
  AND drbd.dimension_type = :dimension_type
  AND drbd.summary_date >= :start_date
  AND drbd.summary_date <= :end_date
GROUP BY drbd.dimension_value
ORDER BY SUM(drbd.recovery_events_amount) DESC;


-- ============================================================================
-- 1.3 CLAIMS PIPELINE DISTRIBUTION (CURRENT STATE)
-- ============================================================================
-- Description:
--   Current distribution of claims by recovery_status.
--   Uses the most recent day's snapshot from the dimension table.
--
-- Business Use:
--   Pipeline health view showing claim distribution across statuses.
--
-- Note: Uses most recent summary_date to show "current" distribution.
--
-- Staleness Tolerance: 24 hours.
-- ============================================================================

SELECT
  drbd.dimension_value AS status,
  SUM(drbd.claims_count) AS claims_count
FROM analytics.daily_recovery_by_dimension drbd
WHERE drbd.client_id = :client_id
  AND drbd.dimension_type = 'recovery_status'
  AND drbd.summary_date = (
    SELECT MAX(summary_date)
    FROM analytics.daily_recovery_by_dimension
    WHERE client_id = :client_id
      AND dimension_type = 'recovery_status'
  )
GROUP BY drbd.dimension_value
ORDER BY SUM(drbd.claims_count) DESC;


-- ============================================================================
-- 1.4 TIME-TO-RESOLUTION DISTRIBUTION
-- ============================================================================
-- Description:
--   Distribution of checklist completion times, bucketed by days.
--   This query hits transactional data (checklist_claim) since the rollup
--   table doesn't capture resolution time distribution.
--
-- Business Use:
--   Operational efficiency metric; "we close claims in X days on average".
--
-- Required Filters:
--   - start_date: Beginning of date range (submitted_at)
--   - end_date: End of date range (submitted_at)
--
-- Optional Filters:
--   - checklist_id: Filter to specific checklist type
--
-- Staleness Tolerance: Can run on-demand (transactional query).
-- ============================================================================

SELECT
  CASE
    WHEN cc.time_to_resolution_days <= 7 THEN '0-7 days'
    WHEN cc.time_to_resolution_days <= 14 THEN '8-14 days'
    WHEN cc.time_to_resolution_days <= 30 THEN '15-30 days'
    WHEN cc.time_to_resolution_days <= 60 THEN '31-60 days'
    ELSE '60+ days'
  END AS resolution_bucket,
  COUNT(*) AS claims_count,
  AVG(cc.time_to_resolution_days) AS avg_days,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cc.time_to_resolution_days) AS median_days
FROM checklist_claim cc
WHERE cc.client_id = :client_id
  AND cc.status = 'submitted'
  AND cc.submitted_at >= :start_date
  AND cc.submitted_at < :end_date + INTERVAL '1 day'
  -- Optional filter:
  -- AND (:checklist_id IS NULL OR cc.checklist_id = :checklist_id)
GROUP BY 1
ORDER BY MIN(cc.time_to_resolution_days);


-- ============================================================================
-- 1.5a TOP CLAIMS BY RECOVERY AMOUNT
-- ============================================================================
-- Description:
--   Ranked list of claims with highest actual recovery.
--   Hits transactional data for current claim state.
--
-- Business Use:
--   Leaderboard, demo highlights, top performers view.
--
-- Optional Filters:
--   - start_date / end_date: Filter to claims with recovery events in range
--   - limit: Number of results (default 10)
--
-- Staleness Tolerance: Can run on-demand (transactional query).
-- ============================================================================

SELECT
  c.id AS claim_id,
  c.claim_number,
  c.actual_recovery,
  c.expected_recovery,
  c.line_of_business,
  u.first AS adjuster_first_name,
  u.last AS adjuster_last_name
FROM claim c
LEFT JOIN users u
  ON u.id = c.client_adjuster
  AND u.client_id = c.client_id
WHERE c.client_id = :client_id
  AND c.actual_recovery > 0
  -- Optional: filter to claims with recovery events in date range
  -- AND EXISTS (
  --   SELECT 1 FROM recovery_event re
  --   WHERE re.claim_id = c.id
  --     AND re.client_id = c.client_id
  --     AND re.created_at >= :start_date
  --     AND re.created_at < :end_date + INTERVAL '1 day'
  --     AND re.deleted_at IS NULL
  -- )
ORDER BY c.actual_recovery DESC
LIMIT COALESCE(:limit, 10);


-- ============================================================================
-- 1.5b TOP RECOVERY SOURCES BY AMOUNT
-- ============================================================================
-- Description:
--   Ranked list of recovery sources (check, wire, EFT) by total amount.
--   Hits transactional data with date filter.
--
-- Business Use:
--   Top performers view, understanding which payment methods yield most recovery.
--
-- Required Filters:
--   - start_date: Beginning of date range
--   - end_date: End of date range
--
-- Optional Filters:
--   - limit: Number of results (default 10)
--
-- Staleness Tolerance: Can run on-demand (transactional query).
-- ============================================================================

SELECT
  COALESCE(re.recovery_source, '__unspecified__') AS recovery_source,
  COUNT(*) AS event_count,
  SUM(re.recovery_amount) AS total_amount
FROM recovery_event re
WHERE re.client_id = :client_id
  AND re.deleted_at IS NULL
  AND re.created_at >= :start_date
  AND re.created_at < :end_date + INTERVAL '1 day'
GROUP BY re.recovery_source
ORDER BY SUM(re.recovery_amount) DESC
LIMIT COALESCE(:limit, 10);


-- ============================================================================
-- 1.6 WORKFLOW STAGE METRICS - TIME SERIES
-- ============================================================================
-- Description:
--   Stage occupancy and SLA metrics over time.
--   Shows how claims flow through workflow stages.
--
-- Business Use:
--   Workflow efficiency tracking, identifying stages where claims get stuck.
--
-- Required Filters:
--   - start_date: Beginning of date range
--   - end_date: End of date range
--
-- Optional Filters:
--   - desk_location_type_id: Filter to specific phase
--   - desk_location_id: Filter to specific stage
--
-- Staleness Tolerance: 24 hours.
-- ============================================================================

SELECT
  dwss.snapshot_date,
  dl.id AS desk_location_id,
  dl.name AS desk_location_name,
  dlt.id AS desk_location_type_id,
  dlt.name AS desk_location_type_name,
  dwss.claims_count,
  dwss.avg_hours_in_stage,
  dwss.median_hours_in_stage,
  dwss.claims_breaching_sla
FROM analytics.daily_workflow_stage_snapshot dwss
INNER JOIN desk_location dl
  ON dl.id = dwss.desk_location_id
  AND dl.client_id = dwss.client_id
INNER JOIN desk_location_type dlt
  ON dlt.id = dl.desk_location_type_id
  AND dlt.client_id = dl.client_id
WHERE dwss.client_id = :client_id
  AND dwss.snapshot_date >= :start_date
  AND dwss.snapshot_date <= :end_date
  -- Optional filters:
  -- AND (:desk_location_type_id IS NULL OR dlt.id = :desk_location_type_id)
  -- AND (:desk_location_id IS NULL OR dl.id = :desk_location_id)
ORDER BY dwss.snapshot_date ASC, dlt.name, dl.name;

-- ============================================================================
-- 1.7 PERIOD WORKFLOW SUMMARY (with comparison)
-- ============================================================================
-- Description:
--   Top-level workflow stats for a period with comparison to prior period.
--   Supports day, week, or month periods. Includes absolute change and
--   percent change calculations ready for direct UI consumption.
--
-- Parameters:
--   - :client_id: Tenant ID
--   - :period_end: End date of current period (typically CURRENT_DATE - 1 for yesterday)
--   - :period_days: Number of days in period (7 for week, 30 for month, 1 for day)
--
-- Returns:
--   Single row with current period stats, previous period stats, absolute
--   change, and percent change. Percent change is NULL when previous = 0.
--
-- Staleness: 24 hours (uses analytics rollup tables)
-- ============================================================================

WITH period_bounds AS (
  SELECT
    :period_end::date AS current_end,
    (:period_end::date - :period_days + 1) AS current_start,
    (:period_end::date - :period_days) AS previous_end,
    (:period_end::date - :period_days * 2 + 1) AS previous_start
),
current_recovery AS (
  SELECT
    COALESCE(SUM(drs.claims_closed), 0) AS claims_closed,
    COALESCE(SUM(drs.claims_created), 0) AS claims_created
  FROM analytics.daily_recovery_summary drs
  CROSS JOIN period_bounds pb
  WHERE drs.client_id = :client_id
    AND drs.summary_date >= pb.current_start
    AND drs.summary_date <= pb.current_end
),
previous_recovery AS (
  SELECT
    COALESCE(SUM(drs.claims_closed), 0) AS claims_closed,
    COALESCE(SUM(drs.claims_created), 0) AS claims_created
  FROM analytics.daily_recovery_summary drs
  CROSS JOIN period_bounds pb
  WHERE drs.client_id = :client_id
    AND drs.summary_date >= pb.previous_start
    AND drs.summary_date <= pb.previous_end
),
current_workflow AS (
  SELECT
    COALESCE(SUM(dwss.claims_breaching_sla), 0) AS total_sla_breaches,
    COALESCE(SUM(dwss.claims_count), 0) AS total_claim_days,
    AVG(dwss.avg_hours_in_stage) AS period_avg_hours_in_stage,
    COUNT(DISTINCT dwss.desk_location_id) AS locations_tracked
  FROM analytics.daily_workflow_stage_snapshot dwss
  CROSS JOIN period_bounds pb
  WHERE dwss.client_id = :client_id
    AND dwss.snapshot_date >= pb.current_start
    AND dwss.snapshot_date <= pb.current_end
),
previous_workflow AS (
  SELECT
    COALESCE(SUM(dwss.claims_breaching_sla), 0) AS total_sla_breaches,
    COALESCE(SUM(dwss.claims_count), 0) AS total_claim_days,
    AVG(dwss.avg_hours_in_stage) AS period_avg_hours_in_stage
  FROM analytics.daily_workflow_stage_snapshot dwss
  CROSS JOIN period_bounds pb
  WHERE dwss.client_id = :client_id
    AND dwss.snapshot_date >= pb.previous_start
    AND dwss.snapshot_date <= pb.previous_end
)
SELECT
  -- Period metadata
  pb.current_start,
  pb.current_end,
  pb.previous_start,
  pb.previous_end,
  :period_days AS period_days,

  -- Claims closed: current, previous, absolute change, percent change
  cr.claims_closed AS current_claims_closed,
  pr.claims_closed AS previous_claims_closed,
  cr.claims_closed - pr.claims_closed AS claims_closed_change,
  CASE
    WHEN pr.claims_closed = 0 THEN NULL
    ELSE (cr.claims_closed - pr.claims_closed)::NUMERIC / pr.claims_closed
  END AS claims_closed_change_pct,

  -- SLA breaches: current, previous, absolute change, percent change
  cw.total_sla_breaches AS current_sla_breaches,
  pw.total_sla_breaches AS previous_sla_breaches,
  cw.total_sla_breaches - pw.total_sla_breaches AS sla_breaches_change,
  CASE
    WHEN pw.total_sla_breaches = 0 THEN NULL
    ELSE (cw.total_sla_breaches - pw.total_sla_breaches)::NUMERIC / pw.total_sla_breaches
  END AS sla_breaches_change_pct,

  -- Additional stats (available for future use)
  cr.claims_created AS current_claims_created,
  pr.claims_created AS previous_claims_created,
  cw.total_claim_days AS current_total_claim_days,
  pw.total_claim_days AS previous_total_claim_days,
  cw.period_avg_hours_in_stage AS current_avg_hours_in_stage,
  pw.period_avg_hours_in_stage AS previous_avg_hours_in_stage,
  cw.locations_tracked

FROM period_bounds pb
CROSS JOIN current_recovery cr
CROSS JOIN previous_recovery pr
CROSS JOIN current_workflow cw
CROSS JOIN previous_workflow pw;


-- ============================================================================
-- RECOMMENDED INDEXES FOR TIER 1 QUERIES
-- ============================================================================
-- Note: Most indexes are on the analytics tables (created in analytics_ddl.sql).
-- These are additional indexes on transactional tables used by on-demand queries.
-- ============================================================================

-- Recovery event lookup by date (for top sources query)
CREATE INDEX IF NOT EXISTS idx_recovery_event_created
  ON recovery_event (client_id, created_at)
  WHERE deleted_at IS NULL;

-- Checklist claim submission lookup (for time-to-resolution query)
CREATE INDEX IF NOT EXISTS idx_checklist_claim_submitted
  ON checklist_claim (client_id, submitted_at)
  WHERE status = 'submitted';
