import { useMemo } from 'react';
import { useChecklistStore } from '@/stores/useChecklistStore';
import { useQuestionTrpc } from './trpc/useQuestionTrpc';
import { DEFAULT_QUESTION } from '@/config/defaults';

export function useSelectedQuestionData() {
	const selectedQuestionId = useChecklistStore((state) => state.selectedQuestion);
	const pageId = useChecklistStore((state) => state.selectedPageInfo?.pageId);
	const { data: questions = [] } = useQuestionTrpc().list(
		{ pageId: pageId ?? '' },
		{ enabled: Boolean(pageId) }
	);

	return useMemo(() => {
		if (!pageId || !selectedQuestionId || questions.length === 0) {
			return { ...DEFAULT_QUESTION, page_id: pageId ?? '' };
		}

		const found = questions.find((q) => q.id === selectedQuestionId);
		if (found) return found;

		return {
			...DEFAULT_QUESTION,
			page_id: pageId,
			position: questions.length + 1,
		};
	}, [questions, pageId, selectedQuestionId]);
}
