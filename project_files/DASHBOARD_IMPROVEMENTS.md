# Dashboard Improvements for Investor Demo

**Created:** 2025-11-18
**Target Completion:** Before investor demo (next week)
**Focus:** User dashboard visual appeal, usefulness, and thoroughness

---

## Executive Summary

This document outlines planned improvements to the user dashboard (Home page) to prepare for an investor demo. The current dashboard has adequate functionality but lacks visual polish and user-centric metrics. These improvements will make the application more impressive and useful.

---

## Problems Identified

### Current User Dashboard Issues

1. **Calendar Component**
   - Side panel (BasicPopper) for showing deadlines is awkward
   - No default selection to show today's events
   - Hard to scan multiple deadlines at once

2. **Recents Component**
   - Divisions by status (SUBMITTED, IN_PROGRESS, etc.) are not useful
   - Limited claim information displayed
   - `last_opened` timestamp may not be updating correctly
   - Visual design is basic (MenuItem-based list)
   - Doesn't match quality of Admin Claims tab

3. **Claims Submission Metric**
   - This is an admin metric, not user-focused
   - Contributors don't care about submission percentages
   - Takes valuable dashboard real estate

4. **FQStepper Component**
   - Currently just shows fiscal quarter progress visually
   - No actual data integration
   - Missed opportunity to show recovery performance

5. **HomeSearch Component**
   - Functional but not visually impressive
   - Could be "cleaner and bolder"

6. **Overall Dashboard**
   - Not enough useful information for users
   - Visual design lacks polish
   - Inadequate for investor presentation

---

## Approved Solutions

### 1. Calendar - Add Daily Events Section

**Changes:**
- Remove side panel (BasicPopper) for displaying deadlines
- Add scrollable section below calendar displaying events for selected day
- Default to today's date selected
- Show deadline details in scrollable list (max-height: 200-250px)
- Each event displays:
  - Time (hh:mm A format)
  - Deadline type with icon
  - Description
  - Claim number link
  - Status badge (pending, met, missed, extended)
- Empty state: "No deadlines for this day"
- Visual connection between calendar and events list

**New Component:** `DailyEventsList.tsx`

**Implementation Notes:**
- Reuse existing `listDeadlines` query
- Filter by selected date
- Add loading skeleton
- Click claim number to navigate to claim detail

---

### 2. Recents - Modern Redesign

**Scope:** Simpler scrollable list with modern styling (not full DataGrid)

**Changes:**
- **Remove** status-based grouping
- Single chronological list sorted by `last_opened DESC`
- Match Admin Claims tab visual aesthetic:
  - Striped rows (alternating background colors)
  - Better typography hierarchy
  - Hover effects on rows
  - Increased row height (~60px) to accommodate additional data
- **Display per row:**
  - Claim number (bold, blue, clickable)
  - Client name
  - Insured name
  - Line of business icon + label
  - Recovery status badge
  - Last opened (relative time: "2 hours ago")
  - Checklist name (smaller, muted)
  - Small status indicator (colored dot or mini chip)
- Click row to open ClaimDetailPanel drawer (right side, 450px)
- Limit: 10-12 items
- Fixed height with vertical scroll
- Add "View All My Claims" link at bottom

**Critical Fix: last_opened Updates**
- Verify `getClaim()` is called when opening `/checklist/[checklistId]/claim/[claimId]`
- Confirm UPSERT logic works correctly:
  ```typescript
  .onConflict((oc) => oc.columns(['checklist_id', 'claim_id']).doUpdateSet({ last_opened: sql`now()` }))
  ```
- Check route handler triggers query properly
- Test with actual claim opening to verify timestamp updates

**Queries:**
- Existing: `getRecentChecklistClaims` (already returns needed data)
- May need to add fields to SELECT: `claim.client`, `claim.insured`, `claim.line_of_business`, `claim.recovery_status`

---

### 3. Replace Claims Submission Metric

**Remove:** `ClaimsMetric.tsx` from user dashboard (move to admin only)

**Add Two New User-Focused Metrics:**

#### A. My Open Claims Summary
**Component:** `apps/web/src/components/home/MyClaimsMetric.tsx`

**Display:**
- Large number: Total open claims count
- Status breakdown with color-coded chips:
  - In Progress: count (warning color)
  - Blocked: count (orange)
  - Unworked: count (error color)
