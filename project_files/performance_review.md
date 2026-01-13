# Admin component performance review summary

This document compiles all performance issues identified during the review of `apps/web/src/components/admin` and `apps/web/src/components/admin/claim-detail`.

## DataGrid configuration & overlay identity
- **Inline `noRowsOverlay`/`noResultsOverlay` components remount every render.**
  - `apps/web/src/components/admin/DocumentNavigationTable.tsx`
  - `apps/web/src/components/admin/CompactDocumentBrowser.tsx`
  - `apps/web/src/components/admin/CoverageTab.tsx` (overlay identity changes with `selectedClaim`)
  - `apps/web/src/components/admin/DeskLocationsTab.tsx` (inline lambdas returning overlay)
  - `apps/web/src/components/admin/ReferenceDataTab.tsx` (inline lambdas returning overlay)

- **Column definitions recreated on each render, forcing grid reprocessing.**
  - `apps/web/src/components/admin/DeskAssignmentTab.tsx`
  - `apps/web/src/components/admin/CoverageTab.tsx`

## Derived data + extra renders
- **Derived options built in `useEffect` and stored in state, causing extra renders and repeated sorting.**
  - `apps/web/src/components/admin/Claims.tsx` (insured/client filter option arrays)

- **Derived `entityRows` recomputed every render with `find` work.**
  - `apps/web/src/components/admin/ReferenceDataTab.tsx`

## Per-render expensive filtering or lookups
- **O(N * folders) filtering when summarizing selected folders.**
  - `apps/web/src/components/admin/DocumentsTab.tsx` (repeated `allDocs.filter` per selected folder)

- **Repeated per-render filtering for settlement recovery counts.**
  - `apps/web/src/components/admin/claim-detail/SettlementRecoveryTab.tsx`

- **O(N^2) settlement lookup while rendering timeline.**
  - `apps/web/src/components/admin/claim-detail/SettlementTimeline.tsx` (per-item `settlements.find`)

## Remounts + state churn
- **`Fade` keyed by tab forces full remount of tab contents on each tab switch.**
  - `apps/web/src/components/admin/claim-detail/ClaimDetailView.tsx`

- **State updates during render cause extra render passes.**
  - `apps/web/src/components/admin/AdminSidebar.tsx` (expanding categories via `setExpandedCategories` inside render)

## Memoization pitfalls / unnecessary memoization
- **Memoized columns capture callbacks with empty deps (stale closure risk).**
  - `apps/web/src/components/admin/TasksTab.tsx`

- **Unnecessary `useMemo` for trivial value.**
  - `apps/web/src/components/admin/DocumentPreviewDialog.tsx` (`canPreview` check)
  - `apps/web/src/components/admin/UploadDocumentDialog.tsx` (`isFileImage` check)
  - `apps/web/src/components/admin/PartyDialog.tsx` (`currentPartyId` derivation)

- **Unnecessary `useMemo` cloning without transform.**
  - `apps/web/src/components/admin/claim-detail/PartyLinkingDialog.tsx`

- **Potential low-value `useCallback` wrappers around local setters.**
  - `apps/web/src/components/admin/claim-detail/PartyLinkingDialog.tsx` (multiple callbacks that could be inlined unless required by memoized children)

## Row-level dialogs mounting per cell
- **Dialog trees rendered per row increase component count in large grids.**
  - `apps/web/src/components/admin/AddressActionsCell.tsx`
  - `apps/web/src/components/admin/ChecklistActionsCell.tsx`
  - `apps/web/src/components/admin/PartyActionsCell.tsx`
  - `apps/web/src/components/admin/RepresentativeActionsCell.tsx`
  - `apps/web/src/components/admin/DeskLocationActionsCell.tsx`
  - `apps/web/src/components/admin/UserActionsCell.tsx`

## Miscellaneous
- **Per-render O(N) helper used per list item.**
  - `apps/web/src/components/admin/claim-detail/SettlementRecoveryTab.tsx` (`getRecoveryCountForSettlement`)

- **Potential overlay remount due to switching component identity.**
  - `apps/web/src/components/admin/CoverageTab.tsx` (`NoRowsOverlay` changes based on `selectedClaim`)
