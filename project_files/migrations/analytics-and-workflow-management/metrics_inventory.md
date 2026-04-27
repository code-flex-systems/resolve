# Manifest Metrics & Analytics Inventory

This document provides a high-level overview of all metrics across the three-tier analytics architecture.

---

## Architecture Overview

### Tier 0: Workflow Operations (Near-Real-Time)
- **Purpose:** Support intra-day operational decisions
- **Staleness:** Seconds to minutes
- **Refresh Strategy:** Query on-demand (no pre-aggregation)
- **Caching:** Handled by React Query on the frontend

### Tier 1: Recovery & Aggregate Metrics (Daily Batch)
- **Purpose:** Management reporting, dashboards, demos
- **Staleness:** 24 hours ("data through yesterday")
- **Refresh Strategy:** Nightly batch job populates rollup tables
- **Storage:** `analytics` schema with dedicated rollup tables

### Tier 2: Client Reports (On-Demand, Real-Time)
- **Purpose:** Client-facing deliverables, audit-grade reports
- **Staleness:** None (always real-time)
- **Refresh Strategy:** Direct transactional queries at report generation time
- **Output:** Timestamped PDF/CSV artifacts

---

## Tier 0 Metrics

### 0.1 Desk Location Queue Depth
**Description:** Count of claims at each desk location, segmented by SLA status (healthy, warning, breached).

**Business Use:** Admins see where work is piling up and which locations have claims approaching SLA breach.

**Recommended Filters:** desk_location_type_id, recovery_status, line_of_business

**Notes:**
- Locations without a workflow/threshold show NULL for SLA metrics
- SLA status derived as: healthy (≤75% of threshold), warning (75-100%), breached (>100%)

---

### 0.2 Desk Location Work Units Load
**Description:** Sum of pending/in-progress task work units at each desk location vs. configured daily capacity.

**Business Use:** Identify overloaded or underutilized locations for capacity planning and workload balancing.

**Recommended Filters:** desk_location_type_id

**Notes:**
- Returns raw utilization ratio (not percentage)
- Locations without daily_work_units configured show NULL for utilization

---

### 0.3 User Workload & Capacity
**Description:** Per-user view of assigned work units (claimed tasks) vs. daily capacity, plus available tasks in their queues.

**Business Use:** Identify overloaded or underutilized users for task reassignment.

**Recommended Filters:** desk_location_id, role

**Notes:**
- Uses a flat USER_DAILY_WORK_UNITS constant (e.g., 96 = 8 hours at 5 min/unit)
- Returns raw utilization ratio

---

### 0.4 Deadline Status Overview
**Description:** Counts of deadlines by status: overdue, due today, next 7 days, completed, cancelled.

**Business Use:** Surface urgent deadlines for prioritization; calendar integration for user dashboard.

**Recommended Filters:** deadline_type, created_by, claim_id

---

### 0.5 Claims Approaching SLA Breach
**Description:** Ranked list of claims closest to (or past) SLA breach, with operational context.

**Business Use:** Direct input to admin decision-making: prioritize or reassign these claims.

**Recommended Filters:** desk_location_id, desk_location_type_id, recovery_status

**Notes:**
- Only includes claims at locations WITH an SLA threshold configured
- Returns claims where time remaining < 50% of SLA (warning, critical, breached)

---

### 0.6 Task Throughput (Today)
**Description:** Tasks completed today, with breakdown by desk location and user.

**Business Use:** Intra-day productivity tracking; identify bottlenecks or high performers.

**Recommended Filters:** desk_location_id, completed_by

**Notes:**
- Inherently scoped to "today" - for historical throughput, use Tier 1 workflow stage metrics

---

### Configuration Health Queries
These queries surface workflow configuration gaps as admin action items:

1. **Desk Locations Without Workflow Definition** - Locations with no workflow (specific or global fallback)
2. **Workflows Without Location Age Threshold** - Workflows missing SLA configuration
3. **Desk Locations Missing Capacity** - Locations without daily_work_units configured
4. **Users Without Desk Location Assignments** - Users who cannot see or work on tasks

---

## Tier 1 Metrics

### 1.1 Daily Recovery Summary
**Description:** Time-series of recovery metrics: expected/actual recovery, variance, rate, claim lifecycle counts.

**Business Use:** Main recovery dashboard chart, QoQ comparisons, trend analysis.

**Required Filters:** start_date, end_date

**Rollup Table:** `analytics.daily_recovery_summary`

**Notes:**
- Cannot filter by dimensions (LOB, status) - use 1.2 for dimension-filtered views
- Dashboard should indicate "Data through {max summary_date}"

---

### 1.2 Recovery by Dimension
**Description:** Recovery metrics segmented by dimension: line_of_business, recovery_status, substatus, recovery_source.

**Business Use:** Drill-down analysis, breakdown charts, pipeline distribution views.

**Required Filters:** start_date, end_date, dimension_type

**Optional Filters:** dimension_values (array of specific values to include)

**Rollup Table:** `analytics.daily_recovery_by_dimension`

**Notes:**
- Supports both time-series and period-total query patterns
- NULL dimension values stored as '__unspecified__'
- For recovery_source dimension, expected/actual_recovery are 0 (not meaningful)

---