- Click to navigate: `/my-claims?status=open` (future enhancement)
- Compact size: ~400px x 150-180px
- Card design with subtle background gradient

**Data Source:**
- Query: `getChecklistClaimStats` with `users: [currentUserId]`
- Filter: Exclude SUBMITTED status (only show active work)
- Returns: `{ in_progress: number, blocked: number, unworked: number }`

#### B. My Deadlines Summary
**Component:** `apps/web/src/components/home/MyDeadlinesMetric.tsx`

**Display:**
- Overdue deadlines count (red badge, prominent)
- Upcoming deadlines count (next 7 days, yellow/warning)
- Icons for visual interest (clock, warning icons)
- Quick links:
  - "View Overdue" → calendar filtered to overdue
  - "View Upcoming" → calendar filtered to next 7 days
- Compact size: ~400px x 150-180px
- Card design

**Data Source:**
- Query: `listDeadlines` with date filters
- Overdue: `deadline_date < today AND status != 'met'`
- Upcoming: `deadline_date BETWEEN today AND today+7 AND status = 'pending'`
- Returns: `{ overdue: number, upcoming: number }`

---

### 4. FQStepper - Add Quarterly Recovery Amounts

**File:** `apps/web/src/components/home/FQStepper.tsx`

**Changes:**
- Display total actual recovery amount per quarter
- Format: `formatCurrency(amount)` (e.g., "$145,230")
- Position amount below quarter label (Q1, Q2, Q3, Q4)
- Styling:
  - **Current quarter:** bold, larger font, highlighted
  - **Past quarters:** normal weight, full opacity
  - **Future quarters:** muted/disabled, lower opacity
- Loading skeleton while fetching data
- Tooltip on hover showing:
  - Date range for quarter
  - Number of recovery events
  - Expected vs actual (future enhancement)

**New Backend Requirements:**

#### Query: `getQuarterlyRecoveryStats`
**File:** `apps/web/src/api/queries/recoveryQueries.ts`

**Function Signature:**
```typescript
export async function getQuarterlyRecoveryStats(
  ctx: ProtectedContext,
  params: {
    fiscalYearStart?: Date; // defaults to config.FISCAL_YEAR_START_DATE
    userId?: string; // optional: filter to specific user's work
  }
): Promise<{
  q1: string; // numeric as string
  q2: string;
  q3: string;
  q4: string;
}>
```

**Query Logic:**
1. Calculate date ranges for Q1-Q4 based on fiscal year start
   - Q1: fiscalYearStart → +3 months
   - Q2: fiscalYearStart +3 months → +6 months
   - Q3: fiscalYearStart +6 months → +9 months
   - Q4: fiscalYearStart +9 months → +12 months

2. Query recovery_event table:
   ```sql
   SELECT
     CASE
       WHEN recovery_date BETWEEN q1_start AND q1_end THEN 'q1'
       WHEN recovery_date BETWEEN q2_start AND q2_end THEN 'q2'
       WHEN recovery_date BETWEEN q3_start AND q3_end THEN 'q3'
       WHEN recovery_date BETWEEN q4_start AND q4_end THEN 'q4'
     END as quarter,
     SUM(recovery_amount) as total
   FROM recovery_event
   WHERE client_id = :clientId
     AND recovery_date BETWEEN fiscal_year_start AND fiscal_year_end
     [AND user_id = :userId if provided]
   GROUP BY quarter
   ```

3. Return object with totals per quarter (default to '0' if no data)

#### tRPC Route
**File:** `apps/web/src/server/trpc/routers/recovery.ts`

```typescript
getQuarterlyStats: protectedProcedure
  .input(
    z.object({
      fiscalYearStart: z.date().optional(),
      userId: z.string().optional(),
    })
  )
  .query(async ({ ctx, input }) => {
    return recoveryController.getQuarterlyRecoveryStats(ctx, input);
  }),
```

#### Hook Update
**File:** `apps/web/src/hooks/trpc/useRecoveryTrpc.ts`

Add: `getQuarterlyStats: trpc.recovery.getQuarterlyStats.useQuery`

**Future Enhancement:**
- Add `userId` parameter to filter by user
- Show "My Recovery" vs "Team Recovery" toggle

