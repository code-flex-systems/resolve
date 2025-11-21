# Desk Hierarchy Implementation Plan

**Date:** November 20, 2025 (Revised after team correspondence - workflow routing model)
**Status:** Planning - Architecture Revised
**Target Release:** Hanover MVP

## Executive Summary

This document outlines the implementation of a **workflow-based desk location routing system** for claims management based on clarified requirements from the business team. The system routes claims through different workflow phases, with work queues at each phase that multiple users can collaborate on.

**CRITICAL UNDERSTANDING - WORKFLOW ROUTING WITH COLLABORATIVE POOLS:**

This is a **workflow automation system** where claims move through phases:

**Three-Tier Structure:**
1. **Desk Location Type** = Workflow phase/stage (e.g., "Evaluation", "Adverse Coverage Verification", "Pursuit of Recovery")
   - Primary purpose: Provides contact information (email, phone, fax) for letter generation
   - Represents which stage of the process the work is in
   - Does NOT directly contain users

2. **Desk Location** = Work queue within a phase (e.g., "Evaluation - Transactional", "Adverse Coverage - Request for Information")
   - This is where claims actually sit and wait to be worked
   - Multiple users are assigned TO each desk location
   - Users pull work from their assigned desk location queues

3. **User-Desk Location Assignment** (future phase) = Which queues a user has access to, in priority order

**Claim Routing:**
- Claims MOVE between desk locations as workflow progresses
- Automatic routing: Jon completes Evaluation → system moves claim to Adverse Coverage Verification
- Manual reassignment: Jane reassigns claim within same phase to "Request for Information"

**Collaborative Work Within Queues:**
- Multiple users assigned to same desk location see the same work pool
- No exclusive claiming - any assigned user can work any claim in the queue
- The `assignee` field tracks who is currently working (audit trail), NOT exclusive ownership
- Jane can start answering questions, save partial work; Mike can complete it later

**ARCHITECTURE: OPTIONAL ADD-ON, NOT REPLACEMENT**

The desk hierarchy is an **optional advanced feature** controlled by a feature flag. Direct user assignment (admin assigns claim to specific user) remains the foundation and is **always available**, regardless of feature flag state. When the feature flag is enabled, desk location assignment becomes available as an additional option, allowing both modes to coexist.

**Use Cases:**
- **Direct Assignment (always available):** Complex claim needs Jane specifically—she's the expert
- **Desk Location Assignment (when flag enabled):** Standard workflow claim routed through phases—any trained user at that phase can handle it

## Real-World Example: Claim ABC123's Journey

This example from the team illustrates how the workflow routing system works:

**1. Initial Assignment:**
- Claim ABC123 enters the system
- Assigned to **Desk Type:** "Evaluation" + **Desk Location:** "Evaluation - Transactional"
- User Jon Doe (assigned to "Evaluation - Transactional") receives the claim to work

**2. Automatic Workflow Routing:**
- Jon completes his portion of the evaluation
- **Workflow automatically moves** the claim to:
  - **Desk Type:** "Adverse Coverage Verification"
  - **Desk Location:** "Adverse Coverage Verification - Transactional"
- User Jane Doe (assigned to "Adverse Coverage Verification - Transactional") receives the claim

**3. Manual Reassignment Within Phase:**
- During her review, Jane determines she cannot verify coverage without additional information
- Jane generates a letter requesting information
  - **Letter includes contact information from the "Adverse Coverage Verification" desk type** (email, phone, fax)
  - This ensures responses are directed back to the correct workflow phase
- Jane **manually reassigns** the claim within same phase to:
  - **Desk Type:** "Adverse Coverage Verification" (same)
  - **Desk Location:** "Adverse Coverage Verification - Request for Information" (different queue)
- Claim remains in this location until the necessary information is obtained

**Key Takeaways:**
- Desk Type provides contact information for each workflow phase
- Claims move between locations as they progress through the workflow
- Users assigned to a desk location can work any claim in that queue
- Both automatic (workflow) and manual (user-initiated) routing are supported

## Phase 1 vs Future Phases

### ✅ Phase 1: Basic Structure (COMPLETED - November 2025)

**What We Built:**
- Database tables for `desk_location_type` and `desk_location` with soft deletion
- Added `desk_location_id` column to `checklist_claim` table
- Backend CRUD operations for types and locations (queries, controller, router)
- Archive/Restore functionality (soft deletion pattern)
- tRPC router with Admin-only access and proper authorization
- Frontend hooks (`useDeskTrpc`) with cache invalidation
- Admin UI at `/admin/workflow-configuration/desk-locations`
  - Master-detail layout (types → locations)
  - Edit/Archive/Restore actions for both types and locations
  - Inactive locations shown with greyed-out styling
  - No pagination (finite lists expected)
  - Row highlighting for selected desk type
- Feature flag (`FEATURE_DESK_HIERARCHY`)
- Suggested default locations when creating a type (Pending, Transactional, Closed, etc.)
- Admin action logging for all operations

**What Phase 1 Enables:**
- Admins can create Desk Location Types (workflow phases)
- Admins can create Desk Locations within types (work queues)
- Admins can edit, archive, and restore types and locations
- Archive enforcement: Cannot archive type until all locations are archived
- Archive enforcement: Cannot archive location if claims are assigned
- Admin can manually assign claims to desk locations (basic routing - future)
- Foundation for Phase 2 user assignments

**Implementation Notes:**
- Used soft deletion instead of permanent deletion for audit trail preservation
- Simplified UI design: no search bars or pagination (finite lists expected)
- Action cells follow `PartyActionsCell` pattern for consistency
- Both dialogs support create and edit modes
- Inactive locations remain visible but greyed out

**What Phase 1 Does NOT Include:**
- ❌ Contact information fields (email, phone, fax) on desk types (Phase 3)
- ❌ User-desk location assignments (who can see which queues) (Phase 2)
- ❌ Priority ordering system (Phase 2)
- ❌ Collaborative work pools (multi-user access to same queue) (Phase 2)
- ❌ Automatic workflow routing (Phase 3)
- ❌ Manual claim reassignment between locations (Phase 3)
- ❌ "My Queue" view showing desk location work (Phase 2)
- ❌ Authorization updates for desk-based access (Phase 2)

### 🔄 Phase 2: User Assignments & Priorities (Next)

