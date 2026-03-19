# Workflow Management Implementation Plan

**Date:** November 21, 2025
**Last assessed:** March 18, 2026
**Status:** In Progress
**Dependencies:** Phase 1 (Desk Types/Locations) ✅, Phase 2 (User Assignments) ✅

## Executive Summary

This document outlines the implementation of a **flexible, extensible workflow management system** that enables:

1. **Manual workflow management** - Admins can move claims, assign tasks, and adjust priorities
2. **Evaluation queries** - System analyzes workload and suggests actions
3. **Future automation** - Worker executes approved action patterns automatically

**Key Design Principle:** The system is built to be **generically extensible**. Task types, rule types, trigger types, and action types are defined as TypeScript enums (not database tables), with case-based logic in controllers. This allows incremental addition of new capabilities without database migrations.

---

## Implementation Status Summary

| Phase | Status | Key Gaps |
|---|---|---|
| 3A: Task System | ✅ Complete | — |
| 3B: Workflow Dashboard | ⚠️ Partial | Manual action panels (Move Claims, Assign Tasks, Adjust Priorities) |
| 3C: Evaluation & Suggestions | ✅ Mostly Complete | Stale claims by activity (beyond SLA) |
| 3D: Workflow Rules | ⚠️ Partial | Rule execution engine, rule testing/preview |
| 3E: Contact Information | ⏸️ Deferred | Intentionally deferred |
| Analytics (unplanned) | ✅ Complete | Added beyond original scope |
| Workflow Config UI (unplanned) | ✅ Complete | Added beyond original scope |

---

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
// In controller - case-based execution (NOT YET IMPLEMENTED)
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

### Phase 3A: Task System Foundation ✅ COMPLETE

Tasks enable multi-desk collaboration. A claim stays with one desk (ownership) while tasks can be assigned to other desks for specific work.

**What was built:**

- **3 migrations:**
  - `2025-11-21_180000_add_task_system.ts` — task table with deadline integration
  - `2025-11-24_210639_simplify_task_schema.ts` — removed inline deadline fields
  - `2026-01-30_012259_add_capacity_threshold_rename_task_fields.ts` — capacity threshold, renamed assigned_by→assigned_to, claimed_by→started_by
- **`daily_work_units` and `capacity_threshold`** added to desk_location
- **Backend:** `taskSchemas.ts`, `taskQueries.ts` (15+ functions), `taskController.ts`, `task.ts` router
- **Frontend:** `useTaskTrpc.ts` hook, `taskUtils.tsx` (type configs/icons), enums (TaskStatus, DerivedTaskStatus, TaskType with 9 values)
- **UI Components:**
  - `TaskListPanel.tsx` — task list with status, type, assignment, action buttons
  - `TaskCreationDialog.tsx` — create with desk location, type, deadline
  - `TaskCompletionDialog.tsx` — complete with notes
  - `TaskCancellationDialog.tsx` — cancel with reason
  - `TasksTab.tsx` — admin weekly view with metrics, filtering, bulk cancellation
  - `TaskBulkCancellationDialog.tsx`, `TaskMetrics.tsx`
- **Tests:** 5 test files (integration tests for queries and controller)
- **Features:** Full lifecycle (pending→in_progress→completed/cancelled), desk-based routing, capacity management, deadline integration, authorization, admin logging

---

### Phase 3B: Workflow Dashboard (Manual Management) ⚠️ PARTIAL

New tab under Workflow Configuration for manual workflow operations.

**Location:** `/admin/workflow-management/dashboard`

**What was built:**
- ✅ Dashboard layout — `WorkflowManagementDashboard.tsx` with 4 metric cards (Total Workload, Team Capacity, Daily Throughput, Open Work Units)
- ✅ `SuggestionsPanel.tsx` integrated into dashboard
- ✅ `workflowQueries.ts` — Full CRUD for definitions, thresholds, rules, resolution logic
- ✅ `workflowController.ts` — Wraps queries in transactions with audit logging
- ✅ `workflow.ts` router — All definition/threshold/rule endpoints

**What remains:**
- ❌ **Move Claims Panel** — Filter/select claims, choose destination desk location, execute move (single and bulk)
- ❌ **Assign Tasks Panel** — Search claim, select task type/desk/work units, create task
- ❌ **Adjust Priorities Panel** — Select user, view/reorder priorities, save (suggestion execution partially covers this)
- ❌ **`moveClaimToLocation()`** and **`bulkMoveClaimsToLocation()`** backend operations

