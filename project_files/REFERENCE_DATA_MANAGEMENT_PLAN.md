# Reference Data Management System - Implementation Plan

## Executive Summary

Migrate 8 hardcoded business enums to a flexible, database-driven reference data management system that allows admins to configure options without code deployments. This follows the proven patterns from the desk location management feature.

**Note on Sort Order:** The `sort_order` column is included in the database schema for future use, but in Phase 1 we will not implement custom ordering. All options will be sorted alphabetically by `display_label`. This simplifies the initial implementation while preserving the ability to add custom ordering later.

### Scope

**Business-Driven (Make Configurable):**
- Line of Business
- Loss Type
- Coverage Type
- Claim Substatus
- Party Types (Entity/Facilitator)
- Facilitator Categories
- Entity Categories
- Claim Party Roles

**System-Driven (Keep Hardcoded):**
- Task Types/Status
- Workflow configs
- Document Types/Statuses
- Deadline types
- Action types
- Feed types
- User Roles

---

## Phase 1: Database Schema Design

### Core Tables

**reference_list Table**
- Defines each configurable entity type (e.g., 'line_of_business', 'loss_type')
- Fields: id, entity (unique key), display_name, description, client_id, audit fields, deleted_at
- Multi-tenant scoped with client_id
- Soft delete support

**reference_option Table**
- Stores individual options for each reference list
- Fields: id, reference_list_id (FK), value (snake_case key), display_label, description
- Optional metadata: icon_emoji, color_hex, sort_order (reserved for future use)
- Status fields: is_active, is_system_default
- Multi-tenant with client_id
- Audit fields: created_at/by, updated_at/by
- Soft delete with deleted_at timestamp
- **Sorting:** Options are sorted alphabetically by display_label (sort_order column exists but is not actively managed in Phase 1)

### Design Rationale

**Two-Table Structure:**
- Separation of concerns (list metadata vs. option data)
- Easier to add list-level configuration later
- Cleaner query patterns
- Mirrors desk_location_type + desk_location pattern

**Icon/Color Storage:**
- Store in reference_option as optional metadata
- Allows admin customization without code changes
- Falls back to defaults if not set
- Frontend can override during migration if needed

**Soft Deletes:**
- Preserves historical data for audit trails
- Deactivated options remain in historical records
- Admin UI shows both active and inactive

### Indexes
- reference_list: (client_id, entity) where not deleted
- reference_option: (reference_list_id, is_active) where not deleted
- reference_option: (client_id, reference_list_id) where not deleted
- reference_option: (reference_list_id, value) where not deleted
- reference_option: (reference_list_id, display_label) - for alphabetical sorting

---

## Phase 2: Migration Strategy

### SQL Migration Files

**File 1: reference_data_infrastructure.sql**
- Drop existing tables if they exist
- Create reference_list table with all constraints
- Create reference_option table with all constraints
- Create all indexes
- Located: src/api/sql/

**File 2: seed_reference_data.sql**
- Use DO $$ block to get system user and client IDs
- Insert 7 reference_list entries (one per entity type)
- Insert all reference_option entries with current enum values
- Include icon_emoji from existing icon mappings (LOSS_TYPE_ICONS, etc.)
- Set is_system_default=TRUE for seed data
- Set sort_order to 0 for all options (not actively used; alphabetical sorting by display_label)

### Entity Migrations

**1. Line of Business (5 options)**
- auto, property, general_liability, workers_comp, professional_liability
- Icons: 🚗, 🏠, ⚖️, 👷, 💼

**2. Loss Type (13 options)**
- collision, comprehensive, fire, theft, water_damage, wind, vandalism, bodily_injury, property_damage, uninsured_motorist, medical_payments, personal_injury_protection, other
- Icons from LOSS_TYPE_ICONS mapping

**3. Coverage Type (10 options)**
- collision, comprehensive, liability, uninsured_motorist, medical_payments, personal_injury_protection, dwelling, personal_property, loss_of_use, other

**4. Claim Substatus (8 options)**
- investigation, demand_sent, negotiation, settlement_reached, litigation, closed_recovered, closed_no_recovery, cancelled
- Icons from SUBSTATUS_ICONS mapping

**5. Facilitator Categories (4 options)**
- adverse_carrier, attorney, expert, vendor

