import { ChecklistsSlice } from '../storeTypes';

const checklistsSlice: ChecklistsSlice = Object.freeze({
	recentChecklistClaims: [],
	selectedChecklist: null,
	selectedClaim: null,
	// dialogs
	showChecklistClaimDialog: false,
});

export default checklistsSlice;
