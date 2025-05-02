import { DEFAULT_ANSWER, DEFAULT_QUESTION, DEFAULT_TREE_NODE } from '../../config/defaults';
import { ChecklistMode } from '../../config/enums';
import { State } from '../store';
import { SLICES } from '../storeConfig';

const getSlice = (state: State) => state[SLICES.CHECKLIST];

export function selectedAnswerData(state: State) {
	const { selectedQuestion, selectedAnswer } = getSlice(state);
	const pageData = selectedPageData(state);
	let defaultAnswer = { ...DEFAULT_ANSWER };
	if (!pageData || !selectedQuestion || !selectedAnswer) return defaultAnswer;
	const answers = pageData.find((q) => q.id === selectedQuestion)?.answers;
	return answers?.find((a) => a.id === selectedAnswer) ?? { ...defaultAnswer, position: (answers?.length ?? 0) + 1 };
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
	const { selectedQuestion, selectedPageInfo } = getSlice(state);
	const pageData = selectedPageData(state);
	if (!pageData || !selectedQuestion) return DEFAULT_QUESTION;
	const maxPosition = pageData.reduce((prevValue, q) => {
		return q.position > prevValue ? q.position : prevValue;
	}, 0);
	return (
		pageData.find((q) => q.id === selectedQuestion) ?? {
			...DEFAULT_QUESTION,
			page_id: selectedPageInfo?.pageId ?? -1,
			position: maxPosition + 1,
		}
	);
}

export function showChecklistData(state: State) {
	const { checklist, claim, mode } = getSlice(state);
	return mode === ChecklistMode.VIEW ? !!checklist && !!claim : !!checklist;
}
