# Legacy Oracle Manifest vs. Current System - Gap Analysis

**Version:** 1.3
**Last Updated:** 2025-11-18
**Purpose:** Detailed comparison of legacy system components to current implementation
**Context:** Inform development priorities for Hanover engagement (January 2025)

---

## Executive Summary

The current Manifest system successfully implements the **core workflow engine** (checklist-driven process) and has recently added comprehensive **document management infrastructure**. This analysis maps the 9 major components from the legacy Oracle system to the current implementation and recommends priorities.

### High-Level Status
- **✅ Fully Implemented:** 6 of 9 components (67%)
- **🟡 Partially Implemented:** 2 of 9 components (22%)
- **❌ Not Implemented:** 1 of 9 components (11%)

**Recent Progress (October-November 2025):**
- ✅ **Document Management System** - Full implementation with Azure blob storage, folder structure, upload/download, preview capabilities, and standalone documents page
- ✅ **Party Management** - Complete CRUD with soft delete, admin logging, and hierarchical structure
- ✅ **Claim Enhancement (Component 3)** - Now FULLY IMPLEMENTED with LOB, Loss Type, Coverages, and Party linking
- ✅ **Admin Activity Logging** - Complete audit trail system for all administrative actions
- ✅ **Line of Business & Loss Type** - Full implementation with enums, UI selects, and database constraints
- ✅ **Coverages Structure** - Complete with claim_coverage table, full CRUD UI, and integration with claims
- ✅ **Party-Claim Linking** - Full UI integration with representative support in ClaimChanges component

**Note:** The document management system (Component 9) provides the infrastructure foundation needed for Component 6 (Letters/Templates), significantly reducing the remaining gap in that area.

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

## 3. Claim ✅ FULLY IMPLEMENTED

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
- ✅ `line_of_business` field with CHECK constraint (Nov 2025)
- ✅ `loss_type` field with CHECK constraint (Nov 2025)
- ✅ `substatus` field for workflow tracking (Nov 2025)
- `recovery_status` field
- `expected_recovery`, `actual_recovery` fields
- `recovery_event` table for tracking recovery payments
- ✅ `claim_coverage` table for tracking coverages (Nov 2025)
- ✅ `claim_party` table with representative_id for party linking (Nov 2025)

**Features:**
- ✅ Basic claim data (number, insured, DOL, amounts)
- ✅ Feed-based import via `feeds` table
- ✅ Client scoping
- ✅ Recovery tracking infrastructure (Oct 2025)
- ✅ **Line of Business tracking** - Enum support (auto, property, general_liability, workers_comp, professional_liability)
- ✅ **Loss Type tracking** - Enum support (collision, comprehensive, fire, theft, water_damage, wind, vandalism, bodily_injury, property_damage, etc.)
- ✅ **Coverages Structure** - Full CRUD with claim_coverage table (collision, comprehensive, liability, UM, medical payments, PIP, dwelling, personal property, loss of use)
- ✅ **Party/Entity linking** - claim_party table with representative support and database constraints
- ✅ **Status/Substatus workflow** - Substatus field with enum (investigation, demand_sent, negotiation, settlement_reached, litigation, closed_recovered, closed_no_recovery, cancelled)
- ✅ **Admin Activity Logging** - Complete audit trail for claim operations

**UI Components:**
- ✅ LineOfBusinessSelect - Dropdown with icons for LOB selection
- ✅ LossTypeSelect - Dropdown with icons for loss type selection
- ✅ ClaimantsCoverageTab - Full coverage management UI with CRUD operations
- ✅ CoverageTypeSelect - Dropdown with icons for coverage types
- ✅ ClaimChanges component - Integrated party/representative linking with autocomplete
- ✅ ClaimDetailPanel - Comprehensive claim detail view with all metadata

**Gaps (Deferred):**
- ⏳ **Desk Location queue system** - Legacy routing mechanism (manual assignment sufficient for MVP)
- ⏳ **Task Type system** - Checklist system serves this purpose
- ⏳ **Structured Diary/Communication log** - Generic comments work for MVP
- ⏳ **Claim Payment Drafts tracking** - Not core to subrogation workflow
- ⏳ **Settlements structure** - Recovery events sufficient for MVP

**Gap Severity:** CLOSED → LOW (core features complete, advanced features deferred)

### Implementation Summary