**6. Entity Categories (4 options)**
- responsible_party, claimant, witness, property_owner

**7. Claim Party Roles (9 options)**
- adverse_carrier, our_attorney, their_attorney, expert, responsible_party, witness, property_owner, claimant, other
- Icons from CLAIM_PARTY_ROLE_ICONS mapping

### Migration Execution

1. Run infrastructure migration via npm run db:migrate
2. Execute seed data SQL script
3. Regenerate TypeScript types with npx kysely-codegen
4. Verify data with count queries

### Rollback Strategy

**Since NOT in production:**
- Simple: DROP TABLE reference_option, reference_list CASCADE
- Re-run previous migrations
- No data loss concerns (test data only)

**Future production considerations:**
- Keep enum columns during transition
- Dual-write to both systems
- Validate consistency
- Cutover after verification
- Remove enum columns in later migration

---

## Phase 3: Query Layer

### Query Functions (referenceDataQueries.ts)

**Read Operations (All Users):**
- getReferenceLists() - Get all lists for client
- getReferenceList(entity) - Get single list by entity name
- getReferenceOptions(entity, showInactive) - Get options for entity, optionally include inactive
- getReferenceOption(entity, value) - Get single option by value

**Mutation Operations (Admin Only):**
- createReferenceOption() - Create new option
- updateReferenceOption() - Update existing option
- deleteReferenceOption() - Soft delete (prevents deletion of system defaults)
- restoreReferenceOption() - Restore deleted option

**Query Patterns:**
- Always filter by client_id from session
- Always check deleted_at IS NULL
- Use soft deletes with deleted_at timestamp
- Track audit fields (updated_at, updated_by)
- Order by display_label alphabetically (sort_order column reserved for future use)

### Controller Layer (referenceDataController.ts)

Thin wrapper around query functions:
- Delegates to query layer
- Validates inputs from TRPC schemas
- Returns query results
- No complex business logic (simple CRUD)

---

## Phase 4: API Layer (TRPC)

### Zod Schemas (referenceDataSchemas.ts)

**Input Schemas:**
- getReferenceListsInput - No params needed
- getReferenceOptionsInput - entity (required), showInactive (optional)
- createReferenceOptionInput - entity, value, display_label, description, icon_emoji, color_hex
- updateReferenceOptionInput - id, params (all fields optional)
- deleteReferenceOptionInput - id only

**Validation Rules:**
- value: lowercase, numbers, underscores only (regex: ^[a-z0-9_]+$)
- display_label: 1-255 characters
- color_hex: matches #RRGGBB format

**Constants:**
- KNOWN_REFERENCE_ENTITIES array for type safety

### TRPC Router (referenceData.ts)

**Query Endpoints (All Users):**
- getReferenceLists - No authorization needed
- getReferenceOptions - No authorization needed, cached aggressively

**Mutation Endpoints (Admin Only):**
- createReferenceOption - requireRole([ADMIN, SUPER_ADMIN])
- updateReferenceOption - requireRole([ADMIN, SUPER_ADMIN])
- deleteReferenceOption - requireRole([ADMIN, SUPER_ADMIN])
- restoreReferenceOption - requireRole([ADMIN, SUPER_ADMIN])

**Registration:**
- Add referenceDataRouter to appRouter.ts
- Export type: appRouter

---

## Phase 5: Frontend Changes

### Custom Hook (useReferenceDataTrpc.ts)

**Wrapper around TRPC client:**
- lists - useQuery for getReferenceLists
- options - useQuery for getReferenceOptions (core query used everywhere)
- createOption - useMutation with cache invalidation
- updateOption - useMutation with cache invalidation
- deleteOption - useMutation with cache invalidation
- restoreOption - useMutation with cache invalidation

**Cache Invalidation Strategy:**
- After mutations, invalidate getReferenceOptions for affected entity
- TRPC automatic invalidation on success
- React Query handles refetch

**Export Types:**
- ReferenceList type
- ReferenceOption type

### Generic Select Component (ReferenceDataSelect.tsx)

**Purpose:**
- Replace all hardcoded enum selects (LossTypeSelect, etc.)
- Single generic component for any reference entity
- Fetches options dynamically from database

