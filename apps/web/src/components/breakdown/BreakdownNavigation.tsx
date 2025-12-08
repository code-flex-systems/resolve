'use client';
import { useEffect, useState } from 'react';
import { Box, Fade, Paper, Stack, Typography } from '@mui/material';
import QuestionStatItem from '../checklist/QuestionStatItem';
import { useBreakdownStore } from '@/stores/useBreakdownStore';
import Leaderboard from '@mui/icons-material/Leaderboard';
import { useQuestionTrpc } from '@/hooks/trpc/useQuestionTrpc';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';
import WobbleLoadingIndicator from '../common/WobbleLoadingIndicator';
import { useSearchParams } from 'next/navigation';
import { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import { DateRange } from '@mui/x-date-pickers-pro';
import dayjs, { Dayjs } from 'dayjs';

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
		<Stack
			width={600}
			minWidth={600}
			height="100%"
			display="flex"
			justifyContent="flex-start"
			alignItems="flex-start"
			pr={2.5}
		>
			<Paper elevation={0} sx={styles.paper}>
				<Box
					width="100%"
					display="flex"
					justifyContent="flex-start"
					alignItems="center"
					pt={1.5}
					pl={1.5}
				>
					<Leaderboard sx={{ color: 'var(--color-text-muted)', transform: 'rotate(90deg)' }} />
					<Typography fontSize="var(--font-size-base)" color="var(--color-text-muted)" ml={1.5}>
						{pageInstance
							? `Breakdown for ${pageInstance.title}`
							: isLoading
								? 'Loading questions...'
								: 'Waiting for selection...'}
					</Typography>
				</Box>

				<Fade key={isLoading ? 'loading' : 'data'} in={true}>
					<span>
						<Paper elevation={0} sx={styles.contentPaper}>
							{isLoading && (
								<Box sx={styles.loadingContainer} className="flex-col-center">
									<WobbleLoadingIndicator />
								</Box>
							)}
							{!isLoading && !questionStats.length && (
								<Box sx={styles.loadingContainer} className="flex-col-center">
									<Typography color="var(--color-text-muted)" fontSize="var(--font-size-lg)">
										No response data found
									</Typography>
								</Box>
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
						</Paper>
					</span>
				</Fade>
			</Paper>
		</Stack>
	);
}

const styles = {
	container: {
		width: 'fit-content',
		minWidth: 500,
		height: 'calc(100vh - 65px)',
		bgcolor: 'var(--color-bg-tertiary)',
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
		borderRadius: 'var(--radius-md)',
		border: '1px solid var(--color-border)',
		overflow: 'auto',
	},
};
