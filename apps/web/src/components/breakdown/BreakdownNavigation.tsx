'use client';
import { useEffect, useState } from 'react';
import QuestionStatItem from '../checklist/QuestionStatItem';
import { useBreakdownStore } from '@/stores/useBreakdownStore';
import { useQuestionTrpc } from '@/hooks/trpc/useQuestionTrpc';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';
import { useSearchParams } from 'next/navigation';
import { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import type { DateRange } from '@/types/dateTypes';
import dayjs, { Dayjs } from 'dayjs';
import Skeleton from '@/components/ui/Skeleton';
import { IconTrophy } from '@tabler/icons-react';

export default function BreakdownNavigation() {
	const searchParams = useSearchParams();
	const pageId = +(searchParams.get('pageId') ?? '-1');
	const instanceId = +(searchParams.get('instanceId') ?? '-1');

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
		{ enabled: pageId !== -1 }
	);
	const { data: pageInstance, isFetching: loadingPage } = usePageTrpc().getInstance(
		{ instanceId },
		{ enabled: instanceId !== -1 }
	);
	const isLoading = loadingPage || loadingStats;
	const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

	useEffect(() => {});

	return (
		<div
			
			
			
			
			
			
			 style={{ width: 600, minWidth: 600, height: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start', paddingRight: 20 }}
		>
			<div style={styles.paper}>
				<div
					
					
					
					
					
					 style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center', paddingTop: 12, paddingLeft: 12 }}
				>
					<IconTrophy size={20} style={{ color: 'var(--text-muted)', transform: 'rotate(90deg)' }} />
					<span    style={{ fontSize: 14, color: 'var(--text-muted)', marginLeft: 12 }}>
						{pageInstance
							? `Breakdown for ${pageInstance.title}`
							: isLoading
								? 'Loading questions...'
								: 'Waiting for selection...'}
					</span>
				</div>

				<div>
						<div style={styles.contentPaper}>
							{isLoading && (
								<div    style={{ display: 'flex', flexDirection: 'column' as const, gap: 16, width: '100%', padding: 16 }}>
									{[1, 2, 3, 4].map((i) => (
										<Skeleton key={i} variant="rect" height={60} />
									))}
								</div>
							)}
							{!isLoading && !questionStats.length && (
								<div  className="flex-col-center" style={styles.loadingContainer}>
									<span   style={{ color: 'var(--text-muted)', fontSize: 18 }}>
										No response data found
									</span>
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
										onAnswerClick={(id: number) => updateSelectedAnswerId(id)}
										pageId={+pageId}
										selectedAnswerId={selectedAnswerId ?? undefined}
										setExpandedIdx={(newIdx) => {
											setExpandedIdx(newIdx);
											updateSelectedQuestionId(stat.question_id);
										}}
									/>
								))}
						</div>
				</div>
			</div>
		</div>
	);
}

const styles = {
	container: {
		width: 'fit-content',
		minWidth: 500,
		height: 'calc(100vh - 65px)',
		bgcolor: 'background.default',
		p: 1.5,
		overflow: 'hidden',
		borderRadius: 0,
	},
	contentPaper: {
		height: 'calc(100% - 60px)',
		p: 2.5,
	},
	dateFilter: {
		mx: 0.5,
	},
	loadingContainer: {
		width: '100%',
		height: 'calc(100% - 120px)',
	},
	paper: {
		width: '100%',
		height: '100%',
		zIndex: 10,
		p: 2.5,
		overflow: 'auto',
	},
};
