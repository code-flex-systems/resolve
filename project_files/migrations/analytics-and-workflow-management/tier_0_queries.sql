-- ============================================================================
-- TIER 0 QUERIES: WORKFLOW OPERATIONS (NEAR-REAL-TIME)
-- ============================================================================
-- These queries support intra-day operational decisions. They must reflect
-- current state within seconds to minutes of changes.
--
-- Refresh Strategy: Query on-demand (no pre-aggregation). React Query handles
-- caching and stale time on the frontend.
--
-- General Notes:
--   - All queries enforce tenant isolation via client_id filtering
--   - Raw numeric values returned; no rounding (frontend handles formatting)
--   - Filter parameters are shown as optional comments; implement as needed
--   - USER_DAILY_WORK_UNITS is a constant (e.g., 96 = 8 hours at 5 min/unit)
-- ============================================================================


-- ============================================================================
-- 0.1 DESK LOCATION QUEUE DEPTH
-- ============================================================================
-- Description:
--   Count of claims currently at each desk location, segmented by SLA status
--   (healthy, warning, breached). Locations without a workflow/threshold show
--   NULL for SLA metrics.
--
-- Business Use:
--   Admins need to see where work is piling up and which locations have claims
--   approaching or past SLA thresholds.
--
-- Recommended Filters:
--   - desk_location_type_id: Filter to a specific phase
--   - recovery_status: e.g., exclude closed claims
--   - line_of_business: Segment by LOB
--
-- SLA Status Derivation:
--   - healthy: hours_in_stage <= sla_hours * 0.75
--   - warning: hours_in_stage > sla_hours * 0.75 AND <= sla_hours
--   - breached: hours_in_stage > sla_hours
--
-- Staleness Tolerance: Seconds
-- ============================================================================

WITH location_sla AS (
  -- Get SLA threshold for each desk location (location-specific or global fallback)
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
  -- Get the most recent transition for each claim to determine entered_at
  SELECT DISTINCT ON (cdlt.claim_id)
    cdlt.claim_id,
    cdlt.desk_location_id,
    cdlt.entered_at
  FROM claim_desk_location_transition cdlt
  WHERE cdlt.client_id = :client_id
    AND cdlt.deleted_at IS NULL
  ORDER BY cdlt.claim_id, cdlt.entered_at DESC
),
claim_age AS (
  SELECT
    c.id AS claim_id,
    c.desk_location_id,
    EXTRACT(EPOCH FROM (NOW() - ct.entered_at)) / 3600 AS hours_in_stage
  FROM claim c
  INNER JOIN current_transitions ct
    ON ct.claim_id = c.id
    AND ct.desk_location_id = c.desk_location_id  -- Ensure transition matches current location
  WHERE c.client_id = :client_id
    AND c.desk_location_id IS NOT NULL
    -- Optional filters:
    -- AND (:recovery_status IS NULL OR c.recovery_status = :recovery_status)
    -- AND (:line_of_business IS NULL OR c.line_of_business = :line_of_business)
)
SELECT
  dl.id AS desk_location_id,
  dl.name AS desk_location_name,
  dlt.id AS desk_location_type_id,
  dlt.name AS desk_location_type_name,
  COUNT(ca.claim_id) AS total_claims,
  ls.sla_hours,
  CASE WHEN ls.sla_hours IS NOT NULL THEN
    COUNT(ca.claim_id) FILTER (WHERE ca.hours_in_stage <= ls.sla_hours * 0.75)
  END AS healthy,
  CASE WHEN ls.sla_hours IS NOT NULL THEN
    COUNT(ca.claim_id) FILTER (
      WHERE ca.hours_in_stage > ls.sla_hours * 0.75
      AND ca.hours_in_stage <= ls.sla_hours
    )
  END AS warning,
  CASE WHEN ls.sla_hours IS NOT NULL THEN
    COUNT(ca.claim_id) FILTER (WHERE ca.hours_in_stage > ls.sla_hours)
  END AS breached
FROM desk_location dl
INNER JOIN desk_location_type dlt
  ON dlt.id = dl.desk_location_type_id
  AND dlt.client_id = dl.client_id
LEFT JOIN location_sla ls ON ls.desk_location_id = dl.id
LEFT JOIN claim_age ca ON ca.desk_location_id = dl.id
WHERE dl.client_id = :client_id
  AND dl.is_active = true
  AND dl.deleted_at IS NULL
  -- Optional filter:
  -- AND (:desk_location_type_id IS NULL OR dl.desk_location_type_id = :desk_location_type_id)
