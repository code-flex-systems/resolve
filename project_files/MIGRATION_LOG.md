# Migration Log

A chronological record of major architectural changes, refactors, and migrations in the Manifest project.

---

## Zustand State Management Refactor
**Date:** 2025-01-16
**Type:** Architecture Migration
**Status:** ✅ Complete

### Overview
Migrated from a custom centralized Zustand architecture to the classic individual store pattern to reduce complexity and improve maintainability.

### Motivation
- Old architecture required 5-7 file touches to add a new slice
- Separate files for initialState, actions, selectors created unnecessary complexity
- Custom utilities (`useSlice` hooks, `resetStoreSlice`) diverged from Zustand best practices

### Changes Made

**New Store Architecture:**
- Created 6 individual store files in `/stores`:
  - `useAdminStore.ts` - Admin state (dialogs, tabs, constraints)
  - `useBreakdownStore.ts` - Breakdown analysis state
  - `useChecklistStore.ts` - Checklist state (largest store)
  - `useChecklistsStore.ts` - Checklists selection state
  - `useGlobalStore.ts` - Global app state (nav, user)
  - `useMetricsStore.ts` - Metrics filter state
  - `index.ts` - Central export with MapSet enablement

**Files Updated:**
- 53 total files migrated (48 components, 5 hooks)
- All imports updated from `@/state/*` to `@/stores/*`
- All action imports converted to store destructuring
- All selector imports updated to direct function calls

**Files Removed:**
- Entire `/src/state` directory deleted
- Old architecture files: `store.ts`, `storeConfig.ts`, `storeTypes.ts`, `storeUtilities.ts`
- All slice subdirectories and their initialState/actions/selectors files

### Implementation Details

**Store Pattern:**
```typescript
// Each store now contains state + actions + reset in one file
export const useChecklistStore = create<ChecklistStore>()(
  immer((set, get) => ({
    ...initialState,

    // Actions
    toggleDialog: () => set((state) => {
      state.showDialog = !state.showDialog;
    }),

    // Built-in reset
    reset: (partialState) => set((state) => {
      Object.assign(state, { ...initialState, ...partialState });
    }),
  }))
);
```

**Migration Patterns:**
```typescript
// OLD
import { useChecklistSlice } from '@/state/store';
import { toggleDialog } from '@/state/checklist/actions';
const mode = useChecklistSlice((state) => state.mode);
toggleDialog();

// NEW
import { useChecklistStore } from '@/stores/useChecklistStore';
const mode = useChecklistStore((state) => state.mode);
const toggleDialog = useChecklistStore((state) => state.toggleDialog);
toggleDialog();
```

**Special Cases:**
- Non-React contexts use `useStore.getState().action()` (e.g., MenuItem onClick handlers)
- ChecklistStore includes `enableMapSet()` at top of file for Set support
- Helper selector `getSelectedPageInfoOrDefault()` exported from ChecklistStore

### Key Decisions

1. **Individual stores over centralized** - Each domain gets its own store for better separation of concerns
2. **Built-in reset functions** - Each store has its own `reset()` replacing the global `resetStoreSlice`
3. **Immer middleware for all** - Maintains mutation-style updates while preserving immutability
4. **MapSet enabled per-store** - Called in store files that need it, not just globally

### Issues Encountered

1. **Agent missed 6 files** - `actions.` references remained in:
   - HomeSearch.tsx
   - HomeLandingSearch.tsx
   - ClaimMenuItem.tsx
   - ChecklistMenuItem.tsx
   - SummaryDetails.tsx
   - BreakdownNavigation.tsx
   - **Resolution:** Fixed manually with direct action destructuring

2. **Duplicate imports** - Several files had `;;` at end of imports
   - **Resolution:** Removed with `sed` command

3. **TypeScript errors** - Pre-existing errors in API layer unrelated to migration
   - **Resolution:** Verified no store-related TS errors, ignored pre-existing issues

### Testing & Verification

✅ TypeScript compilation clean (no store-related errors)
✅ All old `@/state` imports removed
✅ No remaining `actions.` references
✅ All 6 stores functional with proper types
✅ MapSet support working for Set<number> in ChecklistStore

### Performance Impact

- **Token Usage:** ~120K tokens (could be optimized with agents + scripts in future)
- **Files Touched:** 53 files
- **Lines Changed:** ~500+ lines (estimated)
- **Breaking Changes:** None - all functionality preserved

### Follow-up Tasks

None - migration complete and verified.

### References

- Original state architecture: `/src/state` (deleted)
- New stores: `/src/stores`
- Token optimization guidelines added to `CLAUDE.md`

---
