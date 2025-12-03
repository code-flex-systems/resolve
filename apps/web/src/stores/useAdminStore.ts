import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ReferenceEntity } from '@/schemas/referenceDataSchemas';

interface AdminState {
	claimConstraints: {
		page: number;
		pageSize: number;
	};
	deskLocationTypeConstraints: {
		page: number;
		pageSize: number;
	};
	officeConstraints: {
		page: number;
		pageSize: number;
	};
	partyConstraints: {
		page: number;
		pageSize: number;
	};
	representativeConstraints: {
		page: number;
		pageSize: number;
	};
	selectedChecklistId: number | null;
	selectedDeskLocationTypeId: number | null;
	selectedFeedId: number | null | undefined;
	selectedReferenceEntity: ReferenceEntity | null;
	selectedReferenceOptionId: number | null;
	selectedTab: number;
	showClaimAssignmentDialog: boolean;
	showImportClaimsDialog: boolean;
	showImportUsersDialog: boolean;
	showNewChecklistDialog: boolean;
	showNewClaimDialog: boolean;
	showNewDeskLocationDialog: boolean;
	showNewDeskLocationTypeDialog: boolean;
	showNewOfficeDialog: boolean;
	showNewPartyDialog: boolean;
	showNewReferenceOptionDialog: boolean;
	showNewRepresentativeDialog: boolean;
	showNewUserDialog: boolean;
	userConstraints: {
		page: number;
		pageSize: number;
	};
}

interface AdminActions {
	setChecklistId: (newId: number | null) => void;
	setDeskLocationTypeId: (newId: number | null) => void;
	setFeedId: (newId: number | null | undefined) => void;
	setReferenceEntity: (entity: ReferenceEntity | null) => void;
	setReferenceOptionId: (id: number | null) => void;
	setTab: (newTab: number) => void;
	toggleClaimAssignmentDialog: () => void;
	toggleImportClaimsDialog: () => void;
	toggleImportUsersDialog: () => void;
	toggleNewChecklistDialog: () => void;
	toggleNewClaimDialog: () => void;
	toggleNewDeskLocationDialog: () => void;
	toggleNewDeskLocationTypeDialog: () => void;
	toggleNewOfficeDialog: () => void;
	toggleNewPartyDialog: () => void;
	toggleNewReferenceOptionDialog: () => void;
	toggleNewRepresentativeDialog: () => void;
	toggleNewUserDialog: () => void;
	updateClaimConstraints: (newConstraints: { page: number; pageSize: number }) => void;
	updateDeskLocationTypeConstraints: (newConstraints: { page: number; pageSize: number }) => void;
	updateOfficeConstraints: (newConstraints: { page: number; pageSize: number }) => void;
	updatePartyConstraints: (newConstraints: { page: number; pageSize: number }) => void;
	updateRepresentativeConstraints: (newConstraints: { page: number; pageSize: number }) => void;
	updateUserConstraints: (newConstraints: { page: number; pageSize: number }) => void;
	reset: (partialState?: Partial<AdminState>) => void;
}

type AdminStore = AdminState & AdminActions;

const initialState: AdminState = {
	claimConstraints: {
		pageSize: 20,
		page: 0,
	},
	deskLocationTypeConstraints: {
		pageSize: 10,
		page: 0,
	},
	officeConstraints: {
		pageSize: 10,
		page: 0,
	},
	partyConstraints: {
		pageSize: 10,
		page: 0,
	},
	representativeConstraints: {
		pageSize: 10,
		page: 0,
	},
	selectedChecklistId: null,
	selectedDeskLocationTypeId: null,
	selectedFeedId: undefined,
	selectedReferenceEntity: null,
	selectedReferenceOptionId: null,
	selectedTab: 1,
	showClaimAssignmentDialog: false,
	showImportClaimsDialog: false,
	showImportUsersDialog: false,
	showNewChecklistDialog: false,
	showNewClaimDialog: false,
	showNewDeskLocationDialog: false,
	showNewDeskLocationTypeDialog: false,
	showNewOfficeDialog: false,
	showNewPartyDialog: false,
	showNewReferenceOptionDialog: false,
	showNewRepresentativeDialog: false,
	showNewUserDialog: false,
	userConstraints: {
		pageSize: 10,
		page: 0,
	},
};

export const useAdminStore = create<AdminStore>()(
	immer((set) => ({
		...initialState,

		setChecklistId: (newId) =>
			set((state) => {
				state.selectedChecklistId = newId;
			}),

		setDeskLocationTypeId: (newId) =>
			set((state) => {
				state.selectedDeskLocationTypeId = newId;
			}),

		setFeedId: (newId) =>
			set((state) => {
				state.selectedFeedId = newId;
			}),

		setReferenceEntity: (entity) =>
			set((state) => {
				state.selectedReferenceEntity = entity;
				state.selectedReferenceOptionId = null; // Reset selection when entity changes
			}),

		setReferenceOptionId: (id) =>
			set((state) => {
				state.selectedReferenceOptionId = id;
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

		toggleNewDeskLocationDialog: () =>
			set((state) => {
				state.showNewDeskLocationDialog = !state.showNewDeskLocationDialog;
			}),

		toggleNewDeskLocationTypeDialog: () =>
			set((state) => {
				state.showNewDeskLocationTypeDialog = !state.showNewDeskLocationTypeDialog;
			}),

		toggleNewOfficeDialog: () =>
			set((state) => {
				state.showNewOfficeDialog = !state.showNewOfficeDialog;
			}),

		toggleNewPartyDialog: () =>
			set((state) => {
				state.showNewPartyDialog = !state.showNewPartyDialog;
			}),

		toggleNewReferenceOptionDialog: () =>
			set((state) => {
				state.showNewReferenceOptionDialog = !state.showNewReferenceOptionDialog;
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

		updateDeskLocationTypeConstraints: (newConstraints) =>
			set((state) => {
				state.deskLocationTypeConstraints = newConstraints;
			}),

		updateOfficeConstraints: (newConstraints) =>
			set((state) => {
				state.officeConstraints = newConstraints;
			}),

		updatePartyConstraints: (newConstraints) =>
			set((state) => {
				state.partyConstraints = newConstraints;
			}),

		updateRepresentativeConstraints: (newConstraints) =>
			set((state) => {
				state.representativeConstraints = newConstraints;
			}),

		updateUserConstraints: (newConstraints) =>
			set((state) => {
				state.userConstraints = newConstraints;
			}),

		reset: (partialState) =>
			set((state) => {
				Object.assign(state, { ...initialState, ...partialState });
			}),
	}))
);