**Props:**
- entity: string (which entity to load)
- value: string | null (current selection)
- onChange: (newValue: string | null) => void
- clearable: boolean (show delete chip)
- height: number (optional)
- placeholder: string (optional)
- disabled: boolean
- showIcon: boolean (display emoji icons)

**Features:**
- Uses BasicPopper for dropdown (existing pattern)
- Displays icon_emoji if available and showIcon=true
- Chip-based UI (consistent with existing selects)
- Loading state while fetching
- Caching via React Query (staleTime: 5 min, cacheTime: 10 min)
- Sorts alphabetically by display_label

### Admin UI - Reference Data Tab (ReferenceDataTab.tsx)

**Layout:**
- Top: Tabs for selecting entity type (scrollable)
- Bottom: DataGridPro showing options for selected entity
- Toolbar with "Add Option" button
- Follows DeskLocationsTab.tsx pattern

**Grid Columns:**
- Option (display_label + icon_emoji + value as secondary)
- Status (Active/Inactive)
- System (Yes/No for is_system_default)
- Created (formatted date)
- Actions (edit/delete/restore buttons)

**Features:**
- Show both active and inactive options (showInactive: true)
- Inactive rows styled with opacity: 0.5
- Opens ReferenceOptionDialog on add/edit
- Refreshes on dialog close

**State:**
- selectedEntity: tracks current tab
- showDialog: controls dialog visibility

### Admin UI - Option Dialog (ReferenceOptionDialog.tsx)

**Purpose:**
- Create or edit reference options
- Follows DeskLocationDialog.tsx pattern

**Form Fields:**
- value (key): required, snake_case validation, disabled in edit mode
- display_label: required, 1-255 chars
- description: optional, multiline
- icon_emoji: optional, single emoji
- is_active: switch control
- Note: sort_order is not exposed in the UI; options are sorted alphabetically

**Validation:**
- React Hook Form with Zod resolver
- value: regex ^[a-z0-9_]+$
- display_label: min 2, max 255
- isDirty check prevents no-op updates

**Actions:**
- Primary: Create/Update (disabled until valid + dirty)
- Cancel: close without saving

### Admin UI - Actions Cell (ReferenceOptionActionsCell.tsx)

**Actions Available:**
- Edit (icon button with Edit icon)
- Activate/Deactivate (toggle active status)
- Delete (only if not system default, soft delete)
- Restore (if deleted_at is not null)

**Follows Pattern:**
- DeskLocationActionsCell.tsx
- IconButton components
- Confirmation dialogs for destructive actions

### Component Migration Strategy

**Phase 5A: Build Alongside**
- Create ReferenceDataSelect component
- Test with one entity (loss_type)
- Verify caching and performance
- Keep old components working

**Phase 5B: Migrate One-by-One**

Order of migration:
1. LossTypeSelect → ReferenceDataSelect (entity="loss_type")
2. LineOfBusinessSelect → ReferenceDataSelect (entity="line_of_business")
3. CoverageTypeSelect → ReferenceDataSelect (entity="coverage_type")
4. ClaimSubstatusSelect → ReferenceDataSelect (entity="claim_substatus")
5. Party-related selects → corresponding entities

**For Each Component:**
- Replace component usage in parent components
- Update props to ReferenceDataSelect API
- Test thoroughly
- Mark old component as deprecated
- Remove old component after all usages replaced

**Backward Compatibility:**
- Both systems work during transition
- Old enum files kept temporarily
- No breaking changes to existing code
- Gradual cutover per component

---

## Phase 6: Type Safety Strategy

### The Challenge

When enums become database values, compile-time type safety is lost:
- OLD: claim.loss_type: LossType (TypeScript knows valid values)
- NEW: claim.loss_type: string | null (any string is valid)

### Solution: Runtime Validation + Documentation

**1. Keep Enums for Documentation**
- Update enums.ts with @deprecated JSDoc
- Note that database is source of truth
- Keep for backwards compatibility
- Use for initial code migration

**2. Runtime Validation**
- Create referenceDataValidation.ts utility
- validateReferenceValue(ctx, entity, value) - throws if invalid
- getValidReferenceValues(ctx, entity) - for error messages
- Use in controllers before database operations