GROUP BY dl.id, dl.name, dlt.id, dlt.name, ls.sla_hours
ORDER BY
  COALESCE(breached, 0) DESC,
  COALESCE(warning, 0) DESC,
  total_claims DESC;


-- ============================================================================
-- 0.2 DESK LOCATION WORK UNITS LOAD
-- ============================================================================
-- Description:
--   Sum of pending/in-progress task work units at each desk location vs.
--   configured daily capacity.
--
-- Business Use:
--   Understand which locations are overloaded or underutilized for capacity
--   planning and workload balancing.
--
-- Recommended Filters:
--   - desk_location_type_id: Filter to a specific phase
--   - is_active: Typically always true, but could toggle to see inactive
--
-- Note: Raw utilization_ratio returned (not percentage); frontend handles formatting.
--
-- Staleness Tolerance: Seconds to minutes
-- ============================================================================

SELECT
  dl.id AS desk_location_id,
  dl.name AS desk_location_name,
  dlt.id AS desk_location_type_id,
  dlt.name AS desk_location_type_name,
  dl.daily_work_units AS capacity,
  COALESCE(SUM(t.work_units) FILTER (WHERE t.status IN ('pending', 'in_progress')), 0) AS current_load,
  CASE
    WHEN dl.daily_work_units IS NOT NULL AND dl.daily_work_units > 0 THEN
      COALESCE(SUM(t.work_units) FILTER (WHERE t.status IN ('pending', 'in_progress')), 0)::numeric
      / dl.daily_work_units
    ELSE NULL
  END AS utilization_ratio
FROM desk_location dl
INNER JOIN desk_location_type dlt
  ON dlt.id = dl.desk_location_type_id
  AND dlt.client_id = dl.client_id
LEFT JOIN task t
  ON t.desk_location_id = dl.id
  AND t.client_id = dl.client_id
  AND t.status IN ('pending', 'in_progress')
WHERE dl.client_id = :client_id
  AND dl.is_active = true
  AND dl.deleted_at IS NULL
  -- Optional filter:
  -- AND (:desk_location_type_id IS NULL OR dl.desk_location_type_id = :desk_location_type_id)
GROUP BY dl.id, dl.name, dlt.id, dlt.name, dl.daily_work_units
ORDER BY utilization_ratio DESC NULLS LAST;


-- ============================================================================
-- 0.3 USER WORKLOAD & CAPACITY
-- ============================================================================
-- Description:
--   Per-user view of assigned work units (claimed tasks) vs. daily capacity,
--   plus available tasks in their assigned desk locations.
--
-- Business Use:
--   Identify overloaded or underutilized users for task reassignment.
--
-- Recommended Filters:
--   - desk_location_id: Show users assigned to a specific location
--   - role: Filter by user role if relevant
--
-- Parameter:
--   - :user_daily_work_units: Constant (e.g., 96 for 8-hour day at 5 min/unit)
--
-- Note: Raw utilization_ratio returned; frontend handles formatting.
--
-- Staleness Tolerance: Seconds to minutes
-- ============================================================================

WITH user_load AS (
  SELECT
    t.claimed_by AS user_id,
    COUNT(*) AS tasks_claimed,
    COALESCE(SUM(t.work_units), 0) AS work_units_claimed
  FROM task t
  WHERE t.client_id = :client_id
    AND t.status = 'in_progress'
    AND t.claimed_by IS NOT NULL
  GROUP BY t.claimed_by
),
user_pending AS (
  SELECT
    udl.user_id,
    COUNT(DISTINCT t.id) AS tasks_available
  FROM user_desk_location udl
  INNER JOIN task t
    ON t.desk_location_id = udl.desk_location_id
    AND t.client_id = :client_id
    AND t.status = 'pending'
    AND t.claimed_by IS NULL
  WHERE udl.removed_at IS NULL
    -- Optional filter:
    -- AND (:desk_location_id IS NULL OR udl.desk_location_id = :desk_location_id)
  GROUP BY udl.user_id
)
SELECT
  u.id AS user_id,
  u.first AS first_name,
  u.last AS last_name,
  u.role,
  :user_daily_work_units AS capacity,
  COALESCE(ul.work_units_claimed, 0) AS current_load,
  COALESCE(ul.tasks_claimed, 0) AS tasks_in_progress,
  COALESCE(up.tasks_available, 0) AS tasks_available_in_queue,
  CASE
    WHEN :user_daily_work_units > 0 THEN
      COALESCE(ul.work_units_claimed, 0)::numeric / :user_daily_work_units
    ELSE NULL
  END AS utilization_ratio
