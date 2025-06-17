import { SLICES } from '../storeConfig';
import { GlobalSlice } from '../storeTypes';
import { setStateBuilder } from '../storeUtilities';

const setState = setStateBuilder<GlobalSlice>(SLICES.GLOBAL);

export function toggleNavOpen() {
	setState((state) => {
		state.navOpen = !state.navOpen;
	});
}

export function updateSelectedPage(newPage: string) {
	setState((state) => {
		state.selectedPage = newPage;
	});
}