#### ✅ Completed (November 2025)
1. **Line of Business + Loss Type** ✅ COMPLETE (2025-11-14)
   - ✅ Added `line_of_business` and `loss_type` fields to claim table
   - ✅ Created TypeScript enums: `LineOfBusiness`, `LossType`
   - ✅ Database CHECK constraints for data validation
   - ✅ UI components: `LineOfBusinessSelect`, `LossTypeSelect` with icons
   - ✅ Integrated into ClaimChanges component
   - ✅ Indexes for performance: `idx_claim_line_of_business`, `idx_claim_loss_type`

2. **Coverages Structure** ✅ COMPLETE (2025-11-14)
   - ✅ Created `claim_coverage` table with client scoping
   - ✅ Enum: `CoverageType` with 10 coverage types
   - ✅ Full tRPC API: queries, controller, router
   - ✅ Complete UI: `ClaimantsCoverageTab`, `CoverageFormDialog`, `CoverageTypeSelect`
   - ✅ CRUD operations with optimistic updates and cache invalidation
   - ✅ Database constraints: FK to claim with CASCADE delete

3. **Status/Substatus Workflow** ✅ COMPLETE (2025-11-12)
   - ✅ Added `substatus` field to claim table
   - ✅ Enum: `ClaimSubstatus` with 8 workflow states
   - ✅ UI component: `RecoveryStatusSelect` integrated into ClaimChanges
   - ✅ Used in claim lifecycle queries
   - ✅ Workflow tracking ready for reporting

4. **Party/Representative Linking** ✅ COMPLETE (2025-11-18)
   - ✅ Added `representative_id` to `claim_party` table
   - ✅ Database constraints: unique primary party per role per claim
   - ✅ Full UI integration in ClaimChanges component with autocomplete
   - ✅ Link/unlink/replace party relationships with admin logging
   - ✅ Cache invalidation strategy for party changes

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
- ✅ `claim_party` linking fully integrated in UI (completed 2025-11-18)
- ⏳ No party categorization (adverse_carrier, attorney, etc.) - can add when needed
- ⏳ No role-specific fields on claim_party (liability_percentage, coverage_amount) - can add when needed

**Gap Severity:** NONE (all core functionality complete)

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
- `doc` table for document storage (Azure Blob Storage)
- `doc_group` table for folder organization
- `doc_type` field (but no template system)

**Features:**
- ✅ Document upload/download (Azure Blob Storage)
- ✅ Complete document management infrastructure (see Component 9)
- ✅ Folder organization and navigation
- ✅ Document preview capabilities
- ✅ Basic categorization via `doc_type`
- ✅ Client-scoped document access
- ✅ File upload answer types for checklists

**✅ Infrastructure Complete (November 2025):**
Component 9 (Document Management System) provides the complete foundation for letter management:
- Document storage and retrieval ✅
- Folder organization ✅
- Upload/download capabilities ✅
- Preview functionality ✅
- Client scoping ✅

**Gaps (Template Logic Only):**
- ❌ No letter templates table/schema
- ❌ No variable substitution engine (claim data → template)
- ❌ No letter generation workflow/UI
- ❌ No letter assignment/configuration
- ❌ No client-specific template customization

**Gap Severity:** LOW → MEDIUM (infrastructure solved, template logic remains)
- Infrastructure for document storage/display is complete
- Only template variable substitution logic needs to be built
- Users can upload manually-created letters as workaround
- Copy/paste from Word templates works for MVP
- Becomes important at scale

**Recommendation:**
- **Defer template logic** - Not critical for Hanover MVP (Phase 1)
- Build template system in Month 3-4 if Hanover sends many demand letters
- **Infrastructure already complete** - Document storage/display ready (Component 9)
- **Current workaround:** Provide Word templates for manual use
- Estimated remaining effort: ~2-3 days for template logic only (reduced from 4 days due to infrastructure completion)

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

## 9. Document Management System ✅ FULLY IMPLEMENTED

### Legacy Oracle System
**Structure:**
- Document Repository
  - Client Documents (policies, correspondence)
  - Claim Documents (photos, estimates, invoices)
  - Template Library (letter templates)
- Document Categorization (by type, claim, client)
- Document Versioning
- Search and Retrieval

**Purpose:** Centralized storage and management of all documents related to claims, parties, and correspondence.

### Current Implementation
**Database Tables:**
- `doc` - Document metadata and blob storage references
- `doc_group` - Folder/category organization with hierarchical structure
- `doc_requirement` - Links documents to checklist requirements

