import { AdminSlice } from '../storeTypes';

const adminSlice: AdminSlice = Object.freeze({
	selectedTab: 1,
	showNewUserDialog: false,
	userConstraints: {
		pageSize: 10,
		page: 0,
	},
});

export default adminSlice;