**Additions:**
- `user_desk_location` junction table with priority field
- UI for assigning users to desk locations (1-5 priorities)
- User work queue showing claims from their assigned desks
- Priority-based work display
- Collaborative access (multiple users see same pool)
- Authorization middleware updates

### 🔄 Phase 3: Workflow Routing (Future)

**Additions:**
- Contact information fields on `desk_location_type`
- Automatic routing rules (claim moves when phase complete)
- Manual reassignment UI (user/admin moves claim to different location)
- Workflow configuration interface
- Letter generation integration (using contact info)

### 🔄 Phase 4: Advanced Features (Future)

**Potential Additions:**
- Desk location capacity limits
- Load balancing across users
- Analytics and reporting
- Simplified single-tier model (if Type tier proves unnecessary)

**Key Architectural Decisions:**

- **Direct Assignment is Core** - Existing `assignee` field always functional, never replaced
- **Desk Hierarchy is Add-On** - Feature flag (`FEATURE_DESK_HIERARCHY`) controls advanced features
- **Both Modes Coexist** - When flag enabled, admins choose per claim: assign to user OR assign to desk location
- **Two-Level Hierarchy** - Desk Location Type (workflow phase) → Desk Location (work queue)
- **Contact Information Management** - Desk Location Type stores contact details for letter generation at each phase
- **Workflow Routing** - Claims move between desk locations automatically (workflow) or manually (user-initiated)
- **Many-to-Many User-Location Relationship** - Users assigned to multiple desk locations via priority-ordered junction table
- **Priority-Based Work Display** - System shows work from priority 1 location first, fallback to lower priorities
- **Role-Based Management** - Creating types/locations restricted by role (typically BA/IT)
- **Default Desk Locations** - System suggests common locations when creating new type
- **Possible Future Simplification** - Team suggests eliminating Type tier and using naming convention instead (e.g., "Evaluation - Transactional")

## Implementation Status

**Phase 1: ✅ COMPLETED (November 2025)**
- All basic structure components implemented and tested
- Ready for Phase 2: User Assignments

**Phase 2: 🔄 PENDING**
- Awaiting business prioritization

**Phase 3: 🔄 PENDING**
- Awaiting Phase 2 completion

## Current State

### Assignment Architecture

**Database:** `checklist_claim` table with `assignee` field (references `user.id`)

**Authorization:**
- Contributors can only modify responses where they are the current assignee
- Contributors can comment where they are assignee OR created_by (ownership)

**Visibility Rules (Contributors):**
Claims are visible if they fall into one of these buckets:
1. **Owned by them** - They created/worked this claim (`checklist_claim.created_by`)
2. **Assigned to them** - Current assignee (`checklist_claim.assignee`)
3. **Not assigned/worked** - No entry in `checklist_claim` table for this claim+checklist combination

**UI Components:**
- `ClaimAssignmentDialog.tsx` - Manual assignment to users
- `ChecklistHandoffDialog.tsx` - Transfer claims between users
- `middleware/requireAssigned.ts` - Authorization enforcement

## Assignment Architecture: Foundation + Add-On

### Foundation: Direct User Assignment (Always Available)

**Current system that works today and will continue to work:**

```sql
checklist_claim {
  id: 1,
  assignee: 123,           -- Directly assigned to Jane
  desk_location_id: NULL
}
```

**Workflow:**
1. Admin opens claim
2. Clicks "Assign to User"
3. Selects Jane from dropdown
4. Claim appears in Jane's "My Work" queue
5. Jane works the claim

**This NEVER goes away, regardless of feature flag.**

### Add-On: Desk Location Assignment (Feature Flag Controlled)

**New optional system when `ENABLE_DESK_HIERARCHY=true`:**

```sql
checklist_claim {
  id: 2,
  assignee: 123,           -- Jane is currently working on it (optional)
  desk_location_id: 5      -- Assigned to "Pending" desk
}

user_desk_location {
  user_id: 123,            -- Jane has access
  desk_location_id: 5,     -- To "Pending" location
  priority: 1              -- As her priority 1 work
}
```

**Workflow (Team-Based Work Pools):**
1. Admin opens claim
2. Chooses "Assign to Desk Location" (new option)
3. Selects "Claims Processing → Pending"
4. Claim appears in work queue for all users assigned to that desk
5. Jane opens the claim and starts answering checklist questions
6. System sets `assignee = 123` to track who is currently working
7. Jane saves partial work (some questions unanswered)
8. Claim **remains assigned to desk** (`desk_location_id = 5`)
9. Mike from same desk opens the claim and completes remaining questions
10. System tracks both Jane and Mike worked on it (audit trail)
11. Claim stays with desk until admin moves it or checklist submitted

**Key Difference:** Work doesn't get "claimed" exclusively. Multiple team members can contribute. The desk assignment persists.

### Both Modes Coexist

**When feature flag is ON, a single claim can be in various states:**

| State | assignee | desk_location_id | Meaning | Where Visible |
|-------|----------|------------------|---------|---------------|
| Direct assignment only | 123 (Jane) | NULL | Jane owns this exclusively | Jane's work queue only |
| Desk pool (unworked) | NULL | 5 (Pending) | Available to desk team, no one working yet | All users on Pending desk |
| Desk pool (being worked) | 123 (Jane) | 5 (Pending) | Jane currently working, but others can too | All users on Pending desk |
| Unassigned | NULL | NULL | Not assigned anywhere yet | Admin only |

**Business Rules:**
- `assignee` tracks **who is currently working** on desk-assigned work (audit/tracking purpose)
- `desk_location_id` determines **which team owns** the work
- Both fields CAN coexist when work is assigned to a desk and someone is actively working it
- Direct assignment (assignee only, no desk) means exclusive ownership
- Desk assignment (with or without assignee) means shared team access

### Query Pattern: Conditional OR Logic

**Getting user's work queue:**

```typescript
function getUserWork(userId: number, ctx: ProtectedContext) {
  const ENABLE_DESK_HIERARCHY = process.env.ENABLE_DESK_HIERARCHY === 'true';

  let query = ctx.db
    .selectFrom('checklist_claim')
    .where((eb) => eb.or([
      // ALWAYS get direct assignments (foundation) - exclusive ownership
      eb.and([
        eb('checklist_claim.assignee', '=', userId),
        eb('checklist_claim.desk_location_id', 'is', null)  // Only direct, not desk
      ]),

      // IF feature flag enabled, ADDITIONALLY get desk location work
      ...(ENABLE_DESK_HIERARCHY ? [
        // Claim is assigned to a desk location user has access to
        // (regardless of who is currently working it - team-based access)
        eb('checklist_claim.desk_location_id', 'in',
          ctx.db.selectFrom('user_desk_location')
            .select('desk_location_id')
            .where('user_id', '=', userId)
            .where('removed_at', 'is', null)
        )
      ] : [])
    ]));

  return query.execute();
}
```

