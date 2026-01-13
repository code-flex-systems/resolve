import { Checklist, Claim } from '@/types/types';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface ChecklistsState {
	selectedChecklist: Checklist | null;
	selectedClaim: Claim | null;
}

interface ChecklistsActions {
	updateSelectedChecklist: (newChecklist: Checklist | null) => void;
	updateSelectedClaim: (newClaim: Claim | null) => void;
	reset: (partialState?: Partial<ChecklistsState>) => void;
}

type ChecklistsStore = ChecklistsState & ChecklistsActions;

const initialState: ChecklistsState = {
	selectedChecklist: null,
	selectedClaim: null,
};

export const useChecklistsStore = create<ChecklistsStore>()(
	immer((set) => ({
		...initialState,

		updateSelectedChecklist: (newChecklist) =>
			set((state) => {
				state.selectedChecklist = newChecklist;
			}),

		updateSelectedClaim: (newClaim) =>
			set((state) => {
				state.selectedClaim = newClaim;
			}),

		reset: (partialState) =>
			set((state) => {
				Object.assign(state, { ...initialState, ...partialState });
			}),
	}))
);
