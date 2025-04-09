import { DEFAULT_ANSWER, DEFAULT_QUESTION, DEFAULT_TREE_NODE } from '../../config/defaults';
import { State } from '../store';
import { SLICES } from '../storeConfig';

const getSlice = (state: State) => state[SLICES.CHECKLIST];

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
	const { pages } = getSlice(state);
	return pages.get(selectedPageInfo(state).pageId);
}

export function selectedPageInfo(state: State) {
	const { selectedPageInfo } = getSlice(state);
	return selectedPageInfo ?? DEFAULT_TREE_NODE;
}

export function selectedQuestionData(state: State) {
	const { selectedQuestion } = getSlice(state);
	const pageData = selectedPageData(state);
	if (!pageData || !selectedQuestion) return DEFAULT_QUESTION;
	return pageData.find((q) => q.id === selectedQuestion) ?? DEFAULT_QUESTION;
}
