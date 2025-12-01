# Workflow Management Implementation Plan

**Date:** November 21, 2025
**Status:** Planning
**Dependencies:** Phase 1 (Desk Types/Locations) ✅, Phase 2 (User Assignments) ✅

## Executive Summary

This document outlines the implementation of a **flexible, extensible workflow management system** that enables:

1. **Manual workflow management** - Admins can move claims, assign tasks, and adjust priorities
2. **Evaluation queries** - System analyzes workload and suggests actions
3. **Future automation** - Worker executes approved action patterns automatically

**Key Design Principle:** The system is built to be **generically extensible**. Task types, rule types, trigger types, and action types are defined as TypeScript enums (not database tables), with case-based logic in controllers. This allows incremental addition of new capabilities without database migrations.

## Architecture: Enum-Based Extensibility

### Why Enums Over Database Tables

Traditional approach: Store task types, rule types in database tables with foreign keys.

**Our approach:** Define types as TypeScript enums, store string values in database.

**Benefits:**
- Adding new types = add enum value + add handler logic
- No database migrations for new capabilities
- Type safety in code
- Business can request new types incrementally
- Single source of truth in code

### Example Pattern

```typescript
// In apps/web/src/config/enums.ts

// Trigger types - what causes a workflow rule to fire
export enum WorkflowTriggerType {
  MANUAL = 'manual',                    // Admin-initiated
  CLAIM_AGE = 'claim_age',              // Days since loss date
  LOCATION_AGE = 'location_age',        // Days in current desk location
  FIELD_CHANGE = 'field_change',        // Specific field updated
  TASK_COMPLETED = 'task_completed',    // Task marked complete
  // Add more as requirements emerge
}

// Action types - what happens when a rule fires
export enum WorkflowActionType {
  MOVE_CLAIM = 'move_claim',            // Move to different desk location
  CREATE_TASK = 'create_task',          // Create task for another desk
  NOTIFY_USER = 'notify_user',          // Send notification
  UPDATE_PRIORITY = 'update_priority',  // Change claim priority
  // Add more as requirements emerge
}

// Task types - categories of work that can be assigned
export enum TaskType {
  GENERIC = 'generic',                  // Catch-all for undefined types
  // Add specific types as business defines them
}
```

```typescript
// In controller - case-based execution
async function executeWorkflowAction(action: WorkflowAction, claim: Claim) {
  switch (action.actionType) {
    case WorkflowActionType.MOVE_CLAIM:
      return await moveClaimToLocation(claim, action.targetLocationId);
    case WorkflowActionType.CREATE_TASK:
      return await createTaskForClaim(claim, action.taskConfig);
    case WorkflowActionType.NOTIFY_USER:
      return await sendNotification(action.userId, action.message);
    // Add cases as new action types are implemented
    default:
      throw new Error(`Unsupported action type: ${action.actionType}`);
  }
}
```

## Implementation Phases

### Phase 3A: Task System Foundation

Tasks enable multi-desk collaboration. A claim stays with one desk (ownership) while tasks can be assigned to other desks for specific work.

**Database Schema:**

```sql
-- Task instances
CREATE TABLE task (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES client(id),

  -- What this task is for
  checklist_claim_id INTEGER NOT NULL REFERENCES checklist_claim(id),

  -- Where this task should be worked
  desk_location_id INTEGER NOT NULL REFERENCES desk_location(id),

  -- Task definition (enum value stored as string)
  task_type VARCHAR(100) NOT NULL DEFAULT 'generic',

  -- Work measurement
  work_units INTEGER NOT NULL DEFAULT 2,  -- 1 unit = 5 minutes

  -- Task details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATE,

  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, in_progress, completed, cancelled

  -- Assignment tracking
  assigned_by INTEGER NOT NULL REFERENCES "user"(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Completion tracking
  completed_by INTEGER REFERENCES "user"(id),
  completed_at TIMESTAMPTZ,

  -- Soft deletion
  cancelled_by INTEGER REFERENCES "user"(id),
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX idx_task_client_id ON task(client_id);
CREATE INDEX idx_task_claim_id ON task(checklist_claim_id);
CREATE INDEX idx_task_desk_location_id ON task(desk_location_id);
CREATE INDEX idx_task_status ON task(status) WHERE cancelled_at IS NULL;
CREATE INDEX idx_task_due_date ON task(due_date) WHERE status = 'pending';
```

**Add capacity to desk_location:**

```sql
ALTER TABLE desk_location
  ADD COLUMN daily_work_units INTEGER;  -- NULL = unlimited
```