FROM users u
LEFT JOIN user_load ul ON ul.user_id = u.id
LEFT JOIN user_pending up ON up.user_id = u.id
WHERE u.client_id = :client_id
  AND u.disabled = false
  -- Optional filter:
  -- AND (:role IS NULL OR u.role = :role)
ORDER BY utilization_ratio DESC NULLS LAST;


-- ============================================================================
-- 0.4 DEADLINE STATUS OVERVIEW
-- ============================================================================
-- Description:
--   Counts of deadlines by status (overdue, due today, upcoming 7 days,
--   completed, cancelled).
--
-- Business Use:
--   Surface urgent deadlines for prioritization; calendar integration for
--   user dashboard.
--
-- Recommended Filters:
--   - deadline_type: Filter by type of deadline
--   - created_by: User-specific view
--   - claim_id: Claim-specific view
--
-- Staleness Tolerance: Minutes
-- ============================================================================

SELECT
  COUNT(*) FILTER (
    WHERE d.deadline_date < CURRENT_DATE
    AND d.status = 'pending'
  ) AS overdue,
  COUNT(*) FILTER (
    WHERE d.deadline_date = CURRENT_DATE
    AND d.status = 'pending'
  ) AS due_today,
  COUNT(*) FILTER (
    WHERE d.deadline_date > CURRENT_DATE
    AND d.deadline_date <= CURRENT_DATE + INTERVAL '7 days'
    AND d.status = 'pending'
  ) AS next_7_days,
  COUNT(*) FILTER (WHERE d.status = 'completed') AS completed,
  COUNT(*) FILTER (WHERE d.status = 'cancelled') AS cancelled
FROM deadline d
WHERE d.client_id = :client_id
  -- Optional filters:
  -- AND (:deadline_type IS NULL OR d.deadline_type = :deadline_type)
  -- AND (:created_by IS NULL OR d.created_by = :created_by)
  -- AND (:claim_id IS NULL OR d.claim_id = :claim_id)
;


-- ============================================================================
-- 0.5 CLAIMS APPROACHING SLA BREACH
-- ============================================================================
-- Description:
--   Ranked list of claims closest to (or past) SLA breach, with operational
--   context. Only includes claims at locations WITH an SLA threshold configured.
--
-- Business Use:
--   Direct input to admin decision-making: "These are the claims you should
--   prioritize or reassign right now."
--
-- Recommended Filters:
--   - desk_location_id: Focus on specific stage
--   - desk_location_type_id: Focus on specific phase
--   - recovery_status: e.g., only active claims
--
-- Note: Only returns claims where hours_remaining < sla_hours * 0.5 (warning+)
--
-- Staleness Tolerance: Minutes
-- ============================================================================

WITH location_sla AS (
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
  SELECT DISTINCT ON (cdlt.claim_id)
    cdlt.claim_id,
    cdlt.desk_location_id,
    cdlt.entered_at
  FROM claim_desk_location_transition cdlt
  WHERE cdlt.client_id = :client_id
    AND cdlt.deleted_at IS NULL
  ORDER BY cdlt.claim_id, cdlt.entered_at DESC
),
claim_sla_status AS (
  SELECT
    c.id AS claim_id,
    c.claim_number,
    c.desk_location_id,
    c.recovery_status,
    c.client_adjuster,
    dl.name AS desk_location_name,
    dl.desk_location_type_id,
    ct.entered_at AS stage_entered_at,
    ls.sla_hours,
    EXTRACT(EPOCH FROM (NOW() - ct.entered_at)) / 3600 AS hours_in_stage,
    ls.sla_hours - (EXTRACT(EPOCH FROM (NOW() - ct.entered_at)) / 3600) AS hours_remaining
  FROM claim c
  INNER JOIN current_transitions ct
    ON ct.claim_id = c.id
    AND ct.desk_location_id = c.desk_location_id
  INNER JOIN desk_location dl
    ON dl.id = c.desk_location_id
    AND dl.client_id = c.client_id
  INNER JOIN location_sla ls
    ON ls.desk_location_id = dl.id
    AND ls.sla_hours IS NOT NULL  -- Exclude locations without SLA
  WHERE c.client_id = :client_id
    AND c.desk_location_id IS NOT NULL
    AND c.recovery_status NOT IN ('closed_no_recovery', 'recovered')
    -- Optional filters:
    -- AND (:desk_location_id IS NULL OR c.desk_location_id = :desk_location_id)
    -- AND (:desk_location_type_id IS NULL OR dl.desk_location_type_id = :desk_location_type_id)
)
SELECT
  css.claim_id,
  css.claim_number,
  css.desk_location_id,
  css.desk_location_name,
  css.recovery_status,
  u.first AS adjuster_first_name,
  u.last AS adjuster_last_name,
  css.stage_entered_at,
  css.hours_in_stage,
  css.sla_hours,
  css.hours_remaining,
  CASE
    WHEN css.hours_remaining < 0 THEN 'breached'
    WHEN css.hours_remaining < css.sla_hours * 0.25 THEN 'critical'
    WHEN css.hours_remaining < css.sla_hours * 0.5 THEN 'warning'
    ELSE 'healthy'
  END AS sla_status
