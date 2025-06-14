import { AdminSlice } from '../storeTypes';

const adminSlice: AdminSlice = Object.freeze({
	claimConstraints: {
		pageSize: 20,
		page: 0,
	},
	selectedFeedId: undefined,
	selectedTab: 1,
	showImportClaimsDialog: false,
	showImportUsersDialog: false,
	showNewChecklistDialog: false,
	showNewClaimDialog: false,
	showNewUserDialog: false,
	userConstraints: {
		pageSize: 10,
		page: 0,
	},
});

export default adminSlice;