---

### 5. HomeSearch - Visual Mockup Options

**Current State:** Functional two-step search (claim + checklist selection)

**Goal:** Make it "cleaner and bolder" for investor demo

**Approach:** Create 3 visual direction mockups for user to choose from before implementing

#### Mockup Option A: Hero Search (Full-Width)
- Large search bar spanning full width of dashboard
- Single combined autocomplete (searches both claims AND checklists)
- Results dropdown shows:
  - Claims section (with claim_number, client, insured)
  - Checklists section (with name, description)
- Select claim → shows selected chip
- Select checklist → shows selected chip
- "Open" button appears when both selected
- Bold typography, large input size
- Gradient or solid background card
- Centered on page
- Height: ~200-250px

**Pros:** Most visually impressive, hero treatment
**Cons:** More development effort, changes UX flow

#### Mockup Option B: Dual-Column Modern
- Keep two-step selection workflow
- Side-by-side layout (instead of vertical)
- Larger, cleaner autocomplete fields (60-80px height)
- Visual separator between (vertical line or spacing)
- Add icons: 🔍 for Claim, 📋 for Checklist
- Modern Material Design 3 styling (filled inputs)
- Selected items show as large chips below inputs
- "Go" button more prominent
- Width: ~700px, Height: ~200px

**Pros:** Keeps familiar UX, easier to implement
**Cons:** Less dramatic visual change

#### Mockup Option C: Card-Based Selection
- Two large clickable cards side-by-side
- Left card: "Find a Claim" with icon
- Right card: "Select Checklist" with icon
- Click card → opens modal/dialog with search
- Selected items show as large chips on card
- Remove selection via X button on chip
- "Open Checklist" button appears at bottom when both selected
- Each card: ~300px x 200px
- More whitespace, cleaner visual hierarchy

**Pros:** Very clean, modern, unique UX
**Cons:** Modal interactions add complexity

**Deliverable:** Static mockup images or Figma/code examples of all 3 options for user review

---

## Layout Changes

### Current Home Page Layout
```
Grid with gaps, components in Paper cards:

Row 1:
  - Calendar (400px x 350px)
  - Recents (400px x 350px)
  - HomeSearch (520px x 350px)

Row 2:
  - ClaimsMetric (400px x 300px)
  - FQStepper (140px x 350px)
```

### Proposed Layout (Pending HomeSearch Decision)

**Option 1: If HomeSearch goes full-width hero**
```
Row 1:
  - HomeSearch (full-width, centered max 900px, height: 200px)

Row 2:
  - Calendar + DailyEvents (450px x 600px)
  - Recents (550px x 600px)

Row 3:
  - MyClaimsMetric (400px x 180px)
  - MyDeadlinesMetric (400px x 180px)
  - FQStepper (200px x 180px)
```

**Option 2: If HomeSearch stays compact**
```
Row 1:
  - HomeSearch (520px x 250px)
  - MyClaimsMetric (400px x 120px)
  - MyDeadlinesMetric (400px x 120px)

Row 2:
  - Calendar + DailyEvents (450px x 600px)
  - Recents (550px x 600px)
  - FQStepper (200px x 600px, vertical orientation)
```

**Responsive Considerations:**
- Stack components vertically on mobile/tablet
- Maintain visual hierarchy: search → recent work → metrics
- All components should have min-width constraints

---

## Implementation Order

1. ✅ **Create DASHBOARD_IMPROVEMENTS.md** - This document
2. **Calendar daily events section** - Straightforward, isolated change
3. **Fix last_opened updates** - Critical for Recents accuracy
4. **Quarterly recovery query + tRPC** - Backend foundation for FQStepper
5. **FQStepper enhancement** - Use new query to display data
6. **MyClaimsMetric component** - New metric #1
7. **MyDeadlinesMetric component** - New metric #2
8. **Recents redesign** - Complex, benefits from seeing other components first
9. **HomeSearch mockups** - Create 3 visual options for review
10. **HomeSearch implementation** - After user selects mockup direction
11. **Layout adjustments** - After HomeSearch direction confirmed
12. **Polish and responsive design** - Final QA pass

---

## Estimated Effort