**Result:**
- Flag OFF: User only sees their directly assigned claims (exclusive)
- Flag ON: User sees their directly assigned claims + ALL work assigned to their desks (shared)

**Key Insight:** With desk hierarchy enabled, users see desk work even if someone else is currently working it (`assignee` is set to another user). This enables collaborative work where multiple team members can contribute to answering checklist questions.

## Team Requirements (from correspondence)

### Hierarchy Structure

**Desk Location Type → Desk Location**

**Desk Location Type = Workflow Phase/Stage:**
- Represents which phase of the process the work is in
- **Primary Purpose:** Stores contact information (email, phone, fax) for letter generation
- Examples: "Evaluation", "Adverse Coverage Verification", "Pursuit of Recovery"
- Does NOT contain users directly

**Desk Location = Work Queue Within a Phase:**
- Represents the pool of work from which users receive inventory
- This is where claims actually sit and wait to be worked
- Users are assigned TO desk locations to receive work
- Examples: "Evaluation - Transactional", "Adverse Coverage Verification - Request for Information", "Evaluation - Closed"

### User-Location Associations

- Users can be associated with **multiple desk locations** across various desk location types
- Associations are **fluid** and can change day-to-day based on workflow needs
- Users are assigned desk locations in **priority order** (currently up to 5 priorities)
- System ensures user always receives work without searching:
  - If work runs out on 1st-priority desk location, automatically shift to 2nd priority
  - If new work becomes available in higher-priority location, that becomes next task

### Management & Permissions

- **Creating Types/Locations:** Role-based capability, typically assigned to BA or IT (must maintain flexibility)
- **Assigning Users:** Managers or anyone with appropriate role can associate users with desk locations
- **Standard Locations:** System should present default set when creating new Desk Location Type, with option to activate/deactivate/leave dormant

## Database Schema

### New Table: `desk_location_type`

Represents a workflow phase/stage. **Primary purpose:** Stores contact information for letter generation at each phase.

```sql
CREATE TABLE desk_location_type (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES client(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  -- Contact information for letter generation
  email VARCHAR(255),        -- Contact email for this workflow phase
  phone VARCHAR(50),         -- Contact phone for this workflow phase
  fax VARCHAR(50),           -- Contact fax for this workflow phase
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INTEGER REFERENCES "user"(id),
  updated_at TIMESTAMPTZ,
  updated_by INTEGER REFERENCES "user"(id),
  deleted_at TIMESTAMPTZ,

  UNIQUE(client_id, name) WHERE deleted_at IS NULL
);

CREATE INDEX idx_desk_location_type_client_id ON desk_location_type(client_id);
CREATE INDEX idx_desk_location_type_deleted_at ON desk_location_type(deleted_at);
```

**Purpose:**
- Represents which phase of the workflow the claim is in
- Provides contact information that prints on system-generated letters
- Groups related desk locations together

**Common Examples:**
- "Evaluation" (initial review phase)
- "Adverse Coverage Verification" (verification phase)
- "Pursuit of Recovery" (recovery phase)
- "Litigation" (legal action phase)

### New Table: `desk_location`

Work queues within a workflow phase. This is where claims actually sit and wait to be worked.

```sql
CREATE TABLE desk_location (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES client(id),
  desk_location_type_id INTEGER NOT NULL REFERENCES desk_location_type(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true, -- Allow activate/deactivate
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INTEGER REFERENCES "user"(id),
  updated_at TIMESTAMPTZ,
  updated_by INTEGER REFERENCES "user"(id),
  deleted_at TIMESTAMPTZ,

  UNIQUE(client_id, desk_location_type_id, name) WHERE deleted_at IS NULL
);

CREATE INDEX idx_desk_location_client_id ON desk_location(client_id);
CREATE INDEX idx_desk_location_type_id ON desk_location(desk_location_type_id);
CREATE INDEX idx_desk_location_active ON desk_location(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_desk_location_deleted_at ON desk_location(deleted_at);
```

**Purpose:**
- Represents a specific work queue within a workflow phase
- Claims are routed to desk locations by workflow automation
- Users are assigned to desk locations to receive work
- Multiple users can be assigned to same desk location (collaborative pool)

**Common Examples:**
- "Transactional" (standard processing queue)
- "Request for Information" (waiting for external data)
- "Pending" (not yet started)
- "Closed" (completed at this phase)
- "Complex Review" (requires special attention)

### New Table: `user_desk_location`

Junction table implementing many-to-many relationship with priority ordering.

```sql
CREATE TABLE user_desk_location (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id),
  desk_location_id INTEGER NOT NULL REFERENCES desk_location(id),
  priority INTEGER NOT NULL CHECK (priority >= 1 AND priority <= 5), -- Max 5 priorities
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by INTEGER REFERENCES "user"(id),
  removed_at TIMESTAMPTZ,
  removed_by INTEGER REFERENCES "user"(id),

  -- Prevent duplicate associations
  UNIQUE(user_id, desk_location_id) WHERE removed_at IS NULL,

  -- Prevent duplicate priorities for same user
  UNIQUE(user_id, priority) WHERE removed_at IS NULL
);

CREATE INDEX idx_user_desk_location_user_id ON user_desk_location(user_id);
CREATE INDEX idx_user_desk_location_desk_location_id ON user_desk_location(desk_location_id);
CREATE INDEX idx_user_desk_location_priority ON user_desk_location(user_id, priority) WHERE removed_at IS NULL;
```

**Key Features:**
- Supports up to 5 priority levels per user
- Soft deletion via `removed_at` (maintains audit trail)
- Unique constraints prevent conflicts

### New Table: `desk_location_template`

Predefined set of common desk locations to suggest when creating new type.

