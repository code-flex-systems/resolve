# Desk Hierarchy Implementation Plan

**Date:** November 20, 2025
**Status:** Planning
**Target Release:** Phase 1 for Hanover MVP

## Executive Summary

This document outlines a phased approach to implement a desk-based assignment system for claims management. The architecture supports both simple desk-level assignment (Phase 1 - Hanover MVP) and full hierarchical routing with desk locations and types (Phase 2 - Investor appeal).

**Key Architectural Decisions:**

- **1:1 Desk-User Relationship** - Each desk corresponds to exactly one user (not many-to-many)
- **Feature Flag** - `ENABLE_DESK_HIERARCHY` toggles between simple mode and full hierarchy
- **Assignment Modes** - Direct user assignment, specific desk assignment, or desk location assignment
- **Backward Compatibility** - Existing `assignee` field in `checklist_claim` remains functional
- **Flexible Naming** - Desks can be named by specialty, function, location, or team

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

## Phase 1: Desk Layer (Hanover MVP)

### Goals

1. Enable assignment to specialized "desks" (e.g., "Senior Adjuster", "Complex Claims Expert")
2. Maintain backward compatibility with direct user assignment
3. Support both desk-level and user-level assignment simultaneously
4. Prepare foundation for Phase 2 hierarchy

### Database Schema

#### New Table: `desk`

```sql
CREATE TABLE desk (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES client(id),
  user_id INTEGER NOT NULL REFERENCES "user"(id), -- 1:1 relationship
  desk_name VARCHAR(255) NOT NULL,
  description TEXT,
  desk_location_id INTEGER REFERENCES desk_location(id), -- NULL in Phase 1, used in Phase 2
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INTEGER REFERENCES "user"(id),
  updated_at TIMESTAMPTZ,
  updated_by INTEGER REFERENCES "user"(id),
  deleted_at TIMESTAMPTZ,
  deleted_by INTEGER REFERENCES "user"(id),

  -- Ensure one desk per user (1:1 relationship)
  UNIQUE(client_id, user_id),

  -- Prevent duplicate desk names within a client
  UNIQUE(client_id, desk_name) WHERE deleted_at IS NULL
);

-- Indexes for performance
CREATE INDEX idx_desk_client_id ON desk(client_id);
CREATE INDEX idx_desk_user_id ON desk(user_id);
CREATE INDEX idx_desk_location_id ON desk(desk_location_id);
CREATE INDEX idx_desk_deleted_at ON desk(deleted_at);
```

#### Updated Table: `checklist_claim`

```sql
-- Add new columns (both nullable to support gradual migration)
ALTER TABLE checklist_claim
  ADD COLUMN desk_id INTEGER REFERENCES desk(id),
  ADD COLUMN desk_location_id INTEGER REFERENCES desk_location(id); -- Used in Phase 2

-- Index for query performance
CREATE INDEX idx_checklist_claim_desk_id ON checklist_claim(desk_id);
CREATE INDEX idx_checklist_claim_desk_location_id ON checklist_claim(desk_location_id);

-- Business rule: Cannot have both assignee and desk_id set
-- (enforced at application layer, not database constraint, for flexibility)
```

### Assignment Logic

#### Three Assignment Modes:

1. **Direct User Assignment** (existing)
   - `assignee = user_id`, `desk_id = NULL`, `desk_location_id = NULL`
   - User sees claim in their personal queue

2. **Specific Desk Assignment** (new - Phase 1)
   - `assignee = NULL`, `desk_id = desk_id`, `desk_location_id = NULL`
   - Claim assigned to a specific user via their desk (1:1 relationship)
   - Used when a specific expert is required

3. **Desk Location Assignment** (new - Phase 2)
   - `assignee = NULL`, `desk_id = NULL`, `desk_location_id = location_id`
   - Claim available to any user whose desk is in that location
   - First available person in the location can claim it

### Visibility Logic (Contributors)

Updated visibility rules to include desk assignments:

```typescript
// User can see a claim if ANY of these conditions are true:
// 1. They created it (ownership)
claim.created_by === userId

// 2. Directly assigned to them
claim.assignee === userId

// 3. Assigned to their desk (1:1 relationship)
claim.desk_id === user.desk.id

// 4. Assigned to their desk's location (any desk in that location can pick it up) [Phase 2]
claim.desk_location_id === user.desk.desk_location_id && claim.desk_id === NULL

// 5. Not assigned/worked (available to start)
claim.assignee === NULL && claim.desk_id === NULL && claim.desk_location_id === NULL
```

