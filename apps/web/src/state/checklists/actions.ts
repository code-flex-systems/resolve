import { Checklist, Claim } from '@/types/types';
import { SLICES } from '../storeConfig';
import { ChecklistsSlice } from '../storeTypes';
import { getStateBuilder, setStateBuilder } from '../storeUtilities';

const getState = getStateBuilder<ChecklistsSlice>(SLICES.CHECKLISTS);
const setState = setStateBuilder<ChecklistsSlice>(SLICES.CHECKLISTS);

export function toggleChecklistClaimDialog() {
	setState((state) => {
		state.showChecklistClaimDialog = !state.showChecklistClaimDialog;
	});
}

export function updateSelectedChecklist(newChecklist: Checklist | null) {
	setState((state) => {
		state.selectedChecklist = newChecklist;
	});
}

export function updateSelectedClaim(newClaim: Claim | null) {
	setState((state) => {
		state.selectedClaim = newClaim;
	});
}