```sql
CREATE TABLE desk_location_template (
  id SERIAL PRIMARY KEY,
  template_name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  is_system_default BOOLEAN NOT NULL DEFAULT false, -- Built-in templates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INTEGER REFERENCES "user"(id)
);

-- Seed data
INSERT INTO desk_location_template (template_name, is_system_default) VALUES
  ('Pending', true),
  ('Transactional', true),
  ('Closed', true),
  ('Complex Review', true),
  ('Expedited', true),
  ('On Hold', true),
  ('Needs Documentation', true),
  ('Ready for Approval', true);
```

### Updated Table: `checklist_claim`

Add desk location assignment capability.

```sql
-- Add new column (nullable to support gradual migration)
ALTER TABLE checklist_claim
  ADD COLUMN desk_location_id INTEGER REFERENCES desk_location(id);

-- Index for query performance
CREATE INDEX idx_checklist_claim_desk_location_id ON checklist_claim(desk_location_id);

-- Business rules (enforced at application layer):
-- 1. If desk_location_id is NULL, assignee tracks direct assignment (exclusive ownership)
-- 2. If desk_location_id is set, assignee tracks current worker (audit/tracking, NOT exclusive)
-- 3. Both fields CAN coexist for desk-assigned work being actively worked
```

## Assignment & Routing Logic

### Two Assignment Modes (Both Coexist When Flag Enabled)

When `FEATURE_DESK_HIERARCHY=true`, admins choose which assignment mode to use **per claim**:

#### 1. Direct User Assignment (Always Available)
- `assignee = user_id`, `desk_location_id = NULL`
- Admin selects specific user from dropdown
- Claim appears **only** in that user's work queue (exclusive ownership)
- No team collaboration - only assigned user can work it
- Claim does NOT move through workflow phases automatically
- **Use when:** Specific expertise required, VIP client, complex case needs expert handling

#### 2. Desk Location Assignment (Feature Flag Enabled)
- `desk_location_id = location_id`, `assignee = NULL` initially
- Admin (or workflow automation) routes claim to a desk location within a workflow phase
- Claim appears in work queue for **all users** assigned to that desk location
- Multiple team members can contribute to the work
- When user opens claim, system sets `assignee = user_id` to track who's working
- `assignee` field acts as audit trail, not exclusive lock
- Other team members can still open and contribute (collaborative workflow)
- **Claim moves between desk locations** as workflow progresses (automatic or manual)
- **Use when:** Standard workflow claim that should route through phases

**Both options available in same assignment dialog when flag is ON.**

### Claim Movement Between Desk Locations

Claims assigned to desk locations can move in two ways:

#### Automatic Workflow Routing (Future Phase)
When a user completes their portion of the work at one phase:
- Workflow engine automatically moves claim to next phase's desk location
- Example: Jon completes "Evaluation - Transactional" → System routes to "Adverse Coverage Verification - Transactional"
- New user (Jane) assigned to destination desk location receives the claim

**Implementation Note:** Workflow routing rules to be defined in future phase. Could be triggered by:
- Checklist submission at a desk location
- Specific question responses (e.g., "Coverage verified? Yes")
- Admin-configured routing rules per desk location

#### Manual Reassignment (Future Phase)
User or admin can manually move claim to different desk location:
- **Within same phase:** Jane moves claim from "Adverse Coverage - Transactional" to "Adverse Coverage - Request for Information"
- **Across phases:** Admin escalates claim from "Evaluation" to "Litigation"

**Use cases:**
- Claim needs additional information (move to "Request for Information")
- Claim requires special handling (move to "Complex Review")
- Process exception (skip a phase, jump back to previous phase)

### Priority-Based Work Display

**Algorithm:**

1. User opens their work queue
2. System queries for all desk work in priority order:
   ```sql
   SELECT c.*, udl.priority
   FROM checklist_claim c
   JOIN user_desk_location udl ON c.desk_location_id = udl.desk_location_id
   WHERE udl.user_id = ?
     AND udl.removed_at IS NULL
   ORDER BY udl.priority ASC, c.created_at ASC;
   ```
3. UI groups/sorts claims by desk location priority
4. User opens any claim and starts working (no claiming step)
5. System sets `assignee = user_id` when user opens claim (tracking only)
6. Claim **remains in desk queue** - other team members can still work it

**Key Features:**
- **Automatic Fallback:** If priority 1 location is empty, user sees priority 2 work
- **Priority Promotion:** If new work arrives in priority 1, it appears at top of queue
- **No Manual Search:** User doesn't need to hunt for work
- **Team Visibility:** All desk members see the same work pool

### Collaborative Work Process

**UI Flow (Team-Based Work):**

1. User views their work queue showing claims from all their desk locations
2. List shows ALL desk work (not just unclaimed), ordered by desk priority
3. User opens a claim to view/edit checklist
4. System sets `assignee = user_id` to track current worker
5. User answers some questions, saves partial work
6. Claim remains in desk queue with Jane listed as "last worked by"
7. Another team member (Mike) opens same claim
8. System updates `assignee = mike_id` and tracks both contributors
9. Mike completes remaining questions
10. Audit trail shows both Jane and Mike worked on it

**No Exclusive Claiming:** Work stays with the desk. Multiple people can contribute.

### Visibility Logic (Contributors)

Updated visibility rules to include desk location assignments:

```typescript
// User can see a claim if ANY of these conditions are true:

// 1. They created it (ownership)
claim.created_by === userId

// 2. Directly assigned to them exclusively (no desk)
(claim.assignee === userId && claim.desk_location_id === NULL)

// 3. Assigned to one of their desk locations (team-based)
//    (visible to ALL desk members, regardless of who is currently working it)
claim.desk_location_id IN (
  SELECT desk_location_id
  FROM user_desk_location
  WHERE user_id = userId
    AND removed_at IS NULL
)

// 4. Not assigned/worked (available to start)
claim.assignee === NULL && claim.desk_location_id === NULL
```

### Authorization Updates

**Modified Rules:**

- Contributors can modify responses where:
  - They are the current assignee (direct assignment, exclusive), OR
  - **The claim is assigned to one of their desk locations (team-based, shared access)**

- Contributors can comment where:
  - They are assignee OR created_by (ownership), OR
  - **The claim is assigned to one of their desk locations**

**Rationale:** Team-based work requires shared access. Multiple users from same desk can contribute to answering checklist questions. The `assignee` field tracks who is currently working for audit purposes, but doesn't restrict access for desk-assigned work.

**Tracking Contributors:** The existing `response_audit_logs` table already captures who made which changes. This provides full audit trail of all contributors without needing exclusive claiming.

## UI/UX Changes

