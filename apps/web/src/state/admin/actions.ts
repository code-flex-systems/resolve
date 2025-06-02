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
