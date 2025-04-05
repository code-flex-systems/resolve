import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { SLICES } from './storeConfig';
import { ChecklistSlice, GlobalSlice, HomeSlice } from './storeTypes';
import globalSlice from './global/initialState';
import homeSlice from './home/initialState';
import { enableMapSet } from 'immer';
import checklistSlice from './checklist/initialState';

export const initialState = {
	[SLICES.CHECKLIST]: checklistSlice,
	[SLICES.GLOBAL]: globalSlice,
	[SLICES.HOME]: homeSlice,
} as const;
export type State = typeof initialState;
export type Slice = (typeof SLICES)[keyof typeof SLICES];

const useStore = create(immer(() => initialState));

enableMapSet();

export default useStore;

export const resetStoreSlice = (slice: Slice) => {
	useStore.setState((state) => {
		state[slice] = initialState[slice];
	});
};

export const useChecklistSlice = <T>(callback: (state: ChecklistSlice) => T): T => {
	return useStore((state) => callback(state[SLICES.CHECKLIST]));
};

export const useGlobalSlice = <T>(callback: (state: GlobalSlice) => T): T => {
	return useStore((state) => callback(state[SLICES.GLOBAL]));
};

export const useHomeSlice = <T>(callback: (state: HomeSlice) => T): T => {
	return useStore((state) => callback(state[SLICES.GLOBAL]));
};