### 1. Admin: Desk Location Types Tab

**Location:** `/admin/user-management/desk-types` (new route)

**Features:**
- DataGrid listing all desk location types
- Columns: Type Name, Description, # Locations, Created Date, Actions
- Actions: Create, Edit, Archive, Restore
- Create dialog includes option to add default locations from template

**Component:** `DeskLocationTypesTab.tsx` (new)

### 2. Admin: Desk Locations Tab

**Location:** `/admin/user-management/desk-locations` (new route)

**Features:**
- DataGrid listing all desk locations
- Columns: Location Name, Type, # Assigned Users, Active Status, Created Date
- Filters: By Type, Active/Inactive
- Actions: Create, Edit, Activate/Deactivate, Archive, Restore
- Bulk actions: Activate/Deactivate multiple locations

**Component:** `DeskLocationsTab.tsx` (new)

### 3. Admin: User Desk Assignment Tab

**Location:** `/admin/user-management/user-desks` (new route) OR integrated into UsersTab

**Features:**
- Select user → view/edit their desk location assignments
- Drag-and-drop priority reordering (1-5)
- Add/remove desk location associations
- Visual indication of which locations have available work
- Save/Cancel changes

**Component:** `UserDeskAssignmentTab.tsx` (new)

**Alternative:** Integrate into existing `UsersTab.tsx` as expandable row detail

### 4. Assignment Dialogs Enhancement

**Update:** `ClaimAssignmentDialog.tsx` and `ChecklistHandoffDialog.tsx`

**Features:**
- Radio button group: "Assign to User" | "Assign to Desk Location"
- When "Assign to User" selected:
  - Existing user dropdown (unchanged)
  - Shows "(Direct Assignment)" label
- When "Assign to Desk Location" selected:
  - Grouped dropdown by Desk Location Type
  - Shows location name + count of assigned users
  - Example: "Pending (3 users)" under "Claims Processing"

### 5. User: My Queue View

**Location:** `/my-queue` (enhanced existing view)

**Features:**
- **Tab 1: My Work** - Claims directly assigned to me (existing)
- **Tab 2: Available Work** - Claims from my desk locations, ordered by priority
  - Group by desk location
  - Show priority badge (P1, P2, etc.)
  - "Start Work" button to claim
  - Show count of users who can see this work
- **Header Stats:**
  - "Your Desk Locations: 3 active"
  - "Available Claims: 12 total (5 in P1, 4 in P2, 3 in P3)"

**Component:** Update `MyQueue.tsx`

### 6. Claim Detail Panel Enhancement

**Update:** `ClaimDetailPanel.tsx`

**Features:**
- Display assignment type:
  - "Assigned to: John Doe (Direct)"
  - "Assigned to: Pending Queue (Claims Processing)"
  - "Available in: 3 desk locations"
- When viewing unclaimed desk location work:
  - Show "Claim This Work" button
  - Show list of other users who can see it

## Default Desk Locations Feature

### Workflow

1. Admin creates new Desk Location Type (e.g., "Medical Review")
2. System shows dialog: "Would you like to add default desk locations?"
3. If Yes → Show checklist of common templates with checkboxes:
   - ☑ Pending
   - ☑ Transactional
   - ☑ Closed
   - ☐ Complex Review
   - ☐ Expedited
   - ☐ On Hold
4. User can check/uncheck any options
5. On save, system creates selected locations (all active by default)
6. User can manually add custom locations afterward

### Database Support

Uses `desk_location_template` table for system defaults. Admins can add custom templates via UI.

## Role-Based Permissions

### New Permissions

Add to `user` table or separate `user_role` table:

```typescript
enum Permission {
  // Existing permissions
  MANAGE_USERS = 'manage_users',
  MANAGE_CLAIMS = 'manage_claims',
  // ... existing permissions

  // New permissions
  MANAGE_DESK_TYPES = 'manage_desk_types', // Create/edit desk location types
  MANAGE_DESK_LOCATIONS = 'manage_desk_locations', // Create/edit desk locations
  ASSIGN_USER_DESKS = 'assign_user_desks', // Associate users with desk locations
}
```

### Permission Hierarchy

- **Super Admin:** All permissions
- **Admin:** All permissions except creating types (optional - configurable)
- **Business Analyst / IT:** Typically granted `MANAGE_DESK_TYPES` and `MANAGE_DESK_LOCATIONS`
- **Manager:** Typically granted `ASSIGN_USER_DESKS`
- **Contributor:** No desk management permissions

### UI Enforcement

- Hide "Desk Types" and "Desk Locations" tabs if user lacks permission
- Show "Assign Desks" button in user management only if user has `ASSIGN_USER_DESKS`

## Implementation Steps

### Step 1: Database Migration (2-3 hours)

**Tasks:**
- Create migration file: `2025-11-20_desk_hierarchy.ts`
- Create tables:
  - `desk_location_type`
  - `desk_location`
  - `user_desk_location`
  - `desk_location_template`
- Add `desk_location_id` to `checklist_claim`
- Add indexes
- Seed `desk_location_template` with system defaults
- Add permission columns (if using column-based permissions)

**Deliverable:** Migration runs successfully, types regenerated

### Step 2: Backend - Schemas & Types (2 hours)

**Tasks:**
- Create `deskSchemas.ts` with Zod validation:
  - `deskLocationTypeInput` (create/update)
  - `deskLocationInput` (create/update)
  - `userDeskLocationInput` (assign/update priority)
  - `listDeskLocationsInput` (pagination/filtering)
- Regenerate Kysely types: `npm run db:types`
- Create TypeScript types for frontend use

**Deliverable:** Validated schemas and types available

### Step 3: Backend - Query Functions (8-10 hours)

**Create:** `apps/web/src/api/queries/deskQueries.ts`

**Functions:**

**Desk Location Types:**
- `getDeskLocationTypes()` - List with pagination
- `getDeskLocationType()` - Single type by ID
- `createDeskLocationType()` - With optional default locations
- `updateDeskLocationType()` - Update details
- `archiveDeskLocationType()` - Soft delete (cascade check)
- `restoreDeskLocationType()` - Unarchive

**Desk Locations:**
- `getDeskLocations()` - List with pagination/filters (by type, active status)
- `getDeskLocation()` - Single location by ID
- `createDeskLocation()` - Create location under type
- `updateDeskLocation()` - Update details
- `activateDeskLocation()` / `deactivateDeskLocation()` - Toggle active status
- `archiveDeskLocation()` - Soft delete (check for assigned users/claims)
- `restoreDeskLocation()` - Unarchive

