import { SLICES } from '../storeConfig';
import { AdminSlice } from '../storeTypes';
import { getStateBuilder, setStateBuilder } from '../storeUtilities';

const getState = getStateBuilder<AdminSlice>(SLICES.ADMIN);
const setState = setStateBuilder<AdminSlice>(SLICES.ADMIN);

export function setFeedId(newId: number | null | undefined) {
	setState((state) => {
		state.selectedFeedId = newId;
	});
}

export function setTab(newTab: number) {
	setState((state) => {
		state.selectedTab = newTab;
	});
}

export function toggleImportClaimsDialog() {
	setState((state) => {
		state.showImportClaimsDialog = !state.showImportClaimsDialog;
	});
}

export function toggleImportUsersDialog() {
	setState((state) => {
		state.showImportUsersDialog = !state.showImportUsersDialog;
	});
}

export function toggleNewChecklistDialog() {
	setState((state) => {
		state.showNewChecklistDialog = !state.showNewChecklistDialog;
	});
}

export function toggleNewClaimDialog() {
	setState((state) => {
		state.showNewClaimDialog = !state.showNewClaimDialog;
	});
}

export function toggleNewUserDialog() {
	setState((state) => {
		state.showNewUserDialog = !state.showNewUserDialog;
	});
}

export function updateClaimConstraints(newConstraints: { page: number; pageSize: number }) {
	setState((state) => {
		state.claimConstraints = newConstraints;
	});
}

export function updateUserConstraints(newConstraints: { page: number; pageSize: number }) {
	setState((state) => {
		state.userConstraints = newConstraints;
	});
}
