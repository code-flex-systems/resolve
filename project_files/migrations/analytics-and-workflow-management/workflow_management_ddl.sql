-- ============================================================================
-- WORKFLOW MANAGEMENT DDL
-- ============================================================================
-- This file contains the DDL for workflow management tables.
-- These tables support the workflow engine, SLA tracking, and rule-based
-- automation for claims moving through desk locations.
--
-- Dependencies:
--   - client(id)
--   - claim(id)
--   - desk_location(id)
--
-- Tables created:
--   1. claim_desk_location_transition - Tracks claim movements between stages
--   2. workflow_definition - Defines workflows (global or location-scoped)
--   3. workflow_threshold - SLA and capacity thresholds for workflows
--   4. workflow_rule - Automation rules (triggers, conditions, actions)
-- ============================================================================


-- ============================================================================
-- 1. CLAIM DESK LOCATION TRANSITION
-- ============================================================================
-- Records each transition event when a claim moves between desk locations.
-- This table is append-only (except for soft delete corrections).
--
-- Usage:
--   - claim.desk_location_id remains the source of truth for CURRENT location
--   - This table provides HISTORY and TIMING (entered_at for SLA calculations)
--
-- When a claim moves from Location A to Location B:
--   1. Update claim.desk_location_id = B
--   2. INSERT into this table with desk_location_id = B, previous_desk_location_id = A
--   3. Log to claim_activity_logs as usual
--
-- Backfill strategy for existing claims:
--   INSERT one record per claim with entered_at = claim.created_at,
--   previous_desk_location_id = NULL
-- ============================================================================

