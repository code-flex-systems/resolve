import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface AdminState {
	claimConstraints: {
		page: number;
		pageSize: number;
	};
	officeConstraints: {
		page: number;
		pageSize: number;
	};
	officeSearchTerm: string;
	partyConstraints: {
		page: number;
		pageSize: number;
	};
	partySearchTerm: string;
	representativeConstraints: {
		page: number;
		pageSize: number;
	};
	representativeSearchTerm: string;
	selectedChecklistId: number | null;
	selectedFeedId: number | null | undefined;
	selectedTab: number;
	showArchivedOffices: boolean;
	showArchivedParties: boolean;
	showArchivedRepresentatives: boolean;
	showClaimAssignmentDialog: boolean;
	showImportClaimsDialog: boolean;
	showImportUsersDialog: boolean;
	showInactiveUsers: boolean;
	showNewChecklistDialog: boolean;
	showNewClaimDialog: boolean;
	showNewOfficeDialog: boolean;
	showNewPartyDialog: boolean;
	showNewRepresentativeDialog: boolean;
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
	setShowArchivedOffices: (value: boolean) => void;
	setShowArchivedParties: (value: boolean) => void;
	setShowArchivedRepresentatives: (value: boolean) => void;
	setShowInactiveUsers: (value: boolean) => void;
	setTab: (newTab: number) => void;
	toggleClaimAssignmentDialog: () => void;
	toggleImportClaimsDialog: () => void;
	toggleImportUsersDialog: () => void;
	toggleNewChecklistDialog: () => void;
	toggleNewClaimDialog: () => void;
	toggleNewOfficeDialog: () => void;
	toggleNewPartyDialog: () => void;
	toggleNewRepresentativeDialog: () => void;
	toggleNewUserDialog: () => void;
	updateClaimConstraints: (newConstraints: { page: number; pageSize: number }) => void;
	updateOfficeConstraints: (newConstraints: { page: number; pageSize: number }) => void;
	updateOfficeSearchTerm: (newTerm: string) => void;
	updatePartyConstraints: (newConstraints: { page: number; pageSize: number }) => void;
	updatePartySearchTerm: (newTerm: string) => void;
	updateRepresentativeConstraints: (newConstraints: { page: number; pageSize: number }) => void;
	updateRepresentativeSearchTerm: (newTerm: string) => void;
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
	officeConstraints: {
		pageSize: 10,
		page: 0,
	},
	officeSearchTerm: '',
	partyConstraints: {
		pageSize: 10,
		page: 0,
	},
	partySearchTerm: '',
	representativeConstraints: {
		pageSize: 10,
		page: 0,
	},
	representativeSearchTerm: '',
	selectedChecklistId: null,
	selectedFeedId: undefined,
	selectedTab: 1,
	showArchivedOffices: false,
	showArchivedParties: false,
	showArchivedRepresentatives: false,
	showClaimAssignmentDialog: false,
	showImportClaimsDialog: false,
	showImportUsersDialog: false,
	showInactiveUsers: false,
	showNewChecklistDialog: false,
	showNewClaimDialog: false,
	showNewOfficeDialog: false,
	showNewPartyDialog: false,
	showNewRepresentativeDialog: false,
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

		setShowArchivedOffices: (value) =>
			set((state) => {
				state.showArchivedOffices = value;
			}),

		setShowArchivedParties: (value) =>
			set((state) => {
				state.showArchivedParties = value;
			}),

		setShowArchivedRepresentatives: (value) =>
			set((state) => {
				state.showArchivedRepresentatives = value;
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

		toggleNewOfficeDialog: () =>
			set((state) => {
				state.showNewOfficeDialog = !state.showNewOfficeDialog;
			}),

		toggleNewPartyDialog: () =>
			set((state) => {
				state.showNewPartyDialog = !state.showNewPartyDialog;
			}),

		toggleNewRepresentativeDialog: () =>
			set((state) => {
				state.showNewRepresentativeDialog = !state.showNewRepresentativeDialog;
			}),

		toggleNewUserDialog: () =>
			set((state) => {
				state.showNewUserDialog = !state.showNewUserDialog;
			}),

		updateClaimConstraints: (newConstraints) =>
			set((state) => {
				state.claimConstraints = newConstraints;
			}),

		updateOfficeConstraints: (newConstraints) =>
			set((state) => {
				state.officeConstraints = newConstraints;
			}),

		updateOfficeSearchTerm: (newTerm) =>
			set((state) => {
				state.officeSearchTerm = newTerm;
			}),

		updatePartyConstraints: (newConstraints) =>
			set((state) => {
				state.partyConstraints = newConstraints;
			}),

		updatePartySearchTerm: (newTerm) =>
			set((state) => {
				state.partySearchTerm = newTerm;
			}),

		updateRepresentativeConstraints: (newConstraints) =>
			set((state) => {
				state.representativeConstraints = newConstraints;
			}),

		updateRepresentativeSearchTerm: (newTerm) =>
			set((state) => {
				state.representativeSearchTerm = newTerm;
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