**Backend:**
- `apps/web/src/schemas/taskSchemas.ts` - Zod validation
- `apps/web/src/api/queries/taskQueries.ts` - CRUD operations
- `apps/web/src/api/controllers/taskController.ts` - Business logic
- `apps/web/src/server/trpc/routers/task.ts` - tRPC endpoints

**Key Operations:**
- `createTask(claimId, deskLocationId, taskType, details)` - Create task
- `completeTask(taskId)` - Mark task complete
- `cancelTask(taskId, reason)` - Cancel task with reason
- `getTasksByDeskLocation(deskLocationId)` - Tasks for a desk
- `getTasksByClaim(claimId)` - Tasks for a claim
- `getTasksByUser(userId)` - Tasks user can work (via desk assignments)
- `getDeskCapacityUsage(deskLocationId, date)` - Work units used vs capacity

**UI Components:**
- `TaskCreationDialog.tsx` - Create task from claim detail
- `TaskListPanel.tsx` - View tasks for a desk or claim
- `TaskCompletionDialog.tsx` - Complete task with notes

---

### Phase 3B: Workflow Dashboard (Manual Management)

New tab under Workflow Configuration for manual workflow operations.

**Location:** `/admin/workflow-configuration/workflow-management`

**Dashboard Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Workflow Management                                        │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Claims by    │  │ Tasks by     │  │ User         │      │
│  │ Location     │  │ Location     │  │ Capacity     │      │
│  │ [Overview]   │  │ [Overview]   │  │ [Overview]   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Move Claims                              [Actions]   │   │
│  │ Select claims → Select destination → Execute        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Assign Tasks                             [Actions]   │   │
│  │ Select claim → Select desk → Create task            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Adjust Priorities                        [Actions]   │   │
│  │ Select user → Reorder priorities → Save             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Manual Action Panels:**

1. **Move Claims Panel**
   - Filter claims by current desk location, age, amount, etc.
   - Select one or more claims
   - Choose destination desk location
   - Execute move (with confirmation)
   - All moves logged to admin action log

2. **Assign Tasks Panel**
   - Search for claim
   - Select task type (from enum)
   - Select target desk location
   - Set work units, due date, description
   - Create task

3. **Adjust Priorities Panel**
   - Select user
   - View current priority assignments
   - Drag/reorder priorities
   - Save changes

4. **Workload Overview Cards**
   - Claims per desk location (bar chart or numbers)
   - Tasks pending per desk location
   - User capacity utilization

**Backend:**
- `apps/web/src/api/queries/workflowQueries.ts` - Dashboard data queries
- `apps/web/src/api/controllers/workflowController.ts` - Manual action execution
- `apps/web/src/server/trpc/routers/workflow.ts` - tRPC endpoints

**Key Operations:**
- `moveClaimToLocation(claimId, destinationLocationId)` - Move single claim
- `bulkMoveClaimsToLocation(claimIds, destinationLocationId)` - Bulk move
- `getWorkloadSummary()` - Dashboard overview data
- `getClaimsByLocation(locationId, filters)` - Claims for move selection

**UI Components:**
- `WorkflowManagementTab.tsx` - Main dashboard container
- `MoveClaimsPanel.tsx` - Claim movement interface
- `AssignTasksPanel.tsx` - Task assignment interface
- `AdjustPrioritiesPanel.tsx` - Priority management
- `WorkloadOverviewCards.tsx` - Summary statistics

---

### Phase 3C: Evaluation Queries & Suggestions

Queries that analyze workload and surface actionable suggestions to admins.

**Evaluation Query Types:**

1. **Capacity Analysis**
   - Users over threshold (e.g., >20 claims assigned)
   - Users under threshold (e.g., <5 claims assigned)
   - Configurable thresholds per desk location or globally

2. **Load Imbalance**
   - Standard deviation of claims per user within same desk
   - Identifies uneven distribution
   - Suggests rebalancing

3. **Stale Claims**
   - Claims in location longer than configurable threshold
   - Days since last activity
   - Suggests review or escalation

4. **Approaching Deadlines**
   - Claims with due dates within configurable window
   - Tasks approaching due dates
   - Prioritization suggestions

5. **Queue Prioritization**
   - User's priority 2+ queues have more work than priority 1
   - Suggests priority shuffle

**Database Schema:**

