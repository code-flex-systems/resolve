import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { SLICES } from './storeConfig';
import { AdminSlice, BreakdownSlice, ChecklistSlice, ChecklistsSlice, GlobalSlice } from './storeTypes';
import globalSlice from './global/initialState';
import { enableMapSet } from 'immer';
import checklistSlice from './checklist/initialState';
import checklistsSlice from './checklists/initialState';
import breakdownSlice from './breakdown/initialState';
import adminSlice from './admin/initialState';

export const initialState = {
	[SLICES.ADMIN]: adminSlice,
	[SLICES.BREAKDOWN]: breakdownSlice,
	[SLICES.CHECKLIST]: checklistSlice,
	[SLICES.CHECKLISTS]: checklistsSlice,
	[SLICES.GLOBAL]: globalSlice,
} as const;
export type State = typeof initialState;
export type Slice = (typeof SLICES)[keyof typeof SLICES];

const useStore = create(immer(() => initialState));

enableMapSet();

export default useStore;

export const resetStoreSlice = <T extends Slice>(slice: T, partialState?: Partial<State[T]>) => {
	useStore.setState((state) => {
		state[slice] = {
			...initialState[slice],
			...(partialState ?? {}),
		};
	});
};

export const useAdminSlice = <T>(callback: (state: AdminSlice) => T): T => {
	return useStore((state) => callback(state[SLICES.ADMIN]));
};

export const useBreakdownSlice = <T>(callback: (state: BreakdownSlice) => T): T => {
	return useStore((state) => callback(state[SLICES.BREAKDOWN]));
};

export const useChecklistSlice = <T>(callback: (state: ChecklistSlice) => T): T => {
	return useStore((state) => callback(state[SLICES.CHECKLIST]));
};

export const useChecklistsSlice = <T>(callback: (state: ChecklistsSlice) => T): T => {
	return useStore((state) => callback(state[SLICES.CHECKLISTS]));
};

export const useGlobalSlice = <T>(callback: (state: GlobalSlice) => T): T => {
	return useStore((state) => callback(state[SLICES.GLOBAL]));
};
