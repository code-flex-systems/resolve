import { generateIntervalKey } from '@/lib/utils/utils';
import { State } from '../store';
import { SLICES } from '../storeConfig';

const getSlice = (state: State) => state[SLICES.BREAKDOWN];

export function selectedAnswer(state: State) {
	const { selectedAnswerId } = getSlice(state);
	const selectedQuestionData = selectedQuestion(state);
	return selectedAnswerId && selectedQuestionData
		? selectedQuestionData.answers.find((a) => a.answer_id === selectedAnswerId)
		: undefined;
}

export function selectedQuestion(state: State) {
	const { breakdownInterval, selectedQuestionId, pageInstance, questionStats } = getSlice(state);
	if (!pageInstance) return undefined;
	const questionStatsForPage =
		questionStats.get(generateIntervalKey(pageInstance.id, breakdownInterval.from, breakdownInterval.to)) ?? [];
	return selectedQuestionId ? questionStatsForPage.find((q) => q.question_id === selectedQuestionId) : undefined;
}