**3. Zod Schema Validation**
- Validate format (string type)
- Runtime checks happen in controller layer
- Clear error messages

**4. Integration Points**
- Call validateReferenceValue in update/create controllers
- Happens after Zod validation, before database write
- Fetches current valid options from database
- Throws descriptive error if invalid

### Trade-offs

**Accept Loss Of:**
- Compile-time enum validation
- IDE autocomplete for enum values
- Exhaustiveness checking in switch statements

**Gain:**
- Admin flexibility to add/remove options
- No code deployments for business changes
- Multi-tenant customization
- Historical data preservation
- Better audit trail

**Mitigation Strategies:**
- Comprehensive runtime validation
- Clear error messages with valid options
- Admin UI validation (prevent invalid states)
- Integration tests for validation logic
- Documentation of valid values

---

## Phase 7: Testing Approach

### 7.1 Database Layer Tests

**File:** src/api/queries/__tests__/referenceDataQueries.test.ts

**Test Coverage:**
- getReferenceOptions returns active options by default
- getReferenceOptions includes inactive when requested
- Multi-tenant filtering (client_id isolation)
- Alphabetical sorting by display_label
- createReferenceOption with correct metadata
- Duplicate value prevention within same list
- deleteReferenceOption soft deletes non-system options
- deleteReferenceOption prevents deletion of system defaults
- restoreReferenceOption works correctly

**Test Utilities:**
- createTestContext() - sets up test DB context
- cleanupTestData() - removes test data after each test

### 7.2 API Layer Tests

**File:** src/server/trpc/routers/__tests__/referenceData.test.ts

**Test Coverage:**
- getReferenceOptions allows regular users
- createReferenceOption requires admin role
- updateReferenceOption requires admin role
- deleteReferenceOption requires admin role
- Zod validation on all inputs
- Error handling for invalid entity names
- Error handling for duplicate values

**Test Approach:**
- Use createCallerFactory for TRPC testing
- Mock contexts with different roles
- Verify authorization checks
- Verify schema validation

### 7.3 Component Tests

**File:** src/components/common/__tests__/ReferenceDataSelect.test.tsx

**Test Coverage:**
- Renders with placeholder
- Fetches and displays options
- Calls onChange when option selected
- Displays icons when available
- Handles loading state
- Handles disabled state
- Clears value when delete clicked

**File:** src/components/admin/__tests__/ReferenceDataTab.test.tsx

**Test Coverage:**
- Renders tabs for all entities
- Switches entity when tab clicked
- Shows active and inactive options
- Opens dialog on add button
- Refreshes data after mutations

**Test Utilities:**
- Mock useReferenceDataTrpc hook
- Mock TRPC responses
- Use React Testing Library

### 7.4 Integration Tests

**End-to-End Flows:**
1. Admin creates new option → appears in dropdowns for all users
2. Admin deactivates option → hidden from regular users, visible in admin
3. Multi-tenant isolation → clients see only their options
4. Caching works → second query hits cache, no database call
5. User selects option → saved correctly, displays properly

### 7.5 Migration Validation Tests

**Verify Data Integrity:**
1. All enum values migrated to reference_option
2. No data loss in existing claims/parties
3. Foreign key relationships intact
4. Option counts match before/after
5. Icon mappings preserved

**SQL Verification Queries:**
- Count options per entity
- Verify all expected values present
- Check for orphaned records
- Validate client_id on all records

---

## Phase 8: Rollout Plan

### Phase 8A: Infrastructure (Week 1)

**Goal:** Database tables exist and seeded

**Tasks:**
1. Create reference_data_infrastructure.sql migration
2. Create seed_reference_data.sql script
3. Run migrations on dev environment
4. Regenerate TypeScript types (npx kysely-codegen)
5. Verify seed data with SQL queries
6. Test multi-tenant isolation

**Success Criteria:**
- Tables created successfully
- All 7 entity types seeded with correct option counts
- TypeScript types generated and importing correctly
- No errors in migration logs
- Seed data query returns expected counts

**Deliverables:**
- 2 SQL files committed
- Updated types.d.ts
- Migration verification report

### Phase 8B: API Layer (Week 2)

**Goal:** TRPC endpoints functional and tested