### 1.3 Claims Pipeline Distribution
**Description:** Current distribution of claims by recovery_status.

**Business Use:** Pipeline health view showing claim distribution across statuses.

**Notes:**
- Uses most recent day's data from daily_recovery_by_dimension
- Served by 1.2 with dimension_type = 'recovery_status'

---

### 1.4 Time-to-Resolution Distribution
**Description:** Distribution of checklist completion times, bucketed by days (0-7, 8-14, 15-30, 31-60, 60+).

**Business Use:** Operational efficiency metric; "we close claims in X days on average."

**Required Filters:** start_date, end_date

**Optional Filters:** checklist_id

**Notes:**
- Queries transactional data (checklist_claim) - no rollup table needed
- Returns count, average, and median for each bucket

---

### 1.5 Top Performers
**Description:** Ranked lists of top claims by recovery amount and top recovery sources by amount.

**Business Use:** Leaderboards, demo highlights, understanding which segments perform best.

**Required Filters:** start_date, end_date (optional for claims, required for sources)

**Optional Filters:** limit

**Notes:**
- Queries transactional data for current state
- Returns adjuster information for claims

---

### 1.6 Workflow Stage Metrics
**Description:** Stage occupancy and timing metrics over time: claims count, avg/median hours in stage, SLA breach count.

**Business Use:** Workflow efficiency tracking, identifying stages where claims get stuck.

**Required Filters:** start_date, end_date

**Optional Filters:** desk_location_type_id, desk_location_id

**Rollup Table:** `analytics.daily_workflow_stage_snapshot`

---

## Tier 2 Reports

Tier 2 reports are on-demand, real-time queries against transactional data. They produce authoritative, timestamped artifacts for client communication and audits.

### 2.1 Claim Detail Report
**Description:** Full claim record with all related entities: parties, coverages, payments, settlements, recovery events, documents.

**Use Case:** Client deliverable, audit response, legal discovery.

**Output:** PDF/CSV with generation timestamp.

**Notes:**
- High query complexity (many joins)
- Always queries transactional tables directly

---

### 2.2 Recovery Summary Report (Client-Facing)
**Description:** Recovery performance for a client over a specified period, with claim-level detail.

**Use Case:** Monthly/quarterly client report.

**Output:** PDF/CSV with generation timestamp.

**Notes:**
- May use Tier 1 rollups as performance optimization
- Validates against transactional data for authoritative output

---

### 2.3 Settlement & Demand Tracking Report
**Description:** All settlements for a claim or portfolio, with status, amounts, and related recovery events.

**Use Case:** Negotiation tracking, financial reconciliation.

---

### 2.4 Audit Trail Report
**Description:** Full history of actions on a claim or entity.

**Use Case:** Compliance, dispute resolution, training data review.

**Source Tables:** claim_activity_logs, response_audit_logs, admin_config_logs

**Notes:**
- Low query complexity (append-only log tables)
- Can filter by claim, user, date range, action type

---

## New Tables Summary

### Workflow Management Tables
| Table | Purpose |
|-------|---------|
| `claim_desk_location_transition` | Records claim movements between desk locations (for timing/SLA calculations) |
| `workflow_definition` | Defines workflows, optionally scoped to a desk location |
| `workflow_threshold` | SLA and capacity thresholds tied to a workflow |
| `workflow_rule` | Automation rules (triggers, conditions, actions) tied to a workflow |

### Analytics Rollup Tables
| Table | Purpose | Refresh |
|-------|---------|---------|
| `analytics.daily_recovery_summary` | Time-series recovery metrics | Nightly |
| `analytics.daily_recovery_by_dimension` | Recovery metrics by LOB, status, source | Nightly |
| `analytics.daily_workflow_stage_snapshot` | Stage occupancy and SLA tracking | Nightly |

---

## Implementation Notes

### Tenant Isolation
All queries enforce client_id filtering on:
- All joins that aren't strictly FK-based
- CTEs where outer expressions make additional joins

### Performance Considerations
- Recommended indexes provided with each query
- Queries structured to leverage index scans
- Raw numeric values returned (no rounding) to preserve precision for downstream analysis

### Threshold Resolution Logic
When evaluating a claim at desk_location X:
1. Look for workflow_definition WHERE desk_location_id = X
2. If none, fall back to workflow_definition WHERE desk_location_id IS NULL (global)
3. Get thresholds from the resolved workflow

### SLA Status Derivation
- **healthy:** hours_in_stage ≤ threshold_value × 0.75
- **warning:** hours_in_stage > threshold_value × 0.75 AND ≤ threshold_value
- **critical:** hours_in_stage > threshold_value × 0.75 AND ≤ threshold_value AND hours_remaining < threshold_value × 0.25
- **breached:** hours_in_stage > threshold_value

### Backfill Strategy
For Tier 1 rollup tables:
1. Generate date series from earliest claim created_at to yesterday
2. Run each refresh query for each date in the series
3. UPSERT ensures idempotency (re-running updates existing records)

### React Query Integration
- Tier 0 queries rely on React Query for caching and stale time management
- No server-side caching layer required
- Dashboards should not display stale indicators for Tier 0 (assumed fresh)
- Tier 1 dashboards use date pickers; staleness implicit from selected range