| Task | Time Estimate |
|------|---------------|
| Calendar events section | 2 hours |
| Fix last_opened | 1 hour |
| Quarterly recovery query + tRPC | 2 hours |
| FQStepper enhancement | 2 hours |
| MyClaimsMetric | 2 hours |
| MyDeadlinesMetric | 2 hours |
| Recents redesign | 4 hours |
| HomeSearch mockups | 2 hours |
| HomeSearch implementation | 3-4 hours |
| Layout adjustments | 1 hour |
| Polish/responsive | 2 hours |
| **TOTAL** | **~23-24 hours (3 days)** |

**Timeline for next week demo:** Start immediately, complete in 3 working days

---

## User Preferences (from Q&A)

- ✅ **Recents:** Simpler scrollable list with modern styling (NOT full DataGrid)
- ✅ **User Metrics:** Replace Claims Submission with:
  - My overdue/upcoming deadlines summary
  - My open claims count with status breakdown
- ✅ **FQStepper:** Show total actual recovery amount only (not expected vs actual, not YoY)
- ✅ **HomeSearch:** Create mockup options for user to review before implementing

---

## Admin Dashboard Improvements

**Status:** Deferred to separate brainstorming session after user dashboard complete

**Initial Ideas:**
- User activity dashboard (who's working on what)
- Claim pipeline metrics (aging analysis, bottlenecks)
- Recovery performance trends (monthly, quarterly)
- Data quality metrics (incomplete claims, missing information)
- Team productivity metrics (claims per user, average resolution time)
- Feed health monitoring (last sync, error rates)

**Next Steps:**
- Complete user dashboard improvements first
- Schedule separate session to brainstorm admin metrics
- Create similar planning document for admin dashboard

---

## Success Criteria

### For Investor Demo
- ✅ Visually impressive dashboard that looks modern and polished
- ✅ Shows useful, actionable information for users
- ✅ Demonstrates data integration (recovery stats, deadlines, claims)
- ✅ Responsive design works on laptop screen (demo environment)
- ✅ No bugs or broken features visible during demo
- ✅ Fast loading times (< 2 seconds for dashboard)

### Technical Success
- ✅ All components properly fetch and display real data
- ✅ last_opened timestamps update correctly
- ✅ Quarterly recovery calculation is accurate
- ✅ New queries are performant (indexed appropriately)
- ✅ TypeScript errors resolved
- ✅ No console errors in browser
- ✅ Components follow existing design patterns

---

## Design Guidelines

**Visual Style:**
- Match existing Admin Claims tab aesthetic (reference point for quality)
- Use MUI theme colors and spacing consistently
- Add subtle gradients for visual interest on cards
- Use icons liberally for visual communication
- Maintain sufficient whitespace (don't cram too much)
- Striped rows for lists (alternating backgrounds)
- Hover states on all interactive elements
- Loading skeletons for async data

**Typography:**
- Bold for primary information (claim numbers, metrics)
- Muted colors for secondary info (timestamps, descriptions)
- Proper hierarchy (h6 for titles, body1 for content, caption for metadata)

**Interactions:**
- Click claim numbers → navigate to claim detail
- Click rows → open detail drawer/panel
- Hover effects for interactivity feedback
- Smooth transitions (200-300ms)
- Disabled states for future quarters in FQStepper

---

## Open Questions

1. **FQStepper user filtering:** When should we add userId parameter to show "My Recovery" vs "Team Recovery"?
   - **Answer:** Start with client-wide recovery, add user filter in future iteration

2. **ClaimDetailPanel reuse:** Should Recents use same drawer component as Admin Claims tab?
   - **Answer:** Yes, create reusable `ClaimDetailPanel` if not already extracted

3. **Deadline filtering in calendar:** Should clicking "View Overdue" in deadlines metric filter the calendar?
   - **Answer:** Nice to have, defer if time-constrained

4. **HomeSearch mockup delivery:** Create in Figma, code, or screenshot examples?
   - **Answer:** Code-based mockups easier given timeline, can style actual components

---

## Related Documents

- `LEGACY_GAP_ANALYSIS.md` - Feature completeness tracking
- `CLAUDE.md` - Architecture and development patterns
- `TESTING_PROGRESS.md` - Testing standards

---

## Version History

- **v1.0** (2025-11-18) - Initial plan created based on user requirements and Q&A
