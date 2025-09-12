import { AdminSlice } from '../storeTypes';

const adminSlice: AdminSlice = Object.freeze({
	claimConstraints: {
		pageSize: 20,
		page: 0,
	},
	selectedChecklistId: null,
	selectedFeedId: undefined,
	selectedTab: 1,
	showClaimAssignmentDialog: false,
	showImportClaimsDialog: false,
	showImportUsersDialog: false,
	showInactiveUsers: false,
	showNewChecklistDialog: false,
	showNewClaimDialog: false,
	showNewUserDialog: false,
	userConstraints: {
		pageSize: 10,
		page: 0,
	},
	userSearchTerm: '',
});

export default adminSlice;