FROM claim_sla_status css
LEFT JOIN users u
  ON u.id = css.client_adjuster
  AND u.client_id = :client_id
WHERE css.hours_remaining < css.sla_hours * 0.5  -- Only show warning+ claims
ORDER BY css.hours_remaining ASC
LIMIT 50;


-- ============================================================================
-- 0.6 TASK THROUGHPUT (TODAY)
-- ============================================================================
-- Description:
--   Tasks completed today, with breakdown by desk location and user.
--
-- Business Use:
--   Intra-day productivity tracking; identify bottlenecks or high performers.
--
-- Recommended Filters:
--   - desk_location_id: Focus on specific stage
--   - completed_by: Specific user's throughput
--
-- Note: This is inherently "today" - for historical throughput, use Tier 1 metrics.
--
-- Staleness Tolerance: Minutes
-- ============================================================================

SELECT
  dl.id AS desk_location_id,
  dl.name AS desk_location_name,
  t.completed_by AS user_id,
  u.first AS user_first_name,
  u.last AS user_last_name,
  COUNT(*) AS tasks_completed,
  SUM(t.work_units) AS work_units_completed
FROM task t
INNER JOIN desk_location dl
  ON dl.id = t.desk_location_id
  AND dl.client_id = t.client_id
LEFT JOIN users u
  ON u.id = t.completed_by
  AND u.client_id = t.client_id
WHERE t.client_id = :client_id
  AND t.status = 'completed'
  AND t.completed_at >= CURRENT_DATE
  AND t.completed_at < CURRENT_DATE + INTERVAL '1 day'
  -- Optional filters:
  -- AND (:desk_location_id IS NULL OR t.desk_location_id = :desk_location_id)
  -- AND (:completed_by IS NULL OR t.completed_by = :completed_by)
GROUP BY dl.id, dl.name, t.completed_by, u.first, u.last
ORDER BY dl.name, work_units_completed DESC;


-- ============================================================================
-- CONFIGURATION HEALTH QUERIES
-- ============================================================================
-- These queries surface workflow configuration gaps as admin action items.
-- ============================================================================


-- ============================================================================
-- DESK LOCATIONS WITHOUT WORKFLOW DEFINITION
-- ============================================================================
-- Description:
--   Lists desk locations that have neither a location-specific workflow nor
--   a global workflow fallback. These locations cannot have SLA tracking.
--
-- Business Use:
--   Admin action item - configure workflows for these locations.
-- ============================================================================

SELECT
  dl.id AS desk_location_id,
  dl.name AS desk_location_name,
  dlt.name AS desk_location_type_name,
  dl.created_at
FROM desk_location dl
INNER JOIN desk_location_type dlt
  ON dlt.id = dl.desk_location_type_id
  AND dlt.client_id = dl.client_id
LEFT JOIN workflow_definition wd
  ON wd.desk_location_id = dl.id
  AND wd.client_id = dl.client_id
  AND wd.is_active = true
  AND wd.deleted_at IS NULL
WHERE dl.client_id = :client_id
  AND dl.is_active = true
  AND dl.deleted_at IS NULL
  AND wd.id IS NULL
  -- Also check if there's a global workflow as fallback
  AND NOT EXISTS (
    SELECT 1 FROM workflow_definition wd_global
    WHERE wd_global.client_id = dl.client_id
      AND wd_global.desk_location_id IS NULL
      AND wd_global.is_active = true
      AND wd_global.deleted_at IS NULL
  )
ORDER BY dlt.name, dl.name;


-- ============================================================================
-- WORKFLOWS WITHOUT LOCATION AGE THRESHOLD
-- ============================================================================
-- Description:
--   Lists workflows that do not have a 'location_age' threshold configured.
--   These workflows cannot drive SLA metrics.
--
-- Business Use:
--   Admin action item - add SLA thresholds to these workflows.
-- ============================================================================

