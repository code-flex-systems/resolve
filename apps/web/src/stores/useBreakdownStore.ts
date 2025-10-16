import { Interval, PageInstance } from '@/types/types';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface BreakdownState {
	breakdownInterval: Interval<string>;
	pageInstance: PageInstance | null;
	selectedAnswerId: number | null;
	selectedQuestionId: number | null;
}

interface BreakdownActions {
	updateBreakdownInterval: (key: keyof Interval<string>, value: string | undefined) => void;
	updatePageInstance: (newInstance: PageInstance) => void;
	updateSelectedAnswerId: (newId: number | null) => void;
	updateSelectedQuestionId: (newId: number | null) => void;
	reset: (partialState?: Partial<BreakdownState>) => void;
}

type BreakdownStore = BreakdownState & BreakdownActions;

const initialState: BreakdownState = {
	breakdownInterval: {},
	pageInstance: null,
	selectedAnswerId: null,
	selectedQuestionId: null,
};

export const useBreakdownStore = create<BreakdownStore>()(
	immer((set) => ({
		...initialState,

		updateBreakdownInterval: (key, value) =>
			set((state) => {
				if (
					key === 'from' &&
					value &&
					state.breakdownInterval.to &&
					new Date(value) > new Date(state.breakdownInterval.to)
				) {
					state.breakdownInterval.to = undefined;
				}
				if (
					key === 'to' &&
					value &&
					state.breakdownInterval.from &&
					new Date(value) < new Date(state.breakdownInterval.from)
				) {
					state.breakdownInterval.from = undefined;
				}
				state.breakdownInterval[key] = value;
			}),

		updatePageInstance: (newInstance) =>
			set((state) => {
				state.pageInstance = newInstance;
			}),

		updateSelectedAnswerId: (newId) =>
			set((state) => {
				state.selectedAnswerId = newId;
			}),

		updateSelectedQuestionId: (newId) =>
			set((state) => {
				state.selectedQuestionId = newId;
				state.selectedAnswerId = null;
			}),

		reset: (partialState) =>
			set((state) => {
				Object.assign(state, { ...initialState, ...partialState });
			}),
	}))
);