**Original dashboard layout design:**
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

---

### Phase 3C: Evaluation Queries & Suggestions ✅ MOSTLY COMPLETE

Queries that analyze workload and surface actionable suggestions to admins.

**What was built (organized differently than planned — combined into analytics files):**
- ✅ `workflow_threshold` table (part of `add_workflow_management` migration)
- ✅ `workflow_suggestion` table (dedicated `add_workflow_suggestion_table` migration with status lifecycle, expiration, partial unique index)
- ✅ Threshold configuration UI — `WorkflowThresholdDialog.tsx` in workflow detail panel
- ✅ Capacity analysis — `getDeskLocationQueueDepth()`, `getUserWorkloadAndCapacity()`
- ✅ Load balance analysis — Suggestion algorithm with breach detection and severity scoring (`lib/workflow/suggestions.ts`, 713 lines)
- ✅ SLA breach detection — `getClaimsApproachingSLABreach()` with hours-remaining ordering
- ✅ Suggestion UI — `SuggestionCard.tsx`, `SuggestionDetailDialog.tsx`, `SuggestionsPanel.tsx`
- ✅ Suggestion execution — Execute single, execute all, ignore, hide with cascade-safe priority reassignment
- ✅ Configuration health checks — 4 validation checks (missing workflows, thresholds, capacity, user assignments)
- ✅ Analytics infrastructure — `workflowAnalyticsQueries.ts` (Tier 0 real-time + Tier 1 time-series), `workflowAnalyticsController.ts`, `workflowAnalytics.ts` router, `useWorkflowAnalyticsTrpc.ts` hook

**File organization note:** The plan called for separate `evaluationQueries.ts` and `evaluationController.ts` files, but evaluation logic was combined into `workflowAnalyticsQueries.ts`, `workflowAnalyticsController.ts`, and `lib/workflow/suggestions.ts`.

**What remains:**
- ❌ Stale claims by activity — "Days since last activity" analysis (beyond SLA-based staleness)

---

### Phase 3D: Workflow Rules Definition ⚠️ PARTIAL

Allow admins to define rules that generate suggestions or (future) auto-execute.

**What was built:**
- ✅ `workflow_rule` table (part of `add_workflow_management` migration) with JSONB action_config and conditions
- ✅ Rule CRUD — Full create/update/archive in queries, controller, router
- ✅ Condition parser/evaluator — `lib/workflow/ruleConditions.ts` (887 lines) with 12+ fields, operators, validation, SQL generation helpers
- ✅ Rule management UI — `WorkflowRuleDialog.tsx` with condition builder, `RuleCard.tsx` for display
- ✅ Rule configuration — trigger types, action types, execution modes, priority ordering

**What remains:**
- ❌ **Rule execution engine** — The `executeWorkflowAction()` switch-case handler that actually runs actions (move_claim, create_task, notify_user, update_priority) when rules fire
- ❌ **Rule testing/preview** — Dry-run capability to see what claims would match a rule before activating it

**Condition Structure (JSON) — implemented:**
```json
{
  "conditions": [
    { "field": "days_in_location", "operator": "gt", "value": 30 },
    { "field": "claim_amount", "operator": "gte", "value": 10000 }
  ],
  "logic": "AND"
}
```

**Action Config Structure (JSON) — schema implemented, execution not:**
```json
// move_claim
{ "destination_location_id": 5 }

// create_task
{ "task_type": "review_claim", "target_location_id": 8, "work_units": 2, "title_template": "Review stale claim {{claim_number}}" }

// notify_user
{ "user_id": 123, "message_template": "Claim {{claim_number}} needs attention" }
```

---

### Phase 3E: Contact Information ⏸️ DEFERRED

**Deferred until letter generation is prioritized.**

When implemented:
- Add `email`, `phone`, `fax` columns to `desk_location_type`
- UI for managing contact info
- Integration with letter generation system

---

### Analytics Infrastructure (Added Beyond Original Plan) ✅ COMPLETE

Built as a complement to the evaluation system:
- `analytics` schema with `daily_workflow_stage_snapshot` table
- Nightly snapshot refresh with backfill capability (`workflowAnalyticsRefreshQueries.ts`)
- Tier 0 real-time queries: queue depth, workload, user capacity, SLA breach, throughput, deadline overview
- Tier 1 time-series analytics with date range filtering
- `workflowAnalytics.ts` router with full endpoint coverage
- `useWorkflowAnalyticsTrpc.ts` hook