**Tasks:**
1. Create referenceDataQueries.ts (all CRUD functions)
2. Create referenceDataController.ts (delegates to queries)
3. Create referenceDataSchemas.ts (Zod validation)
4. Create referenceData.ts TRPC router
5. Register router in appRouter.ts
6. Write unit tests for queries
7. Write unit tests for TRPC router
8. Test with Postman/Thunder Client

**Success Criteria:**
- All CRUD operations working via TRPC
- Authorization working (admin-only mutations, public queries)
- Multi-tenant filtering verified
- All unit tests passing
- Cache invalidation working correctly
- Postman collection validated

**Deliverables:**
- 4 new source files
- Test files with coverage >80%
- Postman collection for manual testing

### Phase 8C: Generic Components (Week 3)

**Goal:** ReferenceDataSelect component ready

**Tasks:**
1. Create useReferenceDataTrpc.ts custom hook
2. Create ReferenceDataSelect.tsx component
3. Test with loss_type entity in isolation
4. Verify caching behavior (React Query DevTools)
5. Test icon display with emoji
6. Test clearable functionality
7. Write component tests
8. Test in different screen sizes

**Success Criteria:**
- Component renders correctly
- Options load from database
- Caching works (5 min stale time verified)
- Icons display properly
- onChange callback works
- Loading state shows during fetch
- Disabled state works
- Component tests passing

**Deliverables:**
- 2 new component files
- Component test file
- Demo page showing component

### Phase 8D: Admin UI (Week 4)

**Goal:** Admin can manage reference data

**Tasks:**
1. Create ReferenceDataTab.tsx (main admin view)
2. Create ReferenceOptionDialog.tsx (CRUD dialog)
3. Create ReferenceOptionActionsCell.tsx (DataGrid actions)
4. Add "Reference Data" tab to admin layout
5. Test all CRUD operations through UI
6. Test confirmation messages
7. Test inactive option visibility
8. Test system default protection

**Success Criteria:**
- Admin can view all 7 entity types via tabs
- Admin can create new options with all fields
- Admin can edit existing options
- Admin can activate/deactivate options
- Admin cannot delete system defaults (UI prevents it)
- Confirmation message shows: "This change will be applied across the entire system. Any deactivated options will be preserved for traceability."
- DataGrid updates after mutations
- Inactive options show with reduced opacity

**Deliverables:**
- 3 new admin component files
- Admin UI workflow documented
- Screenshots of each operation

### Phase 8E: Component Migration (Week 5-6)

**Goal:** Old enum components replaced

**Tasks:**
Week 5:
1. Audit all component usages (grep for enum imports)
2. Create migration checklist (component → parent files)
3. Migrate LossTypeSelect → ReferenceDataSelect
4. Test loss_type usage in all parent components
5. Migrate LineOfBusinessSelect (if exists)
6. Test line_of_business usage

Week 6:
7. Migrate CoverageTypeSelect
8. Migrate ClaimSubstatusSelect
9. Migrate all party-related selects
10. Test each replacement thoroughly
11. Mark old components deprecated (@deprecated JSDoc)
12. Update component documentation

**Success Criteria:**
- All usages of old enum selects identified
- Each enum select replaced with ReferenceDataSelect
- No regressions in parent component functionality
- All existing features working (filtering, selection, display)
- Old components marked deprecated
- Migration guide documented

**Deliverables:**
- Component migration log (what changed where)
- Updated components with ReferenceDataSelect
- Deprecation notices on old components
- Test report showing no regressions

### Phase 8F: Cleanup (Week 7)

**Goal:** Remove deprecated code, finalize

**Tasks:**
1. Remove old enum select component files
2. Update enums.ts with deprecation notices and comments
3. Remove unused icon mapping files (if no longer needed)
4. Update project documentation (README, CLAUDE.md)
5. Run full test suite
6. Performance testing (measure cache hit rates)
7. Create admin user guide
8. Code review and final polish

**Success Criteria:**
- Old component files deleted
- All imports updated
- No broken references
- All tests passing (unit + integration)
- Documentation updated
- Cache hit rate >80% (verified with React Query DevTools)
- Admin guide complete

**Deliverables:**
- Cleaned up codebase
- Updated documentation
- Admin user guide
- Performance metrics report
- Final migration report

---

## Risk Management