**Features:**
- ✅ Azure Blob Storage integration for file persistence
- ✅ Document CRUD operations (upload, download, delete, update metadata)
- ✅ Folder/group organization with parent-child relationships
- ✅ System folders (Users, Shared) with protection from deletion/editing
- ✅ User-specific folders for personal document storage
- ✅ Document browser UI with preview capabilities
- ✅ Document preview dialog supporting PDFs and images
- ✅ Standalone documents page for shared files accessible to all users
- ✅ Document selector dialog for linking documents to questions/answers
- ✅ File upload answer type for checklist questions
- ✅ Document metadata (title, description, file size, mime type, doc type)
- ✅ Client-scoped document access (users only see their organization's documents)
- ✅ Folder depth limits (prevents excessive nesting)
- ✅ Archive/soft delete functionality

**API Routes:**
- `/api/documents/[docId]/download` - Secure download with Azure SAS tokens
- `/api/documents/upload` - Chunked file upload to Azure blob storage
- Document management through tRPC endpoints (CRUD operations)

**UI Components:**
- `DocumentsTab.tsx` - Admin document management interface
- `DocumentsPage.tsx` - User-facing shared documents page
- `DocumentNavigationTable.tsx` - Reusable folder/file navigation table
- `DocumentPreviewDialog.tsx` - In-app document preview
- `CompactDocumentBrowser.tsx` - Document selector for checklist answers
- `UploadDocumentDialog.tsx` - File upload interface

**Database Schema:**
```typescript
// doc table
{
  id: number;
  filename: string;
  alias: string;
  title: string | null;
  description: string | null;
  doc_type: string; // 'policy', 'invoice', 'photo', 'other', etc.
  doc_status: string; // 'approved', 'pending', 'rejected'
  storage_key: string; // Azure blob reference
  file_size: bigint;
  mime_type: string;
  preview_url: string | null;
  doc_group_id: number | null; // folder/category
  claim_id: number | null; // optional claim association
  question_id: number | null; // optional question attachment
  answer_id: number | null; // optional answer attachment
  // ... audit fields
}

// doc_group table
{
  id: number;
  name: string;
  description: string | null;
  parent_group_id: number | null; // supports hierarchy
  group_type: string; // 'claim_folder', 'category', 'custom', 'user'
  system: boolean; // protects system folders from deletion
  user_id: string | null; // for user-specific folders
  claim_id: number | null; // for auto-created claim folders
  // ... audit fields
}
```

**Implementation Details:**
- Commit `e638a31` (Oct 31, 2025) - "full doc system"
- Commit `6eb1ab6` (Nov 12, 2025) - "adjustments to documents and new standalone documents page"
- Files: `apps/web/src/api/queries/docQueries.ts`, `apps/web/src/components/admin/DocumentsTab.tsx`, `apps/web/src/components/documents/DocumentsPage.tsx`

**Gaps:**
- None for core document management

**Gap Severity:** CLOSED ✅

**Note:** This implementation provides the complete infrastructure foundation needed for Component 6 (Letters/Templates). Document storage, folder organization, upload/download, and preview capabilities are all in place. Only the template variable substitution logic remains to be built for the Letters component.

---

## Priority Matrix

### ✅ Completed (November 2025)
| Component | Feature | Status | Completed |
|-----------|---------|--------|-----------|
| Claim | Line of Business + Loss Type | ✅ Complete | 2025-11-14 |
| Claim | Coverages Structure | ✅ Complete | 2025-11-14 |
| Claim | Status/Substatus Workflow | ✅ Complete | 2025-11-12 |
| Facilitators | Party-Claim Linking UI | ✅ Complete | 2025-11-18 |
| Admin | Activity Logging System | ✅ Complete | 2025-11-18 |

### Should Build (Before Hanover)
| Component | Feature | Effort | Impact | Priority |
|-----------|---------|--------|--------|----------|
| Tasks | Due Date tracking | 0.5 day | Medium | 🟡 P1 |
| Tasks | Time tracking (estimated/actual hours) | 2 days | Medium | 🟡 P1 |

**Total Effort:** ~2.5 days

### Consider Building (Month 2-3)
| Component | Feature | Effort | Impact | Priority |
|-----------|---------|--------|--------|----------|
| Claim | Communication Log | 3 days | Medium | 🟢 P2 |
| Letters | Template Logic Only | 2-3 days | Medium | 🟢 P2 |
| Check Processing | Check number & status | 0.5 day | Low | 🟢 P2 |

**Total Effort:** ~6-7 days (reduced from 9 days due to document infrastructure completion)

**Note:** Letters effort reduced from 5 days to 2-3 days because document storage, upload/download, preview, and folder management infrastructure is complete (Component 9). Only template variable substitution logic remains.

### Defer (Post-Hanover or Client Request)
| Component | Feature | Effort | Impact | Priority |
|-----------|---------|--------|--------|----------|
| Client Companies | Underwriting company hierarchy | 2 days | Low | ⚪ P3 |
| Users | Time tracking & task balancing | 5 days | Medium | ⚪ P3 |
| Claim Delivery | Automated routing rules | 7 days | Low | ⚪ P3 |
| Check Processing | Full ledger & reconciliation | 5 days | Low | ⚪ P3 |

---

## Database Impact Summary

### ✅ New Tables Completed
1. ✅ `party` - External parties and entities (COMPLETED 2025-11)
2. ✅ `claim_party` - Link parties to claims with roles (COMPLETED 2025-11, UI integration 2025-11-18)
3. ✅ `party_office` - Office locations (COMPLETED 2025-11)
4. ✅ `party_representative` - Individual contacts (COMPLETED 2025-11)
5. ✅ `claim_coverage` - Coverage types and amounts (COMPLETED 2025-11-14)
6. ✅ `admin_log` - Activity logging for administrative actions (COMPLETED 2025-11-18)

### ✅ Table Modifications Completed
1. ✅ `claim` table (all modifications complete):
   - ✅ `line_of_business` TEXT with CHECK constraint (COMPLETED 2025-11-14)
   - ✅ `loss_type` TEXT with CHECK constraint (COMPLETED 2025-11-14)
   - ✅ `substatus` TEXT (COMPLETED 2025-11-12)
   - ✅ `recovery_status` TEXT (COMPLETED 2025-10)

2. ✅ `claim_party` table:
   - ✅ `representative_id` with FK to party_representative (COMPLETED 2025-11-18)
   - ✅ Unique constraint: one primary party per role per claim (COMPLETED 2025-11-18)

### ⏳ Table Modifications Pending
1. `page_instance` table (optional for time tracking):
   - Add `due_date` DATE
   - Add `completed_date` TIMESTAMPTZ
   - Add `estimated_hours` DECIMAL(5,2)
   - Add `actual_hours` DECIMAL(5,2)

### ✅ Enum Additions Completed
- ✅ `LineOfBusiness` (auto, property, general_liability, workers_comp, professional_liability)
- ✅ `LossType` (collision, comprehensive, fire, theft, water_damage, wind, vandalism, bodily_injury, property_damage, etc.)
- ✅ `ClaimSubstatus` (investigation, demand_sent, negotiation, settlement_reached, litigation, closed_recovered, closed_no_recovery, cancelled)
- ✅ `CoverageType` (collision, comprehensive, liability, uninsured_motorist, medical_payments, PIP, dwelling, personal_property, loss_of_use, other)
- ✅ `ClaimPartyRole` (adverse_carrier - more can be added as needed)
- ✅ `EntityName` (for admin logging)
- ✅ `AdminAction` (CREATE, UPDATE, DELETE, ARCHIVE, RESTORE)

### ⏳ Enum Additions Deferred
- `PartyType` (can add when party categorization needed)
- `FacilitatorCategory` (can add when needed)
- `EntityCategory` (can add when needed)

---

## Risk Assessment

### ✅ High Risk Items - RESOLVED
All critical infrastructure now in place:
- ✅ Coverage structure complete (2025-11-14)
- ✅ Status/substatus tracking complete (2025-11-12)
- ✅ Party/representative linking complete (2025-11-18)
- ✅ Line of business and loss type complete (2025-11-14)

### Medium Risk (Optional Enhancements)
**Task Time Tracking**
- **Risk:** Cannot track billable hours for Hanover engagement
- **Impact:** Billing and time estimation unclear
- **Appears in workflow:** All phases
- **Mitigation:** Build if Hanover requires time tracking (2.5 days effort)

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

### ✅ Pre-Hanover Work - COMPLETED (November 2025)
**"Hidden Plumbing" Strategy - All Database Foundations Complete**

1. ✅ **Document Management System** (COMPLETED October-November 2025)
   - ✅ Azure blob storage integration
   - ✅ Document/folder CRUD with hierarchical structure
   - ✅ Upload/download API routes
   - ✅ Document preview and browser UI
   - ✅ Standalone documents page for shared files
   - ✅ System folder support (Users, Shared)

2. ✅ **Party Management** (COMPLETED November 2025)
   - ✅ Created all 4 party tables (party, claim_party, party_office, party_representative)
   - ✅ Added soft delete support with archive/restore
   - ✅ Built complete tRPC API layer
   - ✅ Full admin UI with search, pagination, archive toggle

3. ✅ **Claim Enhancements** (COMPLETED November 2025)
   - ✅ Added line_of_business and loss_type fields with CHECK constraints
   - ✅ Created LineOfBusiness and LossType enums
   - ✅ Added substatus field with ClaimSubstatus enum
   - ✅ Built claim_coverage table with full CRUD
   - ✅ UI components: LineOfBusinessSelect, LossTypeSelect, ClaimantsCoverageTab, RecoveryStatusSelect
   - ✅ Regenerated Kysely types

4. ✅ **Party-Claim Linking** (COMPLETED November 2025)
   - ✅ Added representative_id to claim_party table
   - ✅ Database constraints for data integrity
   - ✅ Full UI integration in ClaimChanges component
   - ✅ Autocomplete for party and representative selection

5. ✅ **Admin Activity Logging** (COMPLETED November 2025)
   - ✅ Created admin_log table with full audit trail
   - ✅ Integrated logging in all claim/party/coverage operations
   - ✅ EntityName and AdminAction enums for structured logging

**Status: All foundational work complete. System ready for Hanover engagement.**

### ⏳ Optional Enhancements (If Hanover Requests)
**"Client-Driven Features" - Build Only What's Needed**

1. **Task Due Dates & Time Tracking** (2.5 days)
   - Add due_date, completed_date to page_instance
   - Add estimated_hours, actual_hours for billing
   - UI for setting due dates on checklist pages
   - Time entry interface for tracking actual hours

2. **Communication Log** (3 days)
   - Structured communication tracking (separate from comments)
   - Link communications to parties
   - Track phone calls, emails, letters, meetings

3. **Letter Templates** (2-3 days - infrastructure complete)
   - Template variable substitution engine
   - Letter generation workflow
   - Template assignment and customization
   - Note: Document storage already complete

**Total: ~7-8 days for all optional features**

### Month 2-3 of Hanover (Feb-March 2025)
**"Client-Driven Features" - Build What They Actually Use**

Let Hanover workflow reveal what they need:
- Are they sending many letters? → Build templates
- Complex party relationships? → Add office/rep hierarchy
- Need detailed time tracking? → Build task time logging
- Communication tracking important? → Build communication log

---

## Conclusion

The current Manifest system successfully implements the **core workflow engine** via the checklist system and has **completed all critical operational components** for day-to-day subrogation work.

### ✅ Completed Infrastructure (October-November 2025)
1. ✅ **Document Management System** - Azure blob storage, folder structure, upload/download, preview, standalone documents page (Component 9)
2. ✅ **Party/Facilitator Management** - Full CRUD, soft delete, admin UI with search/pagination, claim linking (Component 4)
3. ✅ **Claim Enhancement** - LOB, loss type, coverages, substatus, party linking (Component 3)
4. ✅ **Coverage Tracking** - Full CRUD with claim_coverage table and UI
5. ✅ **Recovery Tracking** - Events, status, amounts, dates
6. ✅ **Admin Activity Logging** - Complete audit trail for all administrative actions
7. ✅ **Multi-tenant Architecture** - Client scoping, authorization audit complete

### ⏳ Optional Enhancements (Only If Requested)
1. **Task Due Dates & Time Tracking** - For billable hour tracking (2.5 days)
2. **Communication Log** - Structured tracking of party interactions (3 days)
3. **Letter Templates** - Variable substitution engine for automated letter generation (2-3 days)

### System Status: Ready for Hanover Engagement

**All foundational features are complete.** The system now has:
- ✅ Complete claim data model with LOB, loss type, coverages, and substatus
- ✅ Full party management with hierarchical structure and claim linking
- ✅ Document management infrastructure ready for demand package assembly
- ✅ Recovery tracking with status workflow
- ✅ Admin activity logging for compliance and audit
- ✅ Multi-tenant architecture with proper client scoping

**Next Steps:**
- Deploy to production environment
- Load Hanover's existing claims data via feed
- Configure Hanover-specific checklists
- Train Hanover team on the system
- Build optional features only if Hanover requests them during engagement

The document system provides complete infrastructure for letter templates (Component 6), reducing effort from 5 days to 2-3 days if needed. All other deferred features (automated routing, time tracking, communication log) can be built as client needs emerge during the engagement.

---

**Document Version:** 1.3
**Last Updated:** 2025-11-18
**Next Review:** Pre-Hanover deployment (December 2024)
