import { useBreakdownSlice } from '@/state/store';
import { useQuestionTrpc } from './trpc/useQuestionTrpc';
import { useMemo } from 'react';

export default function useSelectedBreakdownAnswerData() {
	const selectedQuestionId = useBreakdownSlice((state) => state.selectedQuestionId);
	const selectedAnswerId = useBreakdownSlice((state) => state.selectedAnswerId);
	const breakdownInterval = useBreakdownSlice((state) => state.breakdownInterval);
	const pageId = useBreakdownSlice((state) => state.pageInstance?.id) ?? -1;
	const { data: questionStats = [] } = useQuestionTrpc().getStats(
		{ pageId, interval: breakdownInterval },
		{ enabled: pageId !== -1 }
	);

	return useMemo(() => {
		const question = questionStats.find((q) => q.question_id === selectedQuestionId);
		if (!question) return;
		return question.answers.find((a) => a.answer_id === selectedAnswerId);
	}, [selectedQuestionId, selectedAnswerId, questionStats]);
}