### Authorization Updates

**Modified Rules:**
- Contributors can modify responses where:
  - They are the current assignee, OR
  - The claim is assigned to their desk (via `desk_id`), OR [Phase 2] The claim is assigned to their desk location and not to a specific desk

- Contributors can comment where:
  - They are assignee OR created_by (ownership), OR
  - The claim is assigned to their desk

### Deletion Behavior

Controlled by feature flag: `ENABLE_DESK_HIERARCHY`

#### Simple Mode (`ENABLE_DESK_HIERARCHY = false`)

- **Block Deletion** - Prevent desk deletion if any claims are assigned to it
- Require manual reassignment of all claims before deletion
- Error message: "Cannot delete desk. Please reassign X claims first."

#### Hierarchy Mode (`ENABLE_DESK_HIERARCHY = true`)

- **Cascade to Location** - Automatically reassign claims to desk's location
- When deleting a desk:
  1. Get desk's `desk_location_id`
  2. Update all claims: `UPDATE checklist_claim SET desk_id = NULL, desk_location_id = ? WHERE desk_id = ?`
  3. Soft delete desk: `UPDATE desk SET deleted_at = NOW(), deleted_by = ? WHERE id = ?`
- Claims remain visible to other users in the same location

### UI/UX Changes

#### 1. Admin: Desk Management Tab

**Location:** `/admin/user-management/desks` (new route)

**Features:**
- DataGrid listing all desks (server-side pagination)
- Columns: Desk Name, Assigned User, Location (Phase 2), Description, Created Date
- Actions: Create, Edit, Archive, Restore
- Search/filter by desk name or user

**Component:** `DesksTab.tsx` (new)

#### 2. Admin: User Dialog Enhancement

**Update:** `apps/web/src/components/admin/UsersTab.tsx`

**Features:**
- Add "Desk Name" field when creating/editing users
- Auto-create desk when desk name is provided
- Show desk assignment in user list

#### 3. Assignment Dialogs Enhancement

**Update:** `ClaimAssignmentDialog.tsx` and `ChecklistHandoffDialog.tsx`

**Features:**
- Radio button group: "Assign to User" | "Assign to Desk" | "Assign to Location" (Phase 2)
- When "Assign to Desk" selected:
  - Dropdown showing all desks (formatted as "Desk Name - User Name")
  - Clear indication that desk = specific user
- When "Assign to User" selected:
  - Existing user dropdown (unchanged)

#### 4. Claim Detail Panel

**Update:** `ClaimDetailPanel.tsx`

**Features:**
- Display assignment type: "Assigned to User: John Doe" | "Assigned to Desk: Senior Adjuster (John Doe)"
- Show desk location in Phase 2: "Assigned to Location: Claims Processing (available to 5 desks)"

### Implementation Steps

#### Step 1: Database Migration
- Create `desk` table with indexes
- Add `desk_id` and `desk_location_id` columns to `checklist_claim`
- Add feature flag to environment variables

**Effort:** 1-2 hours

#### Step 2: Backend - Schemas & Types
- Create `deskSchemas.ts` with Zod validation
- Regenerate Kysely types
- Export types from tRPC routers

**Effort:** 1 hour

#### Step 3: Backend - Query Functions
- Create `deskQueries.ts`:
  - `getDesks()` - List with pagination
  - `getDesk()` - Single desk by ID
  - `createDesk()` - With user_id validation (1:1 enforcement)
  - `updateDesk()` - Update desk details
  - `archiveDesk()` - Soft delete with business rule enforcement
  - `restoreDesk()` - Unarchive
- Update `claimQueries.ts`:
  - Modify visibility logic to include desk assignments
  - Add desk info to claim responses (JOIN desk table)

**Effort:** 4-5 hours

#### Step 4: Backend - tRPC Router
- Create `desk.ts` router
- Implement procedures: list, get, create, update, archive, restore
- Register in `appRouter.ts`
- Update claim router to support desk_id in assignment mutations

**Effort:** 2-3 hours

#### Step 5: Frontend - Hooks
- Create `useDeskTrpc.ts` with mutation/query wrappers
- Export derived types (DeskWithUser, etc.)

**Effort:** 1 hour

#### Step 6: Frontend - Admin Desk Management
- Create `DesksTab.tsx` with DataGrid
- Create `DeskDialog.tsx` for create/edit
- Add route in admin layout
- Add to admin sidebar navigation

**Effort:** 4-5 hours

