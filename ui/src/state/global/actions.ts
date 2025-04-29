import { Checklist } from '../../types';
import { SLICES } from '../storeConfig';
import { GlobalSlice } from '../storeTypes';
import { getStateBuilder, setStateBuilder } from '../storeUtilities';

const getState = getStateBuilder<GlobalSlice>(SLICES.GLOBAL);
const setState = setStateBuilder<GlobalSlice>(SLICES.GLOBAL);

export function toggleNavOpen() {
	setState((state) => {
		state.navOpen = !state.navOpen;
	});
}

export function updateChecklist(newChecklist: Checklist | null) {
	setState((state) => {
		state.checklist = newChecklist;
	});
}

export function updateSelectedPage(newPage: string) {
	setState((state) => {
		state.selectedPage = newPage;
	});
}
