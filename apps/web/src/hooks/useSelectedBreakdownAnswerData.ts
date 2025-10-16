import { useBreakdownStore } from '@/stores/useBreakdownStore';
import { useQuestionTrpc } from './trpc/useQuestionTrpc';
import { useMemo } from 'react';

export default function useSelectedBreakdownAnswerData() {
	const selectedQuestionId = useBreakdownStore((state) => state.selectedQuestionId);
	const selectedAnswerId = useBreakdownStore((state) => state.selectedAnswerId);
	const breakdownInterval = useBreakdownStore((state) => state.breakdownInterval);
	const pageId = useBreakdownStore((state) => state.pageInstance?.id) ?? -1;
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