### High Risk Areas

**1. Data Migration**
- **Risk:** Enum values don't match exactly, breaking existing data
- **Mitigation:** 
  - Careful mapping from enum to reference_option
  - Verification queries before/after
  - Test on copy of production data first
  - Idempotent migration scripts

**2. Performance Impact**
- **Risk:** Too many database queries for reference data slows down app
- **Mitigation:**
  - Aggressive caching (5 min stale time, 10 min cache time)
  - Consider server-side caching layer (Redis) if needed
  - Monitor query counts with React Query DevTools
  - Load testing before production

**3. Type Safety Loss**
- **Risk:** Invalid values slip through without compile-time checks
- **Mitigation:**
  - Comprehensive runtime validation in controllers
  - Zod schema validation at API boundary
  - Admin UI validation prevents invalid states
  - Integration tests for validation logic
  - Clear error messages

**4. Breaking Changes During Migration**
- **Risk:** Components break when switching from enum to database
- **Mitigation:**
  - Dual-run old and new systems during transition
  - Thorough testing of each component replacement
  - Gradual rollout, one component at a time
  - Keep old components until all usages replaced

### Medium Risk Areas

**1. Cache Invalidation**
- **Risk:** Users see stale data after admin makes changes
- **Mitigation:**
  - Proper TRPC cache invalidation on mutations
  - Consider shorter cache times initially (2 min)
  - Admin confirmation message explains system-wide impact
  - Test cache invalidation in multiple tabs/users

**2. Multi-tenant Data Isolation**
- **Risk:** Clients see each other's custom reference data
- **Mitigation:**
  - Comprehensive multi-tenant tests
  - Always filter by client_id in queries
  - Code review focused on client_id filtering
  - Integration tests with multiple clients

**3. Icon Display Issues**
- **Risk:** Icons missing, broken, or inconsistent
- **Mitigation:**
  - Fallback icons if icon_emoji not set
  - Optional icon display (showIcon prop)
  - Test various emoji on different platforms
  - Document emoji compatibility

**4. Admin UI Usability**
- **Risk:** Admins confused by interface, make mistakes
- **Mitigation:**
  - Follow existing admin patterns (desk locations)
  - Clear confirmation messages
  - Prevent deletion of system defaults
  - User guide with screenshots
  - Training session for admins

### Low Risk Areas

**1. Sort Order Management**
- **Risk:** Options display in wrong order
- **Mitigation:** Alphabetical sorting by display_label is predictable and intuitive; sort_order column reserved for future custom ordering

**2. Audit Trail**
- **Risk:** Can't track who changed what
- **Mitigation:** created_by, updated_by, deleted_at already in schema

**3. Rollback Complexity**
- **Risk:** Hard to revert if issues found
- **Mitigation:** Since not in production, simple DROP TABLE rollback works

---

## Success Metrics

### Technical Metrics
- All 7 entity types migrated ✓
- Test coverage >80% on query layer ✓
- Zero data loss in migration ✓
- Cache hit rate >80% after warmup ✓
- Page load time unchanged (<5% difference) ✓
- API response time <200ms for getReferenceOptions ✓

### Business Metrics
- Admin can add new option in <2 minutes ✓
- Zero code deployments needed for option changes ✓
- Zero production incidents ✓
- User experience unchanged (no complaints) ✓
- Admin satisfaction >8/10 ✓

### Code Quality Metrics
- TypeScript errors: 0 ✓
- ESLint warnings: 0 ✓
- Failed tests: 0 ✓
- Code review approved ✓
- Documentation complete ✓

---

## Future Enhancements

### V2 Features (Post-Launch, 3-6 months)

**1. Custom Sort Order Management**
- Admin UI for drag-and-drop reordering
- `updateReferenceOptionSortOrders()` bulk mutation endpoint
- Preserve sort_order column values
- Fall back to alphabetical for options with same sort_order

**2. Bulk Import/Export**
- CSV upload for batch option creation
- Export current options for backup/migration
- Validation before import
- Rollback failed imports

**3. Option Dependencies**
- Define relationships between entities
- Example: loss_type depends on line_of_business
- UI shows only relevant options
- Validation enforces dependencies

