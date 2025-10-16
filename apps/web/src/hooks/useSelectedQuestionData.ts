import { useMemo } from 'react';
import { useChecklistStore } from '@/stores/useChecklistStore';
import { useQuestionTrpc } from './trpc/useQuestionTrpc';
import { DEFAULT_QUESTION } from '@/config/defaults';

export function useSelectedQuestionData() {
	const selectedQuestionId = useChecklistStore((state) => state.selectedQuestion);
	const pageId = useChecklistStore((state) => state.selectedPageInfo?.pageId);
	const { data: questions = [] } = useQuestionTrpc().list({ pageId: pageId ?? -1 }, { enabled: Boolean(pageId) });

	return useMemo(() => {
		if (!pageId || !selectedQuestionId || questions.length === 0) {
			return { ...DEFAULT_QUESTION, page_id: pageId ?? -1 };
		}

		const found = questions.find((q) => q.id === selectedQuestionId);
		if (found) return found;

		const maxPosition = questions.reduce((max, q) => Math.max(max, q.position), 0);
		return {
			...DEFAULT_QUESTION,
			page_id: pageId,
			position: maxPosition + 1,
		};
	}, [questions, pageId, selectedQuestionId]);
}
