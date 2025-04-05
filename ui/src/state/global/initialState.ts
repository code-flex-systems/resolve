import { GlobalSlice } from "../storeTypes";

const globalSlice: GlobalSlice = Object.freeze({
	navOpen: false,
	selectedPage: '',
	user: 1
});

export default globalSlice;