SELECT
  wd.id AS workflow_definition_id,
  wd.name AS workflow_name,
  dl.name AS desk_location_name,
  CASE WHEN wd.desk_location_id IS NULL THEN 'Global' ELSE 'Location-specific' END AS workflow_scope
FROM workflow_definition wd
LEFT JOIN desk_location dl
  ON dl.id = wd.desk_location_id
  AND dl.client_id = wd.client_id
LEFT JOIN workflow_threshold wt
  ON wt.workflow_definition_id = wd.id
  AND wt.threshold_type = 'location_age'
  AND wt.is_active = true
  AND wt.deleted_at IS NULL
WHERE wd.client_id = :client_id
  AND wd.is_active = true
  AND wd.deleted_at IS NULL
  AND wt.id IS NULL
ORDER BY wd.name;


-- ============================================================================
-- DESK LOCATIONS MISSING CAPACITY CONFIGURATION
-- ============================================================================
-- Description:
--   Lists desk locations that do not have daily_work_units configured.
--   These locations cannot have capacity utilization tracking.
--
-- Business Use:
--   Admin action item - configure capacity for these locations.
-- ============================================================================

SELECT
  dl.id AS desk_location_id,
  dl.name AS desk_location_name,
  dlt.name AS desk_location_type_name
FROM desk_location dl
INNER JOIN desk_location_type dlt
  ON dlt.id = dl.desk_location_type_id
  AND dlt.client_id = dl.client_id
WHERE dl.client_id = :client_id
  AND dl.is_active = true
  AND dl.deleted_at IS NULL
  AND dl.daily_work_units IS NULL
ORDER BY dlt.name, dl.name;


-- ============================================================================
-- USERS WITHOUT DESK LOCATION ASSIGNMENTS
-- ============================================================================
-- Description:
--   Lists active users who are not assigned to any desk location.
--   These users cannot see or work on tasks.
--
-- Business Use:
--   Admin action item - assign users to desk locations.
-- ============================================================================

SELECT
  u.id AS user_id,
  u.first,
  u.last,
  u.email,
  u.role
FROM users u
LEFT JOIN user_desk_location udl
  ON udl.user_id = u.id
  AND udl.removed_at IS NULL
WHERE u.client_id = :client_id
  AND u.disabled = false
  AND udl.id IS NULL
ORDER BY u.last, u.first;


-- ============================================================================
-- RECOMMENDED INDEXES FOR TIER 0 QUERIES
-- ============================================================================

-- Claim by desk location
CREATE INDEX IF NOT EXISTS idx_claim_desk_location_client
  ON claim (client_id, desk_location_id)
  WHERE desk_location_id IS NOT NULL;

-- Latest transition per claim (for SLA calculations)
CREATE INDEX IF NOT EXISTS idx_claim_desk_location_transition_latest
  ON claim_desk_location_transition (client_id, claim_id, entered_at DESC)
  WHERE deleted_at IS NULL;

-- Workflow definition lookup by location
CREATE INDEX IF NOT EXISTS idx_workflow_definition_location_lookup
  ON workflow_definition (client_id, desk_location_id)
  WHERE is_active = true AND deleted_at IS NULL;

-- Workflow threshold lookup by type
CREATE INDEX IF NOT EXISTS idx_workflow_threshold_type
  ON workflow_threshold (workflow_definition_id, threshold_type)
  WHERE is_active = true AND deleted_at IS NULL;

-- Task lookup by desk location and status
CREATE INDEX IF NOT EXISTS idx_task_desk_location_status
  ON task (client_id, desk_location_id, status)
  WHERE status IN ('pending', 'in_progress');

-- Task lookup by claimed user
CREATE INDEX IF NOT EXISTS idx_task_claimed_by_status
  ON task (client_id, claimed_by, status)
  WHERE status = 'in_progress' AND claimed_by IS NOT NULL;

-- Pending unclaimed tasks
CREATE INDEX IF NOT EXISTS idx_task_pending_unclaimed
  ON task (client_id, desk_location_id)
  WHERE status = 'pending' AND claimed_by IS NULL;

-- Task completion lookup by date
CREATE INDEX IF NOT EXISTS idx_task_completed_today
  ON task (client_id, completed_at)
  WHERE status = 'completed';

-- Active user desk assignments
CREATE INDEX IF NOT EXISTS idx_user_desk_location_active
  ON user_desk_location (user_id, desk_location_id)
  WHERE removed_at IS NULL;

-- Deadline lookup by date and status
CREATE INDEX IF NOT EXISTS idx_deadline_date_status
  ON deadline (client_id, deadline_date, status);