```sql
-- Configurable thresholds for evaluation queries
CREATE TABLE workflow_threshold (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES client(id),

  -- What this threshold applies to
  threshold_type VARCHAR(100) NOT NULL,  -- enum: user_capacity, location_age, etc.

  -- Scope (optional - NULL means global for client)
  desk_location_id INTEGER REFERENCES desk_location(id),
  desk_location_type_id INTEGER REFERENCES desk_location_type(id),

  -- Threshold values
  warning_value INTEGER,   -- Yellow alert
  critical_value INTEGER,  -- Red alert

  -- Active status
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INTEGER REFERENCES "user"(id),
  updated_at TIMESTAMPTZ,
  updated_by INTEGER REFERENCES "user"(id)
);

CREATE UNIQUE INDEX idx_workflow_threshold_unique
  ON workflow_threshold(client_id, threshold_type, COALESCE(desk_location_id, 0), COALESCE(desk_location_type_id, 0))
  WHERE is_active = true;
```

**Suggestion UI Pattern:**

```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️  Load Imbalance Detected                                 │
├─────────────────────────────────────────────────────────────┤
│ Desk Location: Evaluation - Transactional                   │
│                                                             │
│ User A: 25 claims                                          │
│ User B: 8 claims                                           │
│ User C: 12 claims                                          │
│                                                             │
│ Suggested Action: Move 6 claims from User A to User B      │
│                                                             │
│ [Approve] [Modify] [Dismiss]                               │
└─────────────────────────────────────────────────────────────┘
```

**Backend:**
- `apps/web/src/api/queries/evaluationQueries.ts` - Analysis queries
- `apps/web/src/api/controllers/evaluationController.ts` - Suggestion generation

**Key Operations:**
- `evaluateCapacity(clientId)` - Run capacity analysis
- `evaluateLoadBalance(clientId)` - Check distribution
- `evaluateStaleClaims(clientId)` - Find old claims
- `generateSuggestions(clientId)` - Aggregate all evaluations
- `executeSuggestion(suggestionId)` - Apply suggested action
- `dismissSuggestion(suggestionId)` - Mark as dismissed

**UI Components:**
- `SuggestionCard.tsx` - Individual suggestion display
- `SuggestionsList.tsx` - All pending suggestions
- `ThresholdConfigDialog.tsx` - Configure thresholds

---

### Phase 3D: Workflow Rules Definition

Allow admins to define rules that generate suggestions or (future) auto-execute.

**Database Schema:**

```sql
-- Workflow rules
CREATE TABLE workflow_rule (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES client(id),

  -- Rule identification
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Trigger (enum value stored as string)
  trigger_type VARCHAR(100) NOT NULL,  -- e.g., 'claim_age', 'location_age', 'field_change'

  -- Source context (optional - NULL means any)
  source_desk_location_id INTEGER REFERENCES desk_location(id),
  source_desk_location_type_id INTEGER REFERENCES desk_location_type(id),

  -- Action (enum value stored as string)
  action_type VARCHAR(100) NOT NULL,  -- e.g., 'move_claim', 'create_task', 'notify_user'

  -- Action configuration (JSON)
  action_config JSONB NOT NULL DEFAULT '{}',

  -- Conditions (JSON array)
  conditions JSONB NOT NULL DEFAULT '[]',

  -- Execution mode
  execution_mode VARCHAR(50) NOT NULL DEFAULT 'suggest',  -- 'suggest' or 'auto' (future)

  -- Priority (lower = evaluated first)
  priority INTEGER NOT NULL DEFAULT 100,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INTEGER REFERENCES "user"(id),
  updated_at TIMESTAMPTZ,
  updated_by INTEGER REFERENCES "user"(id),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_workflow_rule_client_id ON workflow_rule(client_id);
CREATE INDEX idx_workflow_rule_trigger ON workflow_rule(trigger_type) WHERE is_active = true AND deleted_at IS NULL;
CREATE INDEX idx_workflow_rule_active ON workflow_rule(is_active) WHERE deleted_at IS NULL;
```

**Condition Structure (JSON):**

```json
{
  "conditions": [
    {
      "field": "days_in_location",
      "operator": "gt",
      "value": 30
    },
    {
      "field": "claim_amount",
      "operator": "gte",
      "value": 10000
    }
  ],
  "logic": "AND"  // or "OR"
}
```

**Action Config Structure (JSON):**

```json
// For move_claim action
{
  "destination_location_id": 5
}

// For create_task action
{
  "task_type": "review_claim",
  "target_location_id": 8,
  "work_units": 2,
  "title_template": "Review stale claim {{claim_number}}"
}

// For notify_user action
{
  "user_id": 123,  // or "assignee" for dynamic
  "message_template": "Claim {{claim_number}} needs attention"
}
```

**Backend:**
- Rule CRUD operations
- Rule evaluation engine
- Condition parser and evaluator
- Action executor (case-based on action_type enum)

**UI Components:**
- `WorkflowRulesTab.tsx` - List/manage rules
- `WorkflowRuleDialog.tsx` - Create/edit rules
- `ConditionBuilder.tsx` - Build condition sets
- `RuleTestPanel.tsx` - Preview what would match

