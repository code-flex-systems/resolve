import { ChecklistsSlice } from '../storeTypes';

const checklistsSlice: ChecklistsSlice = Object.freeze({
	selectedChecklist: null,
	selectedClaim: null,
	// dialogs
	showChecklistClaimDialog: false,
});

export default checklistsSlice;
