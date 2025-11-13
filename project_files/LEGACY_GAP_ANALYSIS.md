# Legacy Oracle Manifest vs. Current System - Gap Analysis

**Date:** 2025-11-11
**Purpose:** Detailed comparison of legacy system components to current implementation
**Context:** Inform development priorities for Hanover engagement (January 2025)

---

## Executive Summary

The current Manifest system successfully implements the **core workflow engine** (checklist-driven process) but lacks several **operational components** critical to full subrogation lifecycle management. This analysis maps the 8 major components from the legacy Oracle system to the current implementation and recommends priorities.

### High-Level Status
- **✅ Fully Implemented:** 4 of 8 components (50%)
- **🟡 Partially Implemented:** 3 of 8 components (38%)
- **❌ Not Implemented:** 1 of 8 components (12%)

---

## Component-by-Component Analysis

---

## 1. Client Companies ✅ FULLY IMPLEMENTED

### Legacy Oracle System
**Structure:**
- Client Company (top level)
  - Client Underwriting Companies
  - Client Offices
    - Client Adjusters (imported from feed with contact info)

**Purpose:** Hierarchical organization structure to manage multi-company clients with distributed offices and staff.

### Current Implementation
**Database Tables:**
- `client` table (client_id is primary tenant identifier)
- `user` table includes `client_id` for multi-tenant isolation

**Features:**
- ✅ Client-level data scoping (all queries use `applyClientScope()`)
- ✅ Multi-tenant architecture with client_id partitioning
- ✅ User → Client assignment
- ✅ Feed-based data import capability

**Gaps:**
- ❌ No underwriting company hierarchy
- ❌ No office/location structure
- ❌ No adjuster-specific metadata (imported adjusters not stored separately)

**Gap Severity:** LOW
- Current flat structure sufficient for MVP
- Underwriting company hierarchy is organizational metadata, not workflow-critical
- Office structure becomes important for regional reporting (future)

**Recommendation:**
- **Defer** - Keep flat structure for Hanover engagement
- Add underwriting company as optional field on `client` table if needed
- Build full hierarchy only if multiple clients request it

---

## 2. Users ✅ FULLY IMPLEMENTED

### Legacy Oracle System
**Structure:**
- Users (top level)
  - Roles (define permissions and navigation)
  - Client Company (data access scope)
  - Administration (time tracking, task balancing, holidays)

**Key Concept:** Users assigned BOTH roles AND client company access to determine functionality.

### Current Implementation
**Database Tables:**
- `user` table with `role`, `client_id`, `email`, `phone`, audit fields

