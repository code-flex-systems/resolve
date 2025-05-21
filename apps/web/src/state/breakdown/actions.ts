import { Interval, PageInstance } from '@/types/types';
import { SLICES } from '../storeConfig';
import { BreakdownSlice } from '../storeTypes';
import { getStateBuilder, setStateBuilder } from '../storeUtilities';

const getState = getStateBuilder<BreakdownSlice>(SLICES.BREAKDOWN);
const setState = setStateBuilder<BreakdownSlice>(SLICES.BREAKDOWN);

export function updateBreakdownInterval(key: keyof Interval<string>, value: string | undefined) {
	setState((state) => {
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
	});
}

export function updatePageInstance(newInstance: PageInstance) {
	setState((state) => {
		state.pageInstance = newInstance;
	});
}

export function updateSelectedAnswerId(newId: number | null) {
	setState((state) => {
		state.selectedAnswerId = newId;
	});
}

export function updateSelectedQuestionId(newId: number | null) {
	setState((state) => {
		state.selectedQuestionId = newId;
		state.selectedAnswerId = null;
	});
}
