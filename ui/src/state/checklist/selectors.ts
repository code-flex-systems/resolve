import { DEFAULT_ANSWER, DEFAULT_QUESTION } from '../../config/defaults';
import { State } from '../store';
import { SLICES } from '../storeConfig';

const getSlice = (state: State) => state[SLICES.CHECKLIST];

export function selectedPageInfo(state: State) {}

export function selectedAnswerData(state: State) {
	const { selectedQuestion, selectedAnswer } = getSlice(state);
	const pageData = selectedPageData(state);
	let defaultAnswer = { ...DEFAULT_ANSWER };
	if (!pageData || !selectedQuestion || !selectedAnswer) return defaultAnswer;
	return (
		pageData.find((q) => q.id === selectedQuestion)?.answers?.find((a) => a.id === selectedAnswer) ?? defaultAnswer
	);
}

export function selectedPageData(state: State) {
	const { selectedPage, pages } = getSlice(state);
	return selectedPage ? pages.get(selectedPage) : undefined;
}

export function selectedQuestionData(state: State) {
	const { selectedQuestion } = getSlice(state);
	const pageData = selectedPageData(state);
	if (!pageData || !selectedQuestion) return DEFAULT_QUESTION;
	return pageData.find((q) => q.id === selectedQuestion) ?? DEFAULT_QUESTION;
}
