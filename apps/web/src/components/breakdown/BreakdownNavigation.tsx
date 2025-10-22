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
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import { DateRange } from '@mui/x-date-pickers-pro';
import dayjs, { Dayjs } from 'dayjs';

export default function BreakdownNavigation({
	user,
	range,
	setSelectedCount,
}: {
	user: GetUserOutput | null;
	range: DateRange<Dayjs>;
	setSelectedCount: (newCount: number) => void;
}) {
	const searchParams = useSearchParams();
	const pageId = +(searchParams.get('pageId') ?? '-1');
	const instanceId = +(searchParams.get('instanceId') ?? '-1');

	const breakdownInterval = useBreakdownStore((state) => state.breakdownInterval);
	const selectedAnswerId = useBreakdownStore((state) => state.selectedAnswerId);
	const updateSelectedAnswerId = useBreakdownStore((state) => state.updateSelectedAnswerId);
	const updateSelectedQuestionId = useBreakdownStore((state) => state.updateSelectedQuestionId);
	const today = dayjs().format('MM/DD/YYYY');
	const { data: questionStats = [], isFetching: loadingStats } = useQuestionTrpc().getStats(
		{
			pageId,
			filters: {
				range: [range[0]?.toString() ?? today, range[1]?.toString() ?? today] as [string, string],
				users: user ? [user.id] : [],
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
			paddingRight="20px"
		>
			<Paper elevation={0} sx={styles.paper}>
				<Box
					width="100%"
					display="flex"
					justifyContent="flex-start"
					alignItems="center"
					paddingTop="10px"
					paddingLeft="10px"
				>
					<Leaderboard sx={{ color: BASE_COLOR_LIGHT, transform: 'rotate(90deg)' }} />
					<Typography fontSize={13} color={BASE_COLOR_LIGHT} marginLeft="10px">
						{pageInstance
							? `Breakdown for ${pageInstance.title}`
							: isLoading
								? 'Loading questions...'
								: 'Waiting for selection...'}
					</Typography>
				</Box>

				<Fade key={isLoading ? 'loading' : 'data'} in={true}>
					<span>
						<Paper elevation={0} sx={{ height: 'calc(100% - 60px)', padding: '20px' }}>
							{isLoading && (
								<div style={styles.loadingContainer} className="flex-col-center">
									<WobbleLoadingIndicator />
								</div>
							)}
							{!isLoading && !questionStats.length && (
								<div style={styles.loadingContainer} className="flex-col-center">
									<Typography color="#d9d9d9" fontSize={15}>
										No response data found
									</Typography>
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
										onAnswerClick={(id: number, count: number) => {
											updateSelectedAnswerId(id);
											setSelectedCount(count);
										}}
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
		backgroundColor: '#F7F8FA',
		padding: 10,
		overflow: 'hidden',
		borderRadius: 0,
	},
	dateFilter: {
		margin: '0px 5px',
	},
	loadingContainer: {
		width: '100%',
		height: 'calc(100% - 120px)',
	},
	paper: {
		width: '100%',
		height: '100%',
		zIndex: 10,
		padding: '20px',
		borderRadius: 6,
		overflow: 'auto',
	},
};
