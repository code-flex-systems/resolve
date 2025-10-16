import { useMemo } from 'react';
import { useChecklistStore } from '@/stores/useChecklistStore';
import { useQuestionTrpc } from './trpc/useQuestionTrpc';
import { DEFAULT_ANSWER } from '@/config/defaults';
import { Answer } from '@/types/types';

export function useSelectedAnswerData(): Answer {
	const selectedQuestionId = useChecklistStore((state) => state.selectedQuestion);
	const selectedAnswerId = useChecklistStore((state) => state.selectedAnswer);
	const pageId = useChecklistStore((state) => state.selectedPageInfo?.pageId);
	const { data: questions = [] } = useQuestionTrpc().list({ pageId: pageId ?? -1 }, { enabled: Boolean(pageId) });

	return useMemo(() => {
		if (!pageId || !selectedQuestionId || questions.length === 0) {
			return { ...DEFAULT_ANSWER, page_id: pageId ?? -1 };
		}

		const answers = questions.find((q) => q.id === selectedQuestionId)?.answers;
		const found = answers?.find((a) => a.id === selectedAnswerId);
		if (found) return found;

		return {
			...DEFAULT_ANSWER,
			position: (answers?.length ?? 0) + 1,
		};
	}, [questions, pageId, selectedQuestionId, selectedAnswerId]);
}