**User Desk Associations:**
- `getUserDeskLocations()` - Get user's desk locations with priorities
- `assignUserToDeskLocation()` - Add association with priority
- `updateUserDeskLocationPriority()` - Change priority order
- `removeUserFromDeskLocation()` - Soft delete association

**Templates:**
- `getDeskLocationTemplates()` - List all templates
- `createDeskLocationTemplate()` - Add custom template

**Update:** `apps/web/src/api/queries/claimQueries.ts`

**Changes:**
- Modify visibility queries to include desk location logic
- Add desk location info to claim responses (JOIN)
- Add "available work" query for user's desk locations
- Update claim assignment to support desk locations

**Deliverable:** All query functions tested and working

### Step 4: Backend - tRPC Routers (4-5 hours)

**Create:** `apps/web/src/server/trpc/routers/desk.ts`

**Procedures:**
- `listTypes`, `getType`, `createType`, `updateType`, `archiveType`, `restoreType`
- `listLocations`, `getLocation`, `createLocation`, `updateLocation`, `activateLocation`, `deactivateLocation`, `archiveLocation`, `restoreLocation`
- `listTemplates`, `createTemplate`
- `getUserDeskLocations`, `assignUserToLocation`, `updatePriority`, `removeUserFromLocation`

**Update:** `apps/web/src/server/trpc/routers/claim.ts`

**Changes:**
- Add `desk_location_id` support to assignment mutations
- Add `getAvailableWork` query for user's desk location queues
- Add `claimWork` mutation to assign desk location claim to user

**Update:** `apps/web/src/server/trpc/appRouter.ts`

**Changes:**
- Register new `desk` router

**Deliverable:** All endpoints functional and type-safe

### Step 5: Frontend - Hooks (2 hours)

**Create:** `apps/web/src/hooks/trpc/useDeskTrpc.ts`

**Exports:**
- Mutation wrappers with cache invalidation
- Query wrappers
- Derived types:
  - `DeskLocationType`
  - `DeskLocation`
  - `UserDeskLocation`
  - `DeskLocationTemplate`

**Deliverable:** Hooks ready for use in components

### Step 6: Frontend - Admin Desk Type Management (6-8 hours)

**Create:**
- `DeskLocationTypesTab.tsx` - DataGrid with types
- `DeskLocationTypeDialog.tsx` - Create/edit dialog
  - Include checkbox list for default locations
  - "Add Default Locations" toggle
- Add route in admin layout: `/admin/user-management/desk-types`
- Add to admin sidebar navigation

**Deliverable:** Admins can manage desk location types

### Step 7: Frontend - Admin Desk Location Management (6-8 hours)

**Create:**
- `DeskLocationsTab.tsx` - DataGrid with locations
- `DeskLocationDialog.tsx` - Create/edit dialog
- `DeskLocationTypeSelect.tsx` - Reusable dropdown for selecting type
- Add route: `/admin/user-management/desk-locations`
- Add to admin sidebar navigation

**Features:**
- Filter by type
- Filter by active/inactive
- Bulk activate/deactivate
- Show user count per location

**Deliverable:** Admins can manage desk locations

### Step 8: Frontend - User Desk Assignment (8-10 hours)

**Option A:** New dedicated tab

**Create:**
- `UserDeskAssignmentTab.tsx`
- `UserDeskLocationManager.tsx` - Drag-drop priority list
- `DeskLocationSelect.tsx` - Multi-select with search
- Add route: `/admin/user-management/user-desks`

**Option B:** Integrate into UsersTab

**Update:**
- `UsersTab.tsx` - Add expandable row detail
- `UserDeskLocationManager.tsx` - Same component, different context

**Features:**
- Drag-and-drop priority reordering (use `react-beautiful-dnd` or similar)
- Visual priority badges (P1, P2, etc.)
- Add/remove desk location associations
- Show available work count per location
- Validation: Max 5 priorities, no duplicates

**Deliverable:** Managers can assign users to desk locations with priorities

### Step 9: Frontend - Assignment Dialog Enhancement (4-5 hours)

**Update:**
- `ClaimAssignmentDialog.tsx`
- `ChecklistHandoffDialog.tsx`
- `DeskLocationSelect.tsx` (reuse from Step 7)

**Changes:**
- Add radio button group: User vs Desk Location
- Conditional rendering based on selection
- Update submit logic to set `desk_location_id` instead of `assignee` when appropriate
- Show grouped locations (by type) in dropdown

**Deliverable:** Users can assign claims to desk locations

### Step 10: Frontend - My Queue Enhancement (8-10 hours)

**Update:** `MyQueue.tsx`

**Changes:**
- Add "Available Work" tab
- Implement priority-based grouping
- Add "Start Work" button with claim mutation
- Show priority badges
- Display user count per location
- Add header stats showing available work counts
- Handle race conditions (claim already taken)

**Deliverable:** Users see and can claim work from their desk locations

### Step 11: Frontend - Claim Detail Enhancement (2-3 hours)

**Update:** `ClaimDetailPanel.tsx`

**Changes:**
- Display desk location assignment (if applicable)
- Show "Claim This Work" button for unclaimed desk location work
- Show list of users who can see this claim

**Deliverable:** Claim detail shows assignment context

### Step 12: Authorization Middleware (3-4 hours)

**Update:** `apps/web/src/middleware/requireAssigned.ts`

**Changes:**
- Check desk location associations
- Verify user can access claim via desk location

**Update:** Comment authorization logic

**Deliverable:** Authorization enforces desk location rules

### Step 13: Permission System (4-5 hours)

**Tasks:**
- Add permission columns/tables to database
- Create permission checking utilities
- Update admin UI to check permissions before showing tabs
- Add permission assignment UI (in user management or roles tab)

**Deliverable:** Role-based access control functional

### Step 14: Testing & QA (8-10 hours)

**Test Cases:**

**Priority Routing:**
- User assigned to 3 locations (P1, P2, P3)
- Verify P1 work shows first
- Mark P1 location empty, verify P2 work shows
- Add new P1 work, verify it becomes next task

**Claiming:**
- Two users assigned to same location
- User A claims work
- Verify User B no longer sees it
- Test race condition handling

