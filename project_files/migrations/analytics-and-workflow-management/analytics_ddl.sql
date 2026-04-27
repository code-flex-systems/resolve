-- ============================================================================
-- ANALYTICS SCHEMA DDL
-- ============================================================================
-- This file contains the DDL for Tier 1 analytics rollup tables.
-- These tables are populated by nightly batch jobs and support management
-- dashboards with "data through yesterday" semantics.
--
-- Schema: analytics (separate from main application schema)
--
-- Tables created:
--   1. daily_recovery_summary - Time-series recovery metrics
--   2. daily_recovery_by_dimension - Recovery metrics by LOB, status, source
--   3. daily_workflow_stage_snapshot - Stage occupancy and SLA tracking
--
-- Refresh Strategy:
--   - Nightly batch job runs after midnight
--   - Populates data for the previous day (CURRENT_DATE - 1)
--   - Uses UPSERT (ON CONFLICT DO UPDATE) for idempotency
--   - Backfill by running refresh query in a loop for historical dates
--
-- Retention:
--   - Data retained indefinitely (revisit when needed)
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS analytics;


-- ============================================================================
-- 1. DAILY RECOVERY SUMMARY
-- ============================================================================
-- Purpose:
--   Stores daily aggregated recovery metrics for time-series dashboards.
--   Shows expected vs actual recovery, variance, and claim lifecycle counts.
--
-- Use Cases:
--   - Recovery performance time-series chart
--   - QoQ comparison cards
--   - Claims opened/closed trends
--
-- Note on Metrics:
--   - total_expected_recovery / total_actual_recovery: Cumulative across all claims
--     (snapshot of claim table state at end of day)
--   - recovery_events_*: Activity that occurred ON this specific day
--   - claims_created / claims_closed: Lifecycle events on this day
--   - claims_active_eod: End-of-day snapshot of active claim count
--
-- Staleness: 24 hours. Dashboards should indicate "Data through {max date}".
-- ============================================================================

CREATE TABLE analytics.daily_recovery_summary (
  id SERIAL PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES client(id),
  summary_date DATE NOT NULL,

  -- Cumulative claim-based metrics (snapshot at end of day)
  total_expected_recovery NUMERIC NOT NULL DEFAULT 0,
  total_actual_recovery NUMERIC NOT NULL DEFAULT 0,

  -- Activity-based metrics (occurred on this day)
  recovery_events_count INTEGER NOT NULL DEFAULT 0,
  recovery_events_amount NUMERIC NOT NULL DEFAULT 0,

  -- Claim lifecycle counts
  claims_created INTEGER NOT NULL DEFAULT 0,
  claims_closed INTEGER NOT NULL DEFAULT 0,
  claims_active_eod INTEGER NOT NULL DEFAULT 0,  -- End-of-day snapshot

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_daily_recovery_summary
    UNIQUE (client_id, summary_date)
);

-- Index for time-series queries with date range filter
CREATE INDEX idx_daily_recovery_summary_date_range
  ON analytics.daily_recovery_summary (client_id, summary_date);


-- ============================================================================
-- 2. DAILY RECOVERY BY DIMENSION
-- ============================================================================
-- Purpose:
--   Stores daily recovery metrics segmented by various dimensions.
--   Enables drill-down analysis without hitting transactional tables.
--
-- Dimension Types:
--   - 'line_of_business': Recovery by LOB (auto, property, etc.)
--   - 'recovery_status': Recovery by claim status
--   - 'substatus': Recovery by granular workflow state
--   - 'recovery_source': Recovery by payment source (check, wire, EFT)
--
-- Use Cases:
--   - Recovery breakdown charts
--   - Pipeline distribution (claims by status)
--   - Top sources analysis
--
-- Note:
--   - For 'recovery_source' dimension, expected/actual_recovery are set to 0
--     as they're not meaningful at the source level
--   - NULL dimension values are stored as '__unspecified__'
--
-- Staleness: 24 hours.
-- ============================================================================

CREATE TABLE analytics.daily_recovery_by_dimension (
  id SERIAL PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES client(id),
  summary_date DATE NOT NULL,
  dimension_type TEXT NOT NULL,  -- 'line_of_business', 'recovery_status', 'substatus', 'recovery_source'
  dimension_value TEXT NOT NULL, -- Actual value or '__unspecified__' for NULL

  claims_count INTEGER NOT NULL DEFAULT 0,
  expected_recovery NUMERIC NOT NULL DEFAULT 0,
  actual_recovery NUMERIC NOT NULL DEFAULT 0,
  recovery_events_count INTEGER NOT NULL DEFAULT 0,
  recovery_events_amount NUMERIC NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_daily_recovery_by_dimension
    UNIQUE (client_id, summary_date, dimension_type, dimension_value)
);

-- Index for dimension queries with date range filter
CREATE INDEX idx_daily_recovery_by_dimension_lookup
  ON analytics.daily_recovery_by_dimension (client_id, summary_date, dimension_type);


-- ============================================================================
-- 3. DAILY WORKFLOW STAGE SNAPSHOT
-- ============================================================================
-- Purpose:
--   Captures end-of-day snapshot of claim distribution and timing across
--   workflow stages (desk locations). Enables trend analysis of workflow
--   efficiency over time.
--
-- Use Cases:
--   - Stage occupancy trends
--   - Average time-in-stage tracking
--   - SLA breach trends
--
-- Note:
--   - claims_count: Active claims at this location at end of day
--   - avg/median_hours_in_stage: For claims currently at this location
--   - claims_breaching_sla: Count of claims past their SLA threshold
--
-- Staleness: 24 hours.
-- ============================================================================

CREATE TABLE analytics.daily_workflow_stage_snapshot (
  id SERIAL PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES client(id),
  snapshot_date DATE NOT NULL,
  desk_location_id INTEGER NOT NULL,

  claims_count INTEGER NOT NULL DEFAULT 0,
  avg_hours_in_stage NUMERIC,
  median_hours_in_stage NUMERIC,
  claims_breaching_sla INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_daily_workflow_stage_snapshot
    UNIQUE (client_id, snapshot_date, desk_location_id)
);

-- Index for stage queries with date range filter
CREATE INDEX idx_daily_workflow_stage_snapshot_lookup
  ON analytics.daily_workflow_stage_snapshot (client_id, snapshot_date);

-- Index for single-location trend queries
CREATE INDEX idx_daily_workflow_stage_snapshot_location
  ON analytics.daily_workflow_stage_snapshot (client_id, desk_location_id, snapshot_date);
