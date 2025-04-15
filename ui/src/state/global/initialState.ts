import { GlobalSlice } from '../storeTypes';

const globalSlice: GlobalSlice = Object.freeze({
	checklist: null,
	navOpen: false,
	selectedPageInstance: '',
	user: 1,
});

export default globalSlice;