#### Step 7: Frontend - Assignment Enhancement
- Update `ClaimAssignmentDialog.tsx`:
  - Add assignment mode selector
  - Add desk dropdown
  - Update submit logic
- Update `ChecklistHandoffDialog.tsx` similarly
- Create `DeskSelect.tsx` reusable component

**Effort:** 3-4 hours

#### Step 8: Frontend - Claim Detail Enhancement
- Update `ClaimDetailPanel.tsx` to show desk assignment
- Display user associated with desk (1:1)

**Effort:** 1 hour

#### Step 9: Authorization Middleware
- Update `requireAssigned.ts` to check desk_id
- Update comment authorization logic

**Effort:** 2 hours

#### Step 10: Testing & QA
- Test 1:1 desk-user constraint
- Test deletion behavior with feature flag
- Test visibility logic for desk-assigned claims
- Test authorization for responses and comments
- Verify backward compatibility with direct user assignment

**Effort:** 4-5 hours

#### Step 11: Documentation
- Update CLAUDE.md with desk assignment patterns
- Document feature flag in README
- Add migration notes

**Effort:** 1-2 hours

**Total Effort Estimate: ~25-30 hours (~4-5 days)**

## Phase 2: Desk Location & Type Hierarchy (Investor Appeal)

### Goals

1. Support automated routing based on desk locations and types
2. Enable queue-based claim distribution (any user in a location can pick up)
3. Provide organizational visibility and reporting by location/type

### Database Schema

#### New Table: `desk_location`

```sql
CREATE TABLE desk_location (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES client(id),
  desk_location_type_id INTEGER NOT NULL REFERENCES desk_location_type(id),
  location_name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INTEGER REFERENCES "user"(id),
  updated_at TIMESTAMPTZ,
  updated_by INTEGER REFERENCES "user"(id),
  deleted_at TIMESTAMPTZ,
  deleted_by INTEGER REFERENCES "user"(id),

  UNIQUE(client_id, location_name) WHERE deleted_at IS NULL
);

CREATE INDEX idx_desk_location_client_id ON desk_location(client_id);
CREATE INDEX idx_desk_location_type_id ON desk_location(desk_location_type_id);
CREATE INDEX idx_desk_location_deleted_at ON desk_location(deleted_at);
```

#### New Table: `desk_location_type`

```sql
CREATE TABLE desk_location_type (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES client(id),
  type_name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by INTEGER REFERENCES "user"(id),
  updated_at TIMESTAMPTZ,
  updated_by INTEGER REFERENCES "user"(id),
  deleted_at TIMESTAMPTZ,
  deleted_by INTEGER REFERENCES "user"(id),

  UNIQUE(client_id, type_name) WHERE deleted_at IS NULL
);

CREATE INDEX idx_desk_location_type_client_id ON desk_location_type(client_id);
CREATE INDEX idx_desk_location_type_deleted_at ON desk_location_type(deleted_at);
```

### Hierarchy Relationships

```
Desk Location Type (e.g., "Claims Processing")
  └── Desk Location (e.g., "Senior Adjuster Queue")
        ├── Desk 1 (User: John Doe)
        ├── Desk 2 (User: Jane Smith)
        └── Desk 3 (User: Bob Johnson)
```

### Enhanced Assignment Logic

**Desk Location Assignment:**
- Claim assigned to location but not to specific desk
- Any user whose desk is in that location can see and claim it
- First to "claim" it gets assigned

**Claiming Process:**
- User clicks "Claim This" on a location-assigned claim
- System updates: `desk_id = user.desk.id`, `assignee = user.id`
- Claim no longer visible to other users in the location

### Additional UI Components

1. **Desk Location Types Tab** - Manage top-level categories
2. **Desk Locations Tab** - Manage work queues
3. **Updated Desks Tab** - Include location assignment
4. **Queue View** - Show claims available to claim in user's location
5. **Routing Rules** (future) - Auto-assign to locations based on claim attributes

**Effort Estimate: ~40-50 hours (~1-2 weeks)**

## Environment Configuration

### Feature Flag

Add to `apps/web/.env`:

```bash
# Desk Hierarchy Feature Flag
# false = Simple mode (block deletion, desk-only)
# true = Hierarchy mode (cascade deletion, locations enabled)
ENABLE_DESK_HIERARCHY=false
```

### Usage in Code

