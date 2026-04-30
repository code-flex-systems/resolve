'use client';
import { useState } from 'react';
import QuestionStatItem from '../checklist/QuestionStatItem';
import { useBreakdownStore } from '@/stores/useBreakdownStore';
import { useQuestionTrpc } from '@/hooks/trpc/useQuestionTrpc';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';
import { useSearchParams } from 'next/navigation';
import dayjs from 'dayjs';
import Skeleton from '@/components/ui/Skeleton';
import { IconListTree } from '@tabler/icons-react';
import Card from '@/components/ui/Card';
import styles from './BreakdownNavigation.module.css';

export default function BreakdownNavigation() {
	const searchParams = useSearchParams();
	const pageId = searchParams.get('pageId') ?? '';
	const instanceId = searchParams.get('instanceId') ?? '';
	const pagePosition = Number(searchParams.get('pagePosition') ?? '0');

	const breakdownClaim = useBreakdownStore((state) => state.breakdownClaim);
	const breakdownRange = useBreakdownStore((state) => state.breakdownRange);
	const breakdownUsers = useBreakdownStore((state) => state.breakdownUsers);
	const selectedAnswerId = useBreakdownStore((state) => state.selectedAnswerId);
	const updateSelectedAnswerId = useBreakdownStore((state) => state.updateSelectedAnswerId);
	const updateSelectedQuestionId = useBreakdownStore((state) => state.updateSelectedQuestionId);
	const today = dayjs().format('MM/DD/YYYY');
	const { data: questionStats = [], isFetching: loadingStats } = useQuestionTrpc().getStats(
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
		{ enabled: !!pageId }
	);
	const { data: pageInstance, isFetching: loadingPage } = usePageTrpc().getInstance(
		{ instanceId },
		{ enabled: !!instanceId }
	);
	const isLoading = loadingPage || loadingStats;
	const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

	return (
		<Card variant="float" padding="md" className={styles.card}>
			<div className={styles.header}>
				<IconListTree size={18} style={{ color: 'var(--text-muted)' }} />
				<span className={styles.headerText}>
					{pageInstance
						? `Breakdown for ${pageInstance.title}`
						: isLoading
							? 'Loading questions...'
							: 'Waiting for selection...'}
				</span>
			</div>

			<div className={styles.body}>
				{isLoading && (
					<div className={styles.skeletonList}>
						{[1, 2, 3, 4].map((i) => (
							<Skeleton key={i} variant="rect" height={60} />
						))}
					</div>
				)}
				{!isLoading && !questionStats.length && (
					<div className={styles.empty}>
						<span className={styles.emptyText}>No response data found</span>
					</div>
				)}
				{!isLoading &&
					!!questionStats.length &&
					questionStats.map((stat, i) => (
						<QuestionStatItem
							key={i}
							expandedIdx={expandedIdx}
							idx={i}
							item={stat}
							onAnswerClick={(id: string) => updateSelectedAnswerId(id)}
							pagePosition={pagePosition}
							selectedAnswerId={selectedAnswerId ?? undefined}
							setExpandedIdx={(newIdx) => {
								setExpandedIdx(newIdx);
								updateSelectedQuestionId(stat.question_id);
							}}
						/>
					))}
			</div>
		</Card>
	);
}