**Permissions:**
- Verify BA can create types/locations
- Verify manager can assign users
- Verify contributor cannot access admin tabs

**Visibility:**
- Verify users only see work from their locations
- Verify direct assignment bypasses desk locations
- Verify ownership rules maintained

**Assignment:**
- Assign claim to desk location
- Assign claim directly to user
- Verify both modes coexist

**Deletion:**
- Try to delete location with assigned users → should warn or block
- Try to delete location with claims → should reassign or warn
- Verify soft deletion preserves audit trail

**Deliverable:** All features tested and bugs fixed

### Step 15: Documentation (3-4 hours)

**Update:**
- `CLAUDE.md` - Add desk assignment patterns and architecture notes
- `README.md` - Document environment variables (if any)
- `DESK_HIERARCHY_PLAN.md` - Mark as implemented, add lessons learned

**Create:**
- Migration notes for future developers
- Admin user guide for desk management
- End-user guide for using desk location queues

**Deliverable:** Complete documentation

## Total Effort Estimate

**Backend:** 16-20 hours
**Frontend:** 36-46 hours
**Testing & QA:** 8-10 hours
**Documentation:** 3-4 hours

**Total:** 63-80 hours (approximately 2-2.5 weeks for one developer, 1-1.5 weeks for two developers)

## Migration Strategy

### Backward Compatibility

1. **Existing Claims** - All existing claims with `assignee` remain functional
2. **No Breaking Changes** - Direct user assignment continues to work
3. **Gradual Adoption** - Teams can adopt desk location assignment incrementally
4. **Dual Assignment** - System supports both modes simultaneously

### Rollout Plan

**Week 1: Development Foundations**
- Database migration
- Backend schemas, types, query functions
- tRPC routers and hooks

**Week 2: Admin UI**
- Desk type management
- Desk location management
- User desk assignment interface

**Week 3: User-Facing Features**
- Assignment dialogs
- My Queue enhancements
- Claim detail updates
- Permission system

**Week 4: Testing & Refinement**
- QA testing
- Bug fixes
- Performance optimization
- Documentation

**Week 5: Deployment**
- Deploy to staging
- User training (admins and end-users)
- Monitor usage and performance
- Production deployment

## Risks & Mitigation

### Risk 1: Priority Logic Complexity
**Risk:** Edge cases in priority routing cause confusion or bugs
**Mitigation:**
- Extensive unit tests for priority algorithm
- Clear UI indication of which priority level user is currently viewing
- Admin dashboard showing priority distribution
- Logging priority transitions for debugging

### Risk 2: Race Conditions on Claiming
**Risk:** Two users claim same work simultaneously
**Mitigation:**
- Database-level UPDATE with WHERE clause checking `assignee IS NULL`
- Return error to second user with friendly message
- Auto-refresh queue after failed claim attempt
- Add optimistic locking if needed

### Risk 3: Permission Confusion
**Risk:** Users/admins unsure who can do what
**Mitigation:**
- Clear permission labels in UI
- Help tooltips explaining each permission
- Admin audit log showing who made changes
- Role-based templates (BA, Manager, Contributor)

### Risk 4: User Assignment Overhead
**Risk:** Managing up to 5 priorities per user becomes tedious
**Mitigation:**
- Drag-and-drop interface for priority reordering
- Bulk assignment tools (assign entire team to same locations)
- Templates for common assignment patterns
- Copy assignments from one user to another

### Risk 5: Performance on Large Datasets
**Risk:** Queries with multiple JOINs slow down with many users/locations
**Mitigation:**
- Proper indexes on all foreign keys and priority columns
- Materialized view for frequently accessed user-location data (if needed)
- Query performance monitoring
- Pagination on all list views

### Risk 6: Migration from Existing System
**Risk:** Existing workflows disrupted during transition
**Mitigation:**
- Maintain direct user assignment option (no forced migration)
- Phased rollout by team/department
- Training sessions before go-live
- Fallback plan to revert feature if critical issues

## Success Metrics

### Adoption Metrics
- **% of claims assigned to desk locations** - Target: 60% within 3 months
- **% of users with desk location assignments** - Target: 80% within 1 month
- **Average desk locations per user** - Baseline: Track to understand usage patterns

### Efficiency Metrics
- **Average time to claim work** - How quickly users find and start work
- **Work distribution balance** - Standard deviation of claims per user (lower is better)
- **Priority utilization** - % of time users working P1 vs P2-P5

### User Satisfaction
- **User survey scores** - "Desk location system improves my workflow" (1-5 scale)
- **Support tickets related to assignment** - Should decrease after system stabilizes
- **Admin feedback** - "System makes user assignment easier" (1-5 scale)

### System Health
- **Query performance** - P95 response time for claim list queries
- **Race condition frequency** - # of failed claim attempts due to simultaneous claiming
- **Error rate** - % of desk assignment operations that fail

## Open Questions

### 1. Should we support automatic reassignment when user completes work?
- **Question:** When user finishes a claim from P1 location, should system auto-assign next P1 claim, or require explicit "Start Work" action?
- **Options:**
  - A) Auto-assign (maximizes throughput, may overwhelm users)
  - B) Require action (gives users control, may cause delays)
- **Recommendation:** Start with Option B, add Option A as user preference later

### 2. How should we handle desk location capacity/limits?
- **Question:** Should locations have max capacity (e.g., "Pending can only have 50 active claims")?
- **Impact:** Would help prevent queue overload, but adds complexity
- **Recommendation:** Not for MVP, add in future iteration based on feedback

### 3. Should we show users what priority level they're viewing?
- **Question:** In "Available Work" tab, should we visually separate P1, P2, P3 work?
- **Options:**
  - A) Single unified list (simpler UI, less obvious)
  - B) Grouped by priority with expandable sections (clearer, more clicks)
  - C) Tabs for each priority (most explicit, fragmented)
- **Recommendation:** Option B (grouped with badges)

### 4. How should we handle desk location deletion with active claims?
- **Question:** What happens to claims when a desk location is deleted?
- **Options:**
  - A) Block deletion if any claims exist
  - B) Require manual reassignment first
  - C) Auto-reassign to another location (which one?)
- **Recommendation:** Option A for MVP (safest), add reassignment workflow later

### 5. Should we support desk location hierarchies (sub-locations)?
- **Question:** Should locations support nesting (e.g., "Pending" → "Pending - Expedited")?
- **Impact:** Would enable more granular routing, but increases complexity
- **Recommendation:** Not for MVP, revisit if users request it