CREATE TABLE claim_desk_location_transition (
  id SERIAL PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES client(id),
  claim_id INTEGER NOT NULL REFERENCES claim(id),

  -- The desk location the claim moved TO
  desk_location_id INTEGER NOT NULL REFERENCES desk_location(id),

  -- When the claim entered this location
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Context
  entered_by TEXT,  -- User ID who moved it (NULL if system/feed)
  entered_reason TEXT,  -- Optional note on why claim moved

  -- Previous location (for easy history traversal, NULL for initial placement)
  previous_desk_location_id INTEGER REFERENCES desk_location(id),

  -- Soft delete (for data corrections only, not normal workflow)
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Get the most recent transition for a claim (current stage entry time)
-- Used by: SLA calculations, time-in-stage metrics
CREATE INDEX idx_claim_desk_location_transition_latest
  ON claim_desk_location_transition (client_id, claim_id, entered_at DESC)
  WHERE deleted_at IS NULL;

-- Get all claims that entered a location within a time range
-- Used by: Location occupancy queries, throughput metrics
CREATE INDEX idx_claim_desk_location_transition_location
  ON claim_desk_location_transition (client_id, desk_location_id, entered_at)
  WHERE deleted_at IS NULL;

-- Full history for a specific claim
-- Used by: Claim detail views, audit trails
CREATE INDEX idx_claim_desk_location_transition_claim_history
  ON claim_desk_location_transition (claim_id, entered_at DESC)
  WHERE deleted_at IS NULL;


-- ============================================================================
-- 2. WORKFLOW DEFINITION
-- ============================================================================
-- Defines a workflow configuration. Workflows can be:
--   - Location-specific: desk_location_id is set, applies only to that location
--   - Global: desk_location_id is NULL, applies as fallback for all locations
--
-- Resolution logic when evaluating a claim at desk_location X:
--   1. Look for workflow_definition WHERE desk_location_id = X
--   2. If none found, fall back to workflow_definition WHERE desk_location_id IS NULL
--   3. Get thresholds/rules from the resolved workflow
--
-- Constraints:
--   - Only one active workflow per desk location
--   - Only one active global workflow per client
-- ============================================================================

CREATE TABLE workflow_definition (
  id SERIAL PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES client(id),

  -- Identification
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Scope (NULL = global workflow applying to locations without specific workflow)
  desk_location_id INTEGER REFERENCES desk_location(id),

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT,
  updated_at TIMESTAMPTZ,
  updated_by TEXT,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT
);

-- Ensure only one active workflow per desk location
CREATE UNIQUE INDEX idx_workflow_definition_location
  ON workflow_definition (client_id, desk_location_id)
  WHERE is_active = true AND deleted_at IS NULL AND desk_location_id IS NOT NULL;

-- Ensure only one active global workflow per client
CREATE UNIQUE INDEX idx_workflow_definition_global
  ON workflow_definition (client_id)
  WHERE desk_location_id IS NULL AND is_active = true AND deleted_at IS NULL;

-- Lookup index for SLA resolution queries
CREATE INDEX idx_workflow_definition_location_lookup
  ON workflow_definition (client_id, desk_location_id)
  WHERE is_active = true AND deleted_at IS NULL;


-- ============================================================================
-- 3. WORKFLOW THRESHOLD
-- ============================================================================
-- Configurable thresholds tied to a workflow definition.
--
-- Threshold types (stored as string, defined as TypeScript enum):
--   - 'location_age': Hours a claim can stay in a location before SLA breach
--   - 'user_capacity': Max claims/work units per user (future)
--   - Additional types can be added without schema changes
--
-- SLA status derivation (in application/queries):
--   - healthy: hours_in_stage <= threshold_value * 0.75
--   - warning: hours_in_stage > threshold_value * 0.75 AND <= threshold_value
--   - breached: hours_in_stage > threshold_value
-- ============================================================================

CREATE TABLE workflow_threshold (
  id SERIAL PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES client(id),

  -- Parent workflow
  workflow_definition_id INTEGER NOT NULL REFERENCES workflow_definition(id),

  -- Threshold type (enum stored as string)
  threshold_type VARCHAR(100) NOT NULL,  -- 'location_age', 'user_capacity', etc.

  -- Single threshold value (e.g., hours for SLA, count for capacity)
  threshold_value INTEGER NOT NULL,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT,
  updated_at TIMESTAMPTZ,
  updated_by TEXT,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT
);

-- One active threshold per type per workflow
CREATE UNIQUE INDEX idx_workflow_threshold_unique
  ON workflow_threshold (workflow_definition_id, threshold_type)
  WHERE is_active = true AND deleted_at IS NULL;

-- Lookup by workflow and type
CREATE INDEX idx_workflow_threshold_type
  ON workflow_threshold (workflow_definition_id, threshold_type)
  WHERE is_active = true AND deleted_at IS NULL;


-- ============================================================================
-- 4. WORKFLOW RULE
-- ============================================================================
-- Automation rules tied to a workflow definition.
--
-- Structure:
--   - trigger_type: What causes the rule to evaluate (enum as string)
--   - conditions: JSON array of conditions that must be met
--   - action_type: What happens when rule fires (enum as string)
--   - action_config: JSON configuration for the action
--   - execution_mode: 'suggest' (show to admin) or 'auto' (execute automatically)
--
-- Trigger types (examples):
--   - 'location_age': Claim has been in location for X time
--   - 'field_change': Specific field was updated
--   - 'task_completed': A task was marked complete
--   - 'manual': Admin-initiated
--
-- Action types (examples):
--   - 'move_claim': Move claim to different desk location
--   - 'create_task': Create a task for a desk location
--   - 'notify_user': Send notification
--   - 'update_priority': Change claim priority
--
-- Condition structure (JSON):
--   {
--     "conditions": [
--       { "field": "days_in_location", "operator": "gt", "value": 30 },
--       { "field": "claim_amount", "operator": "gte", "value": 10000 }
--     ],
--     "logic": "AND"  -- or "OR"
--   }
--
-- Action config examples:
--   move_claim: { "destination_location_id": 5 }
--   create_task: { "task_type": "review", "target_location_id": 8, "work_units": 2 }
--   notify_user: { "user_id": 123, "message_template": "Claim {{claim_number}} needs attention" }
-- ============================================================================

CREATE TABLE workflow_rule (
  id SERIAL PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES client(id),

  -- Parent workflow
  workflow_definition_id INTEGER NOT NULL REFERENCES workflow_definition(id),

  -- Rule identification
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Trigger (enum value stored as string)
  trigger_type VARCHAR(100) NOT NULL,

  -- Action (enum value stored as string)
  action_type VARCHAR(100) NOT NULL,

  -- Configuration (JSON)
  action_config JSONB NOT NULL DEFAULT '{}',
  conditions JSONB NOT NULL DEFAULT '[]',

  -- Execution mode: 'suggest' shows to admin, 'auto' executes automatically (future)
  execution_mode VARCHAR(50) NOT NULL DEFAULT 'suggest',

  -- Priority (lower number = evaluated first)
  priority INTEGER NOT NULL DEFAULT 100,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT,
  updated_at TIMESTAMPTZ,
  updated_by TEXT,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT
);

-- Rules for a specific workflow
CREATE INDEX idx_workflow_rule_workflow
  ON workflow_rule (workflow_definition_id)
  WHERE is_active = true AND deleted_at IS NULL;

-- Rules by trigger type (for event-driven evaluation)
CREATE INDEX idx_workflow_rule_trigger
  ON workflow_rule (client_id, trigger_type)
  WHERE is_active = true AND deleted_at IS NULL;
