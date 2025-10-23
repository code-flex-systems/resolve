import { useBreakdownStore } from '@/stores/useBreakdownStore';
import { useQuestionTrpc } from './trpc/useQuestionTrpc';
import { useMemo } from 'react';
import dayjs from 'dayjs';
import { useSearchParams } from 'next/navigation';

export default function useSelectedBreakdownAnswerData() {
	const searchParams = useSearchParams();
	const selectedQuestionId = useBreakdownStore((state) => state.selectedQuestionId);
	const selectedAnswerId = useBreakdownStore((state) => state.selectedAnswerId);
	const breakdownClaim = useBreakdownStore((state) => state.breakdownClaim);
	const breakdownRange = useBreakdownStore((state) => state.breakdownRange);
	const breakdownUsers = useBreakdownStore((state) => state.breakdownUsers);
	const pageId = +(searchParams.get('pageId') ?? '-1');
	const today = dayjs().format('MM/DD/YYYY');
	const { data: questionStats = [] } = useQuestionTrpc().getStats(
		{
			pageId,
			filters: {
				claimId: breakdownClaim?.id,
				range: [breakdownRange[0]?.toString() ?? today, breakdownRange[1]?.toString() ?? today] as [
					string,
					string,
				],
				users: breakdownUsers.map((u) => u.id),
			},
		},
		{ enabled: pageId !== -1 }
	);

	return useMemo(() => {
		const question = questionStats.find((q) => q.question_id === selectedQuestionId);
		if (!question) return;
		return question.answers.find((a) => a.answer_id === selectedAnswerId);
	}, [selectedQuestionId, selectedAnswerId, questionStats]);
}
