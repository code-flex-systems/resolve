import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface AdminState {
	claimConstraints: {
		page: number;
		pageSize: number;
	};
	selectedChecklistId: number | null;
	selectedFeedId: number | null | undefined;
	selectedTab: number;
	showClaimAssignmentDialog: boolean;
	showImportClaimsDialog: boolean;
	showImportUsersDialog: boolean;
	showInactiveUsers: boolean;
	showNewChecklistDialog: boolean;
	showNewClaimDialog: boolean;
	showNewUserDialog: boolean;
	userConstraints: {
		page: number;
		pageSize: number;
	};
	userSearchTerm: string;
}

interface AdminActions {
	setChecklistId: (newId: number | null) => void;
	setFeedId: (newId: number | null | undefined) => void;
	setShowInactiveUsers: (value: boolean) => void;
	setTab: (newTab: number) => void;
	toggleClaimAssignmentDialog: () => void;
	toggleImportClaimsDialog: () => void;
	toggleImportUsersDialog: () => void;
	toggleNewChecklistDialog: () => void;
	toggleNewClaimDialog: () => void;
	toggleNewUserDialog: () => void;
	updateClaimConstraints: (newConstraints: { page: number; pageSize: number }) => void;
	updateUserConstraints: (newConstraints: { page: number; pageSize: number }) => void;
	updateUserSearchTerm: (newTerm: string) => void;
	reset: (partialState?: Partial<AdminState>) => void;
}

type AdminStore = AdminState & AdminActions;

const initialState: AdminState = {
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
};

export const useAdminStore = create<AdminStore>()(
	immer((set) => ({
		...initialState,

		setChecklistId: (newId) =>
			set((state) => {
				state.selectedChecklistId = newId;
			}),

		setFeedId: (newId) =>
			set((state) => {
				state.selectedFeedId = newId;
			}),

		setShowInactiveUsers: (value) =>
			set((state) => {
				state.showInactiveUsers = value;
			}),

		setTab: (newTab) =>
			set((state) => {
				state.selectedTab = newTab;
			}),

		toggleClaimAssignmentDialog: () =>
			set((state) => {
				state.showClaimAssignmentDialog = !state.showClaimAssignmentDialog;
			}),

		toggleImportClaimsDialog: () =>
			set((state) => {
				state.showImportClaimsDialog = !state.showImportClaimsDialog;
			}),

		toggleImportUsersDialog: () =>
			set((state) => {
				state.showImportUsersDialog = !state.showImportUsersDialog;
			}),

		toggleNewChecklistDialog: () =>
			set((state) => {
				state.showNewChecklistDialog = !state.showNewChecklistDialog;
			}),

		toggleNewClaimDialog: () =>
			set((state) => {
				state.showNewClaimDialog = !state.showNewClaimDialog;
			}),

		toggleNewUserDialog: () =>
			set((state) => {
				state.showNewUserDialog = !state.showNewUserDialog;
			}),

		updateClaimConstraints: (newConstraints) =>
			set((state) => {
				state.claimConstraints = newConstraints;
			}),

		updateUserConstraints: (newConstraints) =>
			set((state) => {
				state.userConstraints = newConstraints;
			}),

		updateUserSearchTerm: (newTerm) =>
			set((state) => {
				state.userSearchTerm = newTerm;
			}),

		reset: (partialState) =>
			set((state) => {
				Object.assign(state, { ...initialState, ...partialState });
			}),
	}))
);