**4. Custom Validation Rules**
- Per-entity validation logic
- Required field configuration
- Format constraints
- Business rule enforcement

**5. Audit Trail UI**
- View all changes to reference data
- Who changed what, when
- Compare versions
- Restore previous versions

**6. Option Merging**
- Admin can merge duplicate options
- Automatically update all references
- Preserve history
- Undo merge if needed

### V3 Features (Future, 6-12 months)

**1. Multi-language Support**
- Translations for display_label
- Locale-specific icons
- Language detection
- Translation UI for admins

**2. Option Groups/Hierarchy**
- Nested categories
- Parent-child relationships
- Group-level settings
- Hierarchical display in UI

**3. Conditional Display**
- Show/hide options based on other fields
- Complex business rules
- Dynamic option lists
- Context-aware dropdowns

**4. API for External Systems**
- REST API for reference data
- Webhook notifications on changes
- Bulk operations API
- Integration with external tools

**5. Version Control**
- Track changes over time
- Restore to previous state
- Compare versions
- Scheduled rollout of changes

---

## Critical Files for Implementation

### Backend - Database & Migration
1. `/Users/owenfarthing/Desktop/code/manifest/apps/web/src/api/sql/reference_data_infrastructure.sql` - Table definitions, constraints, indexes
2. `/Users/owenfarthing/Desktop/code/manifest/apps/web/src/api/sql/seed_reference_data.sql` - Data migration, seed all 7 entities
3. `/Users/owenfarthing/Desktop/code/manifest/apps/web/src/api/database/types.d.ts` - Generated types (regenerate after migration)

### Backend - Query & Controller
4. `/Users/owenfarthing/Desktop/code/manifest/apps/web/src/api/queries/referenceDataQueries.ts` - All CRUD operations, follows desk location patterns
5. `/Users/owenfarthing/Desktop/code/manifest/apps/web/src/api/controllers/referenceDataController.ts` - Business logic layer

### Backend - API Layer
6. `/Users/owenfarthing/Desktop/code/manifest/apps/web/src/schemas/referenceDataSchemas.ts` - Zod validation schemas
7. `/Users/owenfarthing/Desktop/code/manifest/apps/web/src/server/trpc/routers/referenceData.ts` - TRPC router with authorization
8. `/Users/owenfarthing/Desktop/code/manifest/apps/web/src/server/trpc/appRouter.ts` - Register new router (modify existing)

### Frontend - Hooks & Components
9. `/Users/owenfarthing/Desktop/code/manifest/apps/web/src/hooks/trpc/useReferenceDataTrpc.ts` - Custom TRPC hook with cache invalidation
10. `/Users/owenfarthing/Desktop/code/manifest/apps/web/src/components/common/ReferenceDataSelect.tsx` - Generic select component (replaces all enum selects)

### Frontend - Admin UI
11. `/Users/owenfarthing/Desktop/code/manifest/apps/web/src/components/admin/ReferenceDataTab.tsx` - Main admin UI (follows DeskLocationsTab pattern)
12. `/Users/owenfarthing/Desktop/code/manifest/apps/web/src/components/admin/ReferenceOptionDialog.tsx` - CRUD dialog (follows DeskLocationDialog pattern)
13. `/Users/owenfarthing/Desktop/code/manifest/apps/web/src/components/admin/ReferenceOptionActionsCell.tsx` - DataGrid actions cell

### Frontend - Existing Components to Modify
14. `/Users/owenfarthing/Desktop/code/manifest/apps/web/src/components/common/LossTypeSelect.tsx` - Migrate to ReferenceDataSelect or deprecate
15. Components using LineOfBusiness, CoverageType, ClaimSubstatus enums - Identify via grep, migrate to ReferenceDataSelect

### Configuration & Utilities
16. `/Users/owenfarthing/Desktop/code/manifest/apps/web/src/config/enums.ts` - Update with deprecation notices, keep for documentation
17. `/Users/owenfarthing/Desktop/code/manifest/apps/web/src/lib/utils/referenceDataValidation.ts` - Runtime validation helpers
18. `/Users/owenfarthing/Desktop/code/manifest/apps/web/src/lib/utils/claimUtils.ts` - May need updates for icon handling
19. `/Users/owenfarthing/Desktop/code/manifest/apps/web/src/lib/utils/partyUtils.ts` - May need updates for icon handling