```typescript
const ENABLE_DESK_HIERARCHY = process.env.ENABLE_DESK_HIERARCHY === 'true';

// Deletion behavior
if (ENABLE_DESK_HIERARCHY) {
  // Cascade to desk_location
  await cascadeClaimsToLocation(deskId);
} else {
  // Block deletion if claims exist
  const claimCount = await getClaimCountForDesk(deskId);
  if (claimCount > 0) {
    throw new Error(`Cannot delete desk. Please reassign ${claimCount} claims first.`);
  }
}
```

## Migration Strategy

### Backward Compatibility

1. **Existing Claims** - All existing claims with `assignee` remain functional
2. **No Breaking Changes** - Direct user assignment continues to work
3. **Gradual Adoption** - Teams can adopt desk-based assignment incrementally
4. **Dual Assignment** - System supports both modes simultaneously

### Rollout Plan

**Week 1: Phase 1 Development**
- Database migration
- Backend implementation
- Frontend desk management

**Week 2: Phase 1 Testing & Refinement**
- QA testing
- Bug fixes
- Documentation

**Week 3: Phase 1 Deployment (Hanover)**
- Deploy to staging
- User training
- Production deployment

**Week 4+: Phase 2 Planning**
- Gather feedback from Hanover usage
- Refine Phase 2 requirements
- Begin Phase 2 development as needed

## Risks & Mitigation

### Risk 1: 1:1 Constraint Enforcement
**Risk:** Users might expect multiple desks per user
**Mitigation:**
- Clear documentation and training
- Database UNIQUE constraint enforces rule
- UI prevents creating duplicate desks for same user

### Risk 2: Migration Complexity
**Risk:** Existing assignments might break
**Mitigation:**
- Nullable columns allow gradual migration
- Existing `assignee` field remains functional
- Comprehensive testing of both assignment modes

### Risk 3: Performance Impact
**Risk:** Additional JOINs slow down claim queries
**Mitigation:**
- Proper indexes on all foreign keys
- Optional LEFT JOINs only when desk info needed
- Monitor query performance post-deployment

### Risk 4: Feature Flag Confusion
**Risk:** Users confused about which mode is active
**Mitigation:**
- Clear UI indication of active mode
- Admin setting to view/change flag
- Documentation of differences between modes

### Risk 5: Orphaned Claims on Desk Deletion
**Risk:** Claims lost when desk deleted in simple mode
**Mitigation:**
- Block deletion until claims reassigned
- Clear error messages with claim count
- Admin UI showing claims assigned to desk

## Success Metrics

### Phase 1 (Hanover)

- **Adoption Rate** - % of claims assigned via desk vs direct user
- **Assignment Time** - Time from claim creation to assignment
- **Reassignment Frequency** - How often claims are reassigned
- **User Satisfaction** - Feedback from Hanover team on desk usage

### Phase 2 (Investor Appeal)

- **Queue Efficiency** - Average time claims spend in location queue
- **Load Balancing** - Distribution of claims across users in a location
- **Expert Routing** - % of complex claims assigned to specialized desks
- **Organizational Visibility** - Usage of reporting/dashboards by location/type

## Open Questions

1. **Should users be able to belong to multiple desk locations in the future?**
   - Current design: 1 user → 1 desk → 1 location (in Phase 2)
   - Alternative: 1 user → 1 desk → N locations (more complex)

2. **Should we support auto-assignment rules in Phase 2?**
   - Example: "Auto-assign claims with amount > $50k to Senior Adjuster Queue"
   - Would require additional `routing_rule` table

3. **How should we handle desk reassignment (changing which user a desk belongs to)?**
   - Update desk.user_id directly, or
   - Soft delete old desk and create new one (maintains audit trail)

4. **Should desk names be editable after creation?**
   - Current plan: Yes, with unique constraint
   - Alternative: Immutable desk names to preserve audit history

## Next Steps

1. **Review and Approve Plan** - Stakeholder review of this document
2. **Create Phase 1 Tasks** - Break down implementation steps into Jira/Linear tickets
3. **Assign Resources** - Allocate developer time for 4-5 day sprint
4. **Set Timeline** - Target deployment date for Hanover
5. **Begin Development** - Start with database migration and backend

## References

- **LEGACY_GAP_ANALYSIS.md** - Component 5 (Claim Delivery) describes legacy Oracle desk hierarchy
- **CLAUDE.md** - Architecture patterns and development standards
- **Current Assignment Code:**
  - `apps/web/src/api/queries/claimQueries.ts` - Visibility logic
  - `apps/web/src/components/admin/ClaimAssignmentDialog.tsx` - Manual assignment UI
  - `apps/web/src/middleware/requireAssigned.ts` - Authorization enforcement