---

### Phase 3E: Contact Information (Deferred)

**Deferred until letter generation is prioritized.**

When implemented:
- Add `email`, `phone`, `fax` columns to `desk_location_type`
- UI for managing contact info
- Integration with letter generation system

---

## Implementation Order

### Sprint 1: Task Foundation
1. Database migration for `task` table
2. Add `daily_work_units` to `desk_location`
3. Task schemas, queries, controller, router
4. Task creation dialog (from claim detail)
5. Task list views (by desk, by claim)
6. Task completion workflow

### Sprint 2: Workflow Dashboard - Manual Actions
1. Dashboard layout and navigation
2. Workload overview cards (read-only stats)
3. Move Claims panel (single and bulk)
4. Assign Tasks panel
5. Adjust Priorities panel (reuse existing components)

### Sprint 3: Evaluation Queries
1. Database migration for `workflow_threshold`
2. Threshold configuration UI
3. Capacity analysis query
4. Load balance analysis query
5. Stale claims analysis query
6. Suggestion card components
7. Suggestion execution/dismissal

### Sprint 4: Workflow Rules
1. Database migration for `workflow_rule`
2. Rule CRUD operations
3. Condition parser/evaluator
4. Action executor (enum-based)
5. Rule management UI
6. Rule testing/preview

### Future: Automation Worker
- Scheduled job runs evaluation queries
- Auto-executes rules with `execution_mode = 'auto'`
- Audit logging for automated actions
- Human-in-the-loop for edge cases

---

## Files to Create

### Database Migrations
- `2025-XX-XX_add_task_system.ts`
- `2025-XX-XX_add_workflow_thresholds.ts`
- `2025-XX-XX_add_workflow_rules.ts`

### Backend
- `apps/web/src/config/enums.ts` (add workflow enums)
- `apps/web/src/schemas/taskSchemas.ts`
- `apps/web/src/schemas/workflowSchemas.ts`
- `apps/web/src/api/queries/taskQueries.ts`
- `apps/web/src/api/queries/workflowQueries.ts`
- `apps/web/src/api/queries/evaluationQueries.ts`
- `apps/web/src/api/controllers/taskController.ts`
- `apps/web/src/api/controllers/workflowController.ts`
- `apps/web/src/api/controllers/evaluationController.ts`
- `apps/web/src/server/trpc/routers/task.ts`
- `apps/web/src/server/trpc/routers/workflow.ts`

### Frontend
- `apps/web/src/hooks/trpc/useTaskTrpc.ts`
- `apps/web/src/hooks/trpc/useWorkflowTrpc.ts`
- `apps/web/src/components/admin/WorkflowManagementTab.tsx`
- `apps/web/src/components/admin/MoveClaimsPanel.tsx`
- `apps/web/src/components/admin/AssignTasksPanel.tsx`
- `apps/web/src/components/admin/AdjustPrioritiesPanel.tsx`
- `apps/web/src/components/admin/WorkloadOverviewCards.tsx`
- `apps/web/src/components/admin/SuggestionCard.tsx`
- `apps/web/src/components/admin/SuggestionsList.tsx`
- `apps/web/src/components/admin/WorkflowRulesTab.tsx`
- `apps/web/src/components/admin/WorkflowRuleDialog.tsx`
- `apps/web/src/components/common/TaskCreationDialog.tsx`
- `apps/web/src/components/common/TaskListPanel.tsx`
- `apps/web/src/components/common/TaskCompletionDialog.tsx`

---

## Key Design Decisions

1. **Enums in TypeScript, not database** - Extensibility without migrations
2. **Case-based controllers** - Add handlers as new types are defined
3. **Manual-first approach** - Build UI for manual actions, suggestions come later
4. **Configurable thresholds** - Business sets their own limits
5. **Suggest mode default** - Rules suggest actions, don't auto-execute
6. **JSON conditions** - Flexible condition definition without schema changes
7. **Letters deferred** - Complex feature saved for later

---

## Open Questions

1. **Task type details** - What specific task types does the business need? (Start with GENERIC, add as needed)

2. **Threshold defaults** - What are reasonable default thresholds for capacity, staleness, etc.?

3. **Notification mechanism** - How should notify_user action work? (Email, in-app, both?)

4. **Rule evaluation frequency** - How often should evaluation queries run for suggestions?

5. **Bulk operation limits** - Max claims to move at once? Max tasks to create?

---

## References

- `project_files/DESK_HIERARCHY_PLAN.md` - Phase 1 & 2 implementation details
- `project_files/workflow_team_correspondance.md` - Business requirements context
- `apps/web/src/config/enums.ts` - Existing enum patterns
