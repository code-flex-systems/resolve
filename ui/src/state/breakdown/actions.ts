import { AnswerResponse, Interval, PageInstance, QuestionStat } from '../../types';
import { generateIntervalKey } from '../../utils/utils';
import { SLICES } from '../storeConfig';
import { BreakdownSlice } from '../storeTypes';
import { getStateBuilder, setStateBuilder } from '../storeUtilities';

const getState = getStateBuilder<BreakdownSlice>(SLICES.BREAKDOWN);
const setState = setStateBuilder<BreakdownSlice>(SLICES.BREAKDOWN);

export function updateAnswerBreakdown(answerId: number, newData: AnswerResponse[] | null, from?: string, to?: string) {
	setState((state) => {
		if (newData) {
			state.answerBreakdowns.set(generateIntervalKey(answerId, from, to), newData);
		} else {
			state.answerBreakdowns.delete(answerId.toString());
		}
	});
}

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

export function updateQuestionStats(pageId: number, newStats: QuestionStat[], from?: string, to?: string) {
	setState((state) => {
		state.questionStats.set(generateIntervalKey(pageId, from, to), newStats);
	});
}