---

## Appendix: Patterns to Follow

### Existing Pattern: Desk Location Management

The reference data system directly mirrors the desk location feature structure:

**Mapping:**
- desk_location_type ↔ reference_list
- desk_location ↔ reference_option
- DeskLocationsTab.tsx ↔ ReferenceDataTab.tsx
- DeskLocationDialog.tsx ↔ ReferenceOptionDialog.tsx
- useDeskTrpc.ts ↔ useReferenceDataTrpc.ts
- deskQueries.ts ↔ referenceDataQueries.ts
- deskController.ts ↔ referenceDataController.ts
- deskSchemas.ts ↔ referenceDataSchemas.ts

### Query Patterns (from deskQueries.ts)

**Multi-tenant filtering:**
- Always: .where('table.client_id', '=', ctx.session.user.client_id)

**Soft deletes:**
- Always: .where('table.deleted_at', 'is', null)
- Delete: .set({ deleted_at: new Date(), updated_by: ctx.session.user.id })

**Audit fields:**
- Create: created_at, created_by
- Update: updated_at, updated_by
- Delete: deleted_at, updated_by (soft delete is an update)

**Pagination:**
- Count query: clear select, count all, run in parallel
- Data query: limit + offset
- Return: { rows, count }

**Sorting:**
- Order by display_label alphabetically (not sort_order)

### TRPC Patterns (from desk.ts)

**Protected procedure structure:**
- All routes use protectedProcedure
- Input validated with Zod schema
- Queries: return controller result
- Mutations: requireRole for admin operations

**Authorization pattern:**
- Queries (read): All authenticated users allowed
- Mutations (write): requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN])

**Controller delegation:**
- Router just validates and delegates
- Controller calls query functions
- No business logic in router

### React Query Caching (from useDeskTrpc.ts)

**Cache configuration:**
- staleTime: 5 * 60 * 1000 (5 minutes)
- cacheTime: 10 * 60 * 1000 (10 minutes)
- Aggressive caching for reference data

**Invalidation pattern:**
- useMutation onSuccess callback
- utils.namespace.queryName.invalidate()
- Invalidate related queries (both specific and list queries)

### Component Patterns (from DeskLocationsTab.tsx)

**Layout structure:**
- Fade in animation (timeout: 1000)
- Paper container with border
- Toolbar with title + action button
- DataGridPro with custom columns
- Custom empty state overlay

**DataGrid configuration:**
- columnHeaderHeight: 45
- rowHeight: 60
- hideFooter: true
- disableColumnSelector, disableRowSelectionOnClick, disableColumnMenu
- Custom loading overlay (linear-progress)

**Dialog management:**
- State: showDialog boolean
- Toggle function opens/closes
- Conditional render: {showDialog && <Dialog />}
- Dialog calls onClose to hide

### Admin Dialog Patterns (from DeskLocationDialog.tsx)

**Form structure:**
- React Hook Form with Controller
- Zod validation rules
- mode: 'onChange' for live validation
- isDirty check prevents no-op updates

**Action configuration:**
- primaryAction: label, onClick, icon, disabled
- onClose: callback to parent
- width: 500 (standard dialog width)

**Field patterns:**
- TextField with variant="standard"
- FormControlLabel for switches
- Error display with helperText
- Disabled during isSubmitting

---

## Conclusion

This implementation plan provides a comprehensive roadmap for migrating 8 hardcoded business enums to a flexible, database-driven reference data management system. The plan leverages proven patterns from the existing desk location feature to minimize risk and accelerate development.

Key benefits of this approach:
1. **Business Agility** - Admins can modify reference data without code deployments
2. **Multi-tenant Flexibility** - Each client can customize their options
3. **Audit Trail** - Full history of changes preserved with soft deletes
4. **Proven Patterns** - Follows existing desk location implementation
5. **Type Safety** - Runtime validation compensates for loss of compile-time checks
6. **Incremental Delivery** - 8 week phased approach with clear milestones

The phased rollout strategy allows for validation at each step, with clear success criteria and rollback options. By following the desk location patterns, the implementation becomes more predictable and maintainable.

Total estimated effort: 7-8 weeks for complete implementation including testing and migration.