## Next Steps

1. **Stakeholder Review** - Present revised plan to business team for approval
2. **Resource Allocation** - Assign developer(s) for 2-week implementation
3. **Database Backup** - Ensure full backup before running migration
4. **Set Timeline** - Target deployment date for Hanover
5. **Create Tickets** - Break down implementation steps into trackable tasks
6. **Begin Development** - Start with database migration and backend foundations
7. **Schedule Training** - Plan admin training sessions before rollout

## Phase 1 Implementation Files

**Backend:**
- Migration: `apps/web/src/api/database/migrations/2025-11-20_192227_add_desk_location_hierarchy.ts`
- Schemas: `apps/web/src/schemas/deskSchemas.ts` (includes SUGGESTED_DESK_LOCATIONS)
- Queries: `apps/web/src/api/queries/deskQueries.ts`
- Controller: `apps/web/src/api/controllers/deskController.ts`
- Router: `apps/web/src/server/trpc/routers/desk.ts`

**Frontend:**
- Hook: `apps/web/src/hooks/trpc/useDeskTrpc.ts`
- Main Tab: `apps/web/src/components/admin/DeskLocationsTab.tsx`
- Dialogs:
  - `apps/web/src/components/admin/DeskLocationTypeDialog.tsx`
  - `apps/web/src/components/admin/DeskLocationDialog.tsx`
- Action Cells:
  - `apps/web/src/components/admin/DeskTypeActionsCell.tsx`
  - `apps/web/src/components/admin/DeskLocationActionsCell.tsx`
- Selects:
  - `apps/web/src/components/common/DeskLocationTypeSelect.tsx`
  - `apps/web/src/components/common/DeskLocationSelect.tsx`
- Styles: `apps/web/src/app/globals.css` (added `.selected-row` and `.inactive-cell`)

**Implementation Notes:**
- All queries are client-scoped via `applyClientScope()`
- Soft deletion using `deleted_at` timestamps preserves audit trail
- Unique constraint: name must be unique within client (excluding deleted records)
- Admin action logging tracks all create/update/archive/restore operations
- Suggested default locations available when creating new types
- Archive enforcement prevents data inconsistencies (types with locations, locations with claims)

## References

- **desk_hierarchy_team_correspondance.txt** - Business team requirements clarification
- **LEGACY_GAP_ANALYSIS.md** - Component 5 (Claim Delivery) describes legacy Oracle desk hierarchy
- **CLAUDE.md** - Architecture patterns and development standards
- **Current Assignment Code:**
  - `apps/web/src/api/queries/claimQueries.ts` - Visibility logic
  - `apps/web/src/components/admin/ClaimAssignmentDialog.tsx` - Manual assignment UI
  - `apps/web/src/middleware/requireAssigned.ts` - Authorization enforcement

## Appendix A: Example Data Model

```
Desk Location Type: "Claims Processing"
  ├── Desk Location: "Pending" (Active, 3 users)
  │     ├── User: John Doe (Priority 1)
  │     ├── User: Jane Smith (Priority 2)
  │     └── User: Bob Johnson (Priority 1)
  │
  ├── Desk Location: "Transactional" (Active, 2 users)
  │     ├── User: John Doe (Priority 2)
  │     └── User: Alice Williams (Priority 1)
  │
  └── Desk Location: "Closed" (Inactive, 0 users)

Desk Location Type: "Litigation"
  ├── Desk Location: "Discovery" (Active, 1 user)
  │     └── User: Bob Johnson (Priority 3)
  │
  └── Desk Location: "Trial Prep" (Active, 2 users)
        ├── User: Alice Williams (Priority 2)
        └── User: Jane Smith (Priority 1)

User: John Doe
  Priority 1: Claims Processing → Pending
  Priority 2: Claims Processing → Transactional

User: Jane Smith
  Priority 1: Litigation → Trial Prep
  Priority 2: Claims Processing → Pending

User: Bob Johnson
  Priority 1: Claims Processing → Pending
  Priority 3: Litigation → Discovery

User: Alice Williams
  Priority 1: Claims Processing → Transactional
  Priority 2: Litigation → Trial Prep
```

## Appendix B: SQL Query Examples

### Get user's available work in priority order

```sql
SELECT
  c.id,
  c.claim_number,
  c.insured,
  dl.location_name,
  dlt.type_name,
  udl.priority,
  c.created_at
FROM checklist_claim c
JOIN desk_location dl ON c.desk_location_id = dl.id
JOIN desk_location_type dlt ON dl.desk_location_type_id = dlt.id
JOIN user_desk_location udl ON dl.id = udl.desk_location_id
WHERE udl.user_id = $1  -- User ID
  AND udl.removed_at IS NULL
  AND c.assignee IS NULL  -- Not yet claimed
  AND dl.is_active = true
  AND dl.deleted_at IS NULL
ORDER BY udl.priority ASC, c.created_at ASC;
```

### Get user's desk location assignments with stats

```sql
SELECT
  udl.id,
  udl.priority,
  dl.location_name,
  dlt.type_name,
  COUNT(DISTINCT c.id) AS available_claims,
  COUNT(DISTINCT udl2.user_id) AS total_users
FROM user_desk_location udl
JOIN desk_location dl ON udl.desk_location_id = dl.id
JOIN desk_location_type dlt ON dl.desk_location_type_id = dlt.id
LEFT JOIN checklist_claim c ON dl.id = c.desk_location_id
  AND c.assignee IS NULL
LEFT JOIN user_desk_location udl2 ON dl.id = udl2.desk_location_id
  AND udl2.removed_at IS NULL
WHERE udl.user_id = $1  -- User ID
  AND udl.removed_at IS NULL
GROUP BY udl.id, udl.priority, dl.location_name, dlt.type_name
ORDER BY udl.priority ASC;
```

### Claim work (with race condition protection)

```sql
UPDATE checklist_claim
SET assignee = $1,  -- User ID
    desk_location_id = NULL  -- Clear location when claimed
WHERE id = $2  -- Claim ID
  AND assignee IS NULL  -- Ensure not already claimed
  AND desk_location_id IN (
    SELECT desk_location_id
    FROM user_desk_location
    WHERE user_id = $1
      AND removed_at IS NULL
  )
RETURNING *;
```

If query returns 0 rows, claim was already taken by another user.