**Features:**
- ✅ Role-based access control (Super Admin, Admin, Contributor)
- ✅ Client company assignment via `client_id`
- ✅ Authorization enforced at router level
- ✅ Comprehensive authorization audit completed (Oct 2025)
- ✅ Field-level permissions (e.g., contributors can't modify role)

**Gaps:**
- ❌ No time tracking/task balancing system
- ❌ No holiday calendar management
- ❌ No workload capacity management

**Gap Severity:** MEDIUM (for Hanover)
- Legacy "Administration" component managed task inventory across staff
- Important for tracking consultant time during engagement
- Workload balancing needed when team scales

**Recommendation:**
- **Build if Hanover requests** - Simple time tracking for billable hours
- Defer complex capacity management
- Holiday calendar can be handled externally for now

---

## 3. Claim 🟡 PARTIALLY IMPLEMENTED

### Legacy Oracle System
**Complex Multi-Component Structure:**

#### Core Claim Fields
- Line of Business (with Loss Type hierarchy)
- Coverages (with Financials sub-component)
- Entities (parties involved with Type/Subtype hierarchy)
- Status/Substatus (granular lifecycle states)
- Desk Location Type → Desk Location (workflow queue system)
- Task Type (linked to desk location)
- Diary (user entry for notes/communication log)

#### Financial Sub-Components
- Claim Payment Drafts
- Settlements
- Recoveries (subrogation payments)

**Key Features:**
- Automated field population via data feed
- Rule-based value assignment (status, desk location)
- Workflow-driven status transitions

### Current Implementation
**Database Tables:**
- `claim` table with core fields: claim_number, insured, date_of_loss, client_id
- `recovery_status` field (recently added)
- `expected_recovery`, `actual_recovery` fields
- `recovery_event` table for tracking recovery payments

**Features:**
- ✅ Basic claim data (number, insured, DOL, amounts)
- ✅ Feed-based import via `feeds` table
- ✅ Client scoping
- ✅ Recovery tracking infrastructure (Oct 2025)
- ✅ Basic status field

**Gaps:**
- ❌ **No Line of Business hierarchy** (critical for insurance classification)
- ❌ **No Loss Type structure** (e.g., Auto, Property, Liability)
- ❌ **No Coverages tracking** (e.g., Collision, Comprehensive, Property Damage)
- ❌ **No Entities/Party management** (see Component 4)
- ❌ **No Status/Substatus workflow** (only single status field)
- ❌ **No Desk Location queue system** (legacy routing mechanism)
- ❌ **No Task Type system** (task management is ad-hoc)
- ❌ **No structured Diary/Communication log** (only generic comments)
- ❌ **No Claim Payment Drafts tracking**
- ❌ **No Settlements structure** (beyond recovery events)

**Gap Severity:** HIGH (foundational data missing)

### Recommended Priorities

#### Must Build (Before Hanover)
1. **Line of Business + Loss Type**
   - Enum in TypeScript: `LineOfBusiness`, `LossType`
   - Add fields to `claim` table: `line_of_business`, `loss_type`
   - Used for reporting, filtering, and business rules
   - Effort: 1 day

#### Should Build (Month 1 of Hanover)
2. **Coverages Structure**
   - New table: `claim_coverage` (claim_id, coverage_type, amount)
   - Enum: `CoverageType` (Collision, Comprehensive, etc.)
   - Important for tracking what types of damages are being pursued
   - Effort: 2 days

3. **Status/Substatus Workflow** ✅ MINIMAL IMPLEMENTATION COMPLETE (2025-11-12)
   - ✅ Added `substatus` field to `claim` table
   - ✅ Enum: `ClaimSubstatus` (investigation, demand_sent, negotiation, settlement_reached, litigation, closed_recovered, closed_no_recovery, cancelled)
   - ✅ Used in `getActiveClaimAssociations()` to determine active vs closed claims
   - ⏳ TODO: Add UI for setting/updating substatus (deferred)
   - ⏳ TODO: Add workflow rules/transitions (deferred)
   - Better than single status field for workflow tracking
   - Effort: 0.5 day (minimal), 1 day (full UI + workflow)

#### Consider Building (Month 2-3)
4. **Communication Log** (separate from generic comments)
   - New table: `claim_communication` (claim_id, communication_type, direction, party_id, date, notes)
   - Enum: `CommunicationType` (Phone, Email, Letter, Meeting)
   - Enum: `Direction` (Inbound, Outbound)
   - More structured than current comment system
   - Effort: 3 days

#### Defer (Not MVP)
5. **Desk Location Queue System**
   - Complex automated routing
   - Current checklist + manual assignment works for MVP
   - Build only if Hanover has large team needing automation

6. **Claim Payment Drafts**
   - Not core to subrogation workflow
   - Client likely tracks in their system

---

## 4. Facilitators ✅ FULLY IMPLEMENTED

### Legacy Oracle System
**Structure:**
- Facilitators (parties representing the loss but not directly involved)
  - Facilitator Type → Facilitator Name → Facilitator Office → Facilitator Rep
  - Vendor Type → Vendor Name → Vendor Office

**Party Types:**
- Adverse Carriers (opposing insurance companies)
- Attorneys (representing either party)
- Experts (appraisers, engineers, medical professionals)
- Vendors (service providers)

**Key Concept:** Facilitators are external representatives, distinct from Entities (parties directly involved in the loss event).

### Current Implementation
**Status:** ✅ Fully implemented (November 2025)

**Database Tables:**
- ✅ `party` - Core party/facilitator information with client scoping
- ✅ `party_office` - Office locations with soft delete support
- ✅ `party_representative` - Individual contacts with soft delete support
- ✅ `claim_party` - Link parties to claims (ready for use)

**Features:**
- ✅ Full CRUD operations for parties, offices, and representatives
- ✅ Soft delete (archive/restore) with deleted_at/deleted_by tracking
- ✅ Admin logging for all archive/restore operations
- ✅ Server-side pagination with search across all entities
- ✅ Hierarchical structure: Party → Office → Representative
- ✅ Primary flag management (auto-unset other primaries)
- ✅ Client-scoped queries using applyClientScope()
- ✅ Archive filtering (show only archived OR only active)
- ✅ Dependency-aware UI (office selection requires party first)
- ✅ Parent-child relationship handling (party archived disables representative actions)
- ✅ Association relationship handling (office archived shows warning but allows representative actions)

**UI Components:**
- ✅ Admin navigation in party management section
- ✅ Parties tab with table, search, pagination, archive toggle
- ✅ Offices tab with table, search, pagination, archive toggle
- ✅ Representatives tab with table, search, pagination, archive toggle
- ✅ Party dialog for create/edit with organization field
- ✅ Office dialog with party autocomplete, address, contact info
- ✅ Representative dialog with party/office autocomplete, contact fields
- ✅ Actions cells with edit, archive, and restore buttons
- ✅ Visual indicators for archived parties/offices
- ✅ Tooltips explaining why actions are disabled

**Cache Invalidation Strategy:**
- ✅ Party operations invalidate: parties, offices, representatives
- ✅ Office operations invalidate: offices, representatives
- ✅ Representative operations invalidate: representatives only

**Gaps:**
- ⏳ `claim_party` linking not yet exposed in UI (table exists, ready to use)
- ⏳ No party categorization (adverse_carrier, attorney, etc.) - can add when needed
- ⏳ No role-specific fields on claim_party (liability_percentage, coverage_amount) - can add when needed

**Gap Severity:** NONE (core functionality complete, extensions available as needed)

### Implementation Files

**Backend:**
- `apps/web/src/api/queries/partyQueries.ts` - All database queries
- `apps/web/src/api/controllers/partyController.ts` - Business logic and logging
- `apps/web/src/schemas/partySchemas.ts` - Zod validation schemas
- `apps/web/src/server/trpc/routers/party.ts` - tRPC endpoints
- `apps/web/src/hooks/trpc/usePartyTrpc.ts` - Frontend tRPC hooks

**State Management:**
- `apps/web/src/stores/useAdminStore.ts` - Zustand state for admin UI

**UI Components:**
- `apps/web/src/components/admin/PartiesTab.tsx` - Main parties table
- `apps/web/src/components/admin/PartyDialog.tsx` - Create/edit party form
- `apps/web/src/components/admin/PartyActionsCell.tsx` - Edit/archive/restore actions
- `apps/web/src/components/admin/OfficesTab.tsx` - Main offices table
- `apps/web/src/components/admin/OfficeDialog.tsx` - Create/edit office form
- `apps/web/src/components/admin/OfficeActionsCell.tsx` - Edit/archive/restore actions
- `apps/web/src/components/admin/RepresentativesTab.tsx` - Main representatives table
- `apps/web/src/components/admin/RepresentativeDialog.tsx` - Create/edit representative form
- `apps/web/src/components/admin/RepresentativeActionsCell.tsx` - Edit/archive/restore actions
- `apps/web/src/app/(protected)/admin/party-management/parties/page.tsx` - Parties route
- `apps/web/src/app/(protected)/admin/party-management/offices/page.tsx` - Offices route
- `apps/web/src/app/(protected)/admin/party-management/representatives/page.tsx` - Representatives route

### Future Enhancements
- Link parties to claims via claim detail page UI
- Add party categorization enums (adverse_carrier, attorney, expert, vendor)
- Add role-specific fields on claim_party (liability_percentage, coverage_amount)
- Communication log linked to parties
- Letter template integration with party data

---

## 5. Claim Delivery ❌ NOT IMPLEMENTED

### Legacy Oracle System
**Structure:**
- Claim Delivery (top level)
  - Query Definition (rules for which claims match)
  - Query Assignment (assign query to desk location)
  - User Assignment (assign user to desk location)

**Purpose:** Automated claim routing based on configurable rules.

**Example Rules:**
- "All auto claims in NY with loss > $10k → Senior Adjuster desk"
- "All property claims < 30 days old → New Claims desk"
- "All litigation claims → Attorney Review desk"

### Current Implementation
**Status:** Not implemented

**Current Approach:**
- Manual claim assignment via `assignClaim` tRPC endpoint
- `checklist_claim` table tracks `assignee`
- No automated routing rules
- No queue management beyond filters

**Gap Severity:** MEDIUM (automation vs. manual)
- Automated routing is **nice to have**, not required for MVP
- Manual assignment works fine for small teams
- Becomes valuable at scale (100+ claims/day)

**Recommendation:**
- **Defer** - Manual assignment sufficient for Hanover engagement
- Build only if Hanover has large team and high claim volume
- Simpler alternative: Saved filters + manual assignment

**Future Implementation (If Needed):**
- Add `claim_routing_rule` table
- Add `desk_location` table (or use checklist as proxy)
- Background job evaluates rules on claim insert/update
- Auto-assigns to desk location queue

---

## 6. Letters 🟡 PARTIALLY IMPLEMENTED

### Legacy Oracle System
**Structure:**
- Letters (top level)
  - Claim Letters
  - Recovery Check Letters (separate, accessed via Check Processing)
    - Letter Text (template)
    - Letter Assignment (link template to client/situation)

**Key Features:**
- Shared templates across clients
- Client code lookup for variable population
- Correct client/underwriting company info auto-populated
- Separate letter types for different purposes

### Current Implementation
**Database Tables:**
- `doc` table for document storage (S3)
- `doc_type` field (but no template system)

**Features:**
- ✅ Document upload/download
- ✅ S3 storage
- ✅ Basic categorization via `doc_type`

**Gaps:**
- ❌ No letter templates
- ❌ No variable substitution (claim data → template)
- ❌ No letter generation workflow
- ❌ No letter assignment/configuration
- ❌ No client-specific customization

**Gap Severity:** MEDIUM (manual workaround exists)
- Users can upload manually-created letters
- Copy/paste from Word templates works for MVP
- Becomes important at scale

**Recommendation:**
- **Defer** - Not critical for Hanover MVP (Phase 1)
- Build in Month 3-4 if Hanover sends many demand letters
- **Alternative:** Provide Word templates for manual use

**Future Implementation (Phase 2):**
```sql
CREATE TABLE letter_template (
  id SERIAL PRIMARY KEY,
  client_id INT REFERENCES client(id), -- NULL = shared across clients
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL, -- 'demand', 'followup', 'settlement_offer', etc.
  subject_line TEXT,
  body_html TEXT NOT NULL, -- HTML with {{claim.claim_number}} placeholders
  body_text TEXT, -- Plain text version
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by INT REFERENCES "user"(id)
);

CREATE TABLE generated_letter (
  id SERIAL PRIMARY KEY,
  claim_id INT NOT NULL REFERENCES claim(id),
  template_id INT REFERENCES letter_template(id),
  recipient_party_id INT REFERENCES party(id),
  subject_line TEXT,
  body_html TEXT,
  body_text TEXT,
  sent_date TIMESTAMPTZ,
  doc_id INT REFERENCES doc(id), -- Link to stored PDF
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by INT REFERENCES "user"(id)
);
```

---

## 7. Tasks 🟡 PARTIALLY IMPLEMENTED

### Legacy Oracle System
**Structure:**
- Tasks (top level)
  - Task Type (assigned to desk locations)

**Configuration Per Task Type:**
- Expected completion time (duration to complete)
- Default due date delay (e.g., 30 days from assignment)
- Task description text (what needs to be done)

**Purpose:** Standardized task tracking with time-based performance metrics.

### Current Implementation
**Database Tables:**
- Checklist system serves as task management
- `page_instance` represents workflow stages
- `page_instance_status` tracks completion state

**Features:**
- ✅ Task representation via checklist pages
- ✅ Status tracking (UNSTARTED, IN_PROGRESS, COMPLETE)
- ✅ Hierarchical task structure (nested pages)
- ✅ Conditional task unlocking (answer-driven)

**Gaps:**
- ❌ No task type categorization
- ❌ No expected completion time tracking
- ❌ No due date management
- ❌ No task time metrics (how long tasks actually take)
- ❌ No performance reporting (time to complete by task type)

**Gap Severity:** MEDIUM (basic tracking exists, metrics missing)
- Checklists provide task structure
- Missing time-based accountability
- Important for Hanover billable hour tracking

**Recommendation:**
- **Add due dates to checklists** (Month 1 of Hanover)
- Track actual time spent (if Hanover requests)
- Performance metrics can wait until more data collected

**Quick Enhancement (Build Now):**
```sql
ALTER TABLE page_instance ADD COLUMN due_date DATE;
ALTER TABLE page_instance ADD COLUMN completed_date TIMESTAMPTZ;
ALTER TABLE page_instance ADD COLUMN estimated_hours DECIMAL(5,2);
ALTER TABLE page_instance ADD COLUMN actual_hours DECIMAL(5,2);
```

---

## 8. Check Processing 🟡 PARTIALLY IMPLEMENTED

### Legacy Oracle System
**Structure:**
- Check Processing (top level)
  - Check Ledger (payment records)
    - Check Status (cleared, pending, returned, etc.)
  - Check Images (scanned check images)

**Assignment Logic:**
- Checks assigned to: Client + Settlement + Coverage
- Links to corresponding Loss Type

**Purpose:** Track physical recovery checks through processing workflow.

### Current Implementation
**Database Tables:**
- `recovery_event` table (recently built, Oct 2025)

**Features:**
- ✅ Recovery amount tracking
- ✅ Recovery date
- ✅ Recovery source (text field)
- ✅ Notes
- ✅ Link to claim

**Gaps:**
- ❌ No check-specific fields (check number, bank, account)
- ❌ No check status workflow (pending, cleared, returned)
- ❌ No check images (scanned copies)
- ❌ No ledger reconciliation
- ❌ No link to coverage (what type of damage this check pays for)
- ❌ No settlement structure (checks link to settlements, settlements link to claims)

**Gap Severity:** LOW (for subrogation focus)
- Recovery amount tracking is core need (✅ implemented)
- Physical check processing is accounting function
- Likely handled by client's finance department
- Check images useful for audit trail

**Recommendation:**
- **Defer** - Current recovery event tracking sufficient
- Add check number field if Hanover requests
- Check images can be uploaded as docs (workaround)
- Full check processing system not needed for MVP

**Optional Enhancement (If Requested):**
```sql
ALTER TABLE recovery_event ADD COLUMN check_number TEXT;
ALTER TABLE recovery_event ADD COLUMN check_status TEXT; -- 'pending', 'cleared', 'returned', 'voided'
ALTER TABLE recovery_event ADD COLUMN bank_name TEXT;
ALTER TABLE recovery_event ADD COLUMN deposit_date DATE;
ALTER TABLE recovery_event ADD COLUMN cleared_date DATE;
ALTER TABLE recovery_event ADD COLUMN check_image_doc_id INT REFERENCES doc(id);
```

---

## Priority Matrix

### Must Build (Before Hanover - Week 1-4)
| Component | Feature | Effort | Impact | Priority |
|-----------|---------|--------|--------|----------|
| Claim | Line of Business + Loss Type | 1 day | High | 🔴 P0 |
| Tasks | Due Date tracking | 0.5 day | Medium | 🟡 P1 |

**Total Effort:** ~1.5 days

### Should Build (Month 1 of Hanover)
| Component | Feature | Effort | Impact | Priority |
|-----------|---------|--------|--------|----------|
| Claim | Coverages Structure | 2 days | High | 🟡 P1 |
| Tasks | Time tracking (estimated/actual hours) | 2 days | Medium | 🟡 P1 |

**Total Effort:** ~4 days

### Consider Building (Month 2-3)
| Component | Feature | Effort | Impact | Priority |
|-----------|---------|--------|--------|----------|
| Claim | Communication Log | 3 days | Medium | 🟢 P2 |
| Letters | Template System | 5 days | Medium | 🟢 P2 |
| Check Processing | Check number & status | 0.5 day | Low | 🟢 P2 |

**Total Effort:** ~9 days

### Defer (Post-Hanover or Client Request)
| Component | Feature | Effort | Impact | Priority |
|-----------|---------|--------|--------|----------|
| Client Companies | Underwriting company hierarchy | 2 days | Low | ⚪ P3 |
| Users | Time tracking & task balancing | 5 days | Medium | ⚪ P3 |
| Claim Delivery | Automated routing rules | 7 days | Low | ⚪ P3 |
| Check Processing | Full ledger & reconciliation | 5 days | Low | ⚪ P3 |

---

## Database Impact Summary

### New Tables Required (P0/P1)
1. ✅ `party` - External parties and entities (COMPLETED 2025-11)
2. ✅ `claim_party` - Link parties to claims with roles (COMPLETED 2025-11, UI integration pending)
3. ✅ `party_office` - Office locations (COMPLETED 2025-11)
4. ✅ `party_representative` - Individual contacts (COMPLETED 2025-11)
5. `claim_coverage` - Coverage types and amounts

### Table Modifications Required (P0/P1)
1. `claim` table:
   - Add `line_of_business` TEXT
   - Add `loss_type` TEXT
   - ✅ Add `substatus` TEXT (COMPLETED 2025-11-12)

2. `page_instance` table:
   - Add `due_date` DATE
   - Add `completed_date` TIMESTAMPTZ
   - Add `estimated_hours` DECIMAL(5,2)
   - Add `actual_hours` DECIMAL(5,2)

### Enum Additions Required
- `LineOfBusiness`
- `LossType`
- ✅ `ClaimSubstatus` (COMPLETED 2025-11-12)
- `CoverageType`
- `PartyType`
- `FacilitatorCategory`
- `EntityCategory`
- `ClaimPartyRole`

---

## Risk Assessment

### High Risk (Build Now)
None - All critical infrastructure now in place

### Medium Risk (Build Month 1)
**Coverage Structure**
- **Risk:** Cannot accurately attribute recoveries to damage types
- **Impact:** Reporting unclear, recovery allocation incorrect
- **Appears in workflow:** Phase 4 (document assembly), Phase 9 (check processing)
- **Mitigation:** Build when first demand letters sent

**Status/Substatus**
- **Risk:** Coarse-grained claim status hides workflow bottlenecks
- **Impact:** Cannot identify where claims get stuck
- **Appears in workflow:** Every phase
- **Mitigation:** Add substatus field early for better tracking

### Low Risk (Defer)
**Automated Routing**
- **Risk:** Manual assignment may not scale
- **Impact:** Admin overhead increases with claim volume
- **Mitigation:** Manual assignment works for teams <10 people

**Letter Templates**
- **Risk:** Manual letter creation takes time
- **Impact:** Slower demand package generation
- **Mitigation:** Word templates work as interim solution

---

## Strategic Recommendations

### Pre-Hanover (December 2024)
**"Hidden Plumbing" Strategy - Build Database Foundations**

1. ✅ **Party Management** (COMPLETED November 2025)
   - ✅ Created all 4 party tables (party, claim_party, party_office, party_representative)
   - ✅ Added soft delete support with archive/restore
   - ✅ Built complete tRPC API layer
   - ✅ Full admin UI with search, pagination, archive toggle

2. **Claim Enhancements** (1.5 days)
   - Add LOB, loss_type fields
   - Create enums
   - Add to Kysely types
   - Note: substatus already added ✅

3. **Task Due Dates** (0.5 day)
   - Add due_date to page_instance
   - Update schemas

**Total: 2 days remaining**

### Month 1 of Hanover (January 2025)
**"Turn On Features As Needed"**

1. **Party-Claim Linking UI** (2 days)
   - Party search/add modal on claim detail
   - Party list view on claim
   - Link parties to claims with role

2. **Coverage Tracking** (2 days)
   - Coverage table and UI
   - Link to recoveries

3. **Due Date Display** (1 day)
   - Show due dates on checklist
   - Flag overdue items

**Total: 5 days during engagement**

### Month 2-3 of Hanover (Feb-March 2025)
**"Client-Driven Features" - Build What They Actually Use**

Let Hanover workflow reveal what they need:
- Are they sending many letters? → Build templates
- Complex party relationships? → Add office/rep hierarchy
- Need detailed time tracking? → Build task time logging
- Communication tracking important? → Build communication log

---

## Conclusion

The current Manifest system successfully implements the **core workflow engine** via the checklist system and has made significant progress on **operational components** critical for day-to-day subrogation work.

### Completed Infrastructure (November 2025)
1. ✅ **Party/Facilitator Management** - Full CRUD, soft delete, admin UI with search/pagination
2. ✅ **Recovery Tracking** - Events, status, amounts, dates
3. ✅ **Claim Substatus** - Granular workflow tracking beyond basic status
4. ✅ **Multi-tenant Architecture** - Client scoping, authorization audit complete

### Remaining Gaps (Pre-Hanover)
1. **Claim structure needs enrichment** - LOB, loss type, coverages provide essential classification
2. **Task management needs time dimension** - Due dates and time tracking enable accountability
3. **Party-claim linking UI** - Backend ready, need UI to assign parties to claims

### Recommended Action Plan
With party management now complete, focus on:
- **December:** Claim enhancements (LOB, loss type) + task due dates (2 days)
- **January:** Party-claim linking UI + coverage tracking (4 days)
- **February-March:** Client-driven features (letter templates, communication log) (15 days budget)

The system is now well-positioned for the Hanover engagement with foundational party infrastructure in place.

---

**Document Version:** 1.1
**Last Updated:** 2025-11-12
**Next Review:** Pre-Hanover (late December 2024)
