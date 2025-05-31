import { SLICES } from '../storeConfig';
import { AdminSlice } from '../storeTypes';
import { getStateBuilder, setStateBuilder } from '../storeUtilities';

const getState = getStateBuilder<AdminSlice>(SLICES.ADMIN);
const setState = setStateBuilder<AdminSlice>(SLICES.ADMIN);

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

export function updateUserConstraints(newConstraints: { page: number; pageSize: number }) {
	setState((state) => {
		state.userConstraints = newConstraints;
	});
}