### Workflow Configuration UI (Added Beyond Original Plan) ✅ COMPLETE

- `WorkflowsView.tsx` — two-panel layout (workflow list + detail)
- `WorkflowDefinitionFormDialog.tsx` — create global or location-scoped workflows
- `WorkflowDetailPanel.tsx` — view/edit with thresholds and rules sections
- `WorkflowThresholdDialog.tsx`, `WorkflowRuleDialog.tsx`, `RuleCard.tsx`
- Route at `/admin/workflow-configuration/workflows`
- Format utilities in `lib/utils/workflowUtils.tsx`
- Configuration explanations in `config/workflowExplanations.ts`

---

## Remaining Work

### High Priority
1. **Manual action panels (Phase 3B)** — Move Claims, Assign Tasks, Adjust Priorities panels for the workflow dashboard, including `moveClaimToLocation()` and `bulkMoveClaimsToLocation()` backend operations
2. **Rule execution engine (Phase 3D)** — The switch-case action executor that runs rule actions (move_claim, create_task, notify_user, update_priority) when triggered

### Medium Priority
3. **Rule testing/preview (Phase 3D)** — Dry-run capability to see what claims would match a rule
4. **Stale claims by activity (Phase 3C)** — "Days since last activity" analysis beyond SLA-based staleness

### Low Priority / Future
5. **Automation worker** — Scheduled job to auto-execute rules with `execution_mode = 'auto'`, audit logging, human-in-the-loop for edge cases
6. **Contact information (Phase 3E)** — Deferred until letter generation is prioritized

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

1. **Notification mechanism** - How should notify_user action work? (Email, in-app, both?)
2. **Rule evaluation frequency** - How often should evaluation queries run for suggestions?
3. **Bulk operation limits** - Max claims to move at once? Max tasks to create?

---

## Key Files Reference

### Database
- `apps/web/src/api/database/migrations/2025-11-21_180000_add_task_system.ts`
- `apps/web/src/api/database/migrations/2025-11-24_210639_simplify_task_schema.ts`
- `apps/web/src/api/database/migrations/2026-01-28_*_add_workflow_management.ts`
- `apps/web/src/api/database/migrations/2026-01-28_*_add_workflow_analytics_schema.ts`
- `apps/web/src/api/database/migrations/2026-01-30_*_add_capacity_threshold_rename_task_fields.ts`
- `apps/web/src/api/database/migrations/2026-02-03_*_add_workflow_suggestion_table.ts`

### Backend
- `apps/web/src/config/enums.ts` — All workflow/task enums
- `apps/web/src/schemas/taskSchemas.ts`, `workflowSchemas.ts`, `workflowAnalyticsSchemas.ts`
- `apps/web/src/api/queries/taskQueries.ts`, `workflowQueries.ts`, `workflowAnalyticsQueries.ts`, `workflowAnalyticsRefreshQueries.ts`
- `apps/web/src/api/controllers/taskController.ts`, `workflowController.ts`, `workflowAnalyticsController.ts`
- `apps/web/src/server/trpc/routers/task.ts`, `workflow.ts`, `workflowAnalytics.ts`

### Frontend
- `apps/web/src/hooks/trpc/useTaskTrpc.ts`, `useWorkflowTrpc.ts`, `useWorkflowAnalyticsTrpc.ts`
- `apps/web/src/lib/workflow/suggestions.ts`, `ruleConditions.ts`
- `apps/web/src/lib/utils/taskUtils.tsx`, `workflowUtils.tsx`
- `apps/web/src/config/workflowExplanations.ts`
- `apps/web/src/components/common/Task*.tsx` (4 components)
- `apps/web/src/components/admin/TasksTab.tsx`, `TaskBulkCancellationDialog.tsx`, `TaskMetrics.tsx`
- `apps/web/src/components/admin/Workflow*.tsx`, `SuggestionCard.tsx`, `SuggestionDetailDialog.tsx`, `SuggestionsPanel.tsx`, `RuleCard.tsx`

### Tests
- `apps/web/src/api/queries/__tests__/taskQueries.*.test.ts` (4 files)
- `apps/web/src/api/controllers/__tests__/taskController.integration.test.ts`

---

## References

- `project_files/DESK_HIERARCHY_PLAN.md` - Phase 1 & 2 implementation details
- `project_files/workflow_team_correspondance.md` - Business requirements context
- `apps/web/src/config/enums.ts` - Existing enum patterns
