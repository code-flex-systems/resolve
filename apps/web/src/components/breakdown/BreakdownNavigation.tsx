'use client';
import { useState } from 'react';
import { Box, Fade, Paper, Typography } from '@mui/material';
import QuestionStatItem from '../checklist/QuestionStatItem';
import { useBreakdownSlice } from '@/state/store';
import * as actions from '@/state/breakdown/actions';
import { Description } from '@mui/icons-material';
import { useQuestionTrpc } from '@/hooks/trpc/useQuestionTrpc';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';
import WobbleLoadingIndicator from '../common/WobbleLoadingIndicator';
import ExpandableTitle from '../common/ExpandableTitle';

export default function BreakdownNavigation(props: { pageId: number; instanceId: number }) {
	const { pageId, instanceId } = props;
	const breakdownInterval = useBreakdownSlice((state) => state.breakdownInterval);
	const selectedAnswerId = useBreakdownSlice((state) => state.selectedAnswerId);
	const { data: questionStats = [], isFetching: loadingStats } = useQuestionTrpc().getStats(
		{ pageId, interval: breakdownInterval },
		{ enabled: pageId !== -1 }
	);
	const { data: pageInstance, isFetching: loadingPage } = usePageTrpc().getInstance(
		{ instanceId },
		{ enabled: instanceId !== -1 }
	);
	const isLoading = loadingPage || loadingStats;
	const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

	return (
		<Paper style={styles.container}>
			<Fade key={isLoading ? 'loading' : 'data'} in={true}>
				<span>
					{isLoading && (
						<div style={styles.loadingContainer} className="flex-col-center">
							<WobbleLoadingIndicator />
						</div>
					)}
					{!isLoading && (
						<Box
							width="100%"
							display="flex"
							justifyContent="flex-start"
							alignItems="center"
							padding="10px 10px 20px"
						>
							<ExpandableTitle
								title={`Breakdown for ${pageInstance?.title ?? ''}`}
								icon={<Description sx={{ color: 'white' }} />}
							/>
						</Box>
					)}
					{!isLoading && !questionStats.length && (
						<div style={styles.loadingContainer} className="flex-col-center">
							<Typography fontStyle="italic" color="primary">
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
								onAnswerClick={(id: number) => actions.updateSelectedAnswerId(id)}
								pageId={+pageId}
								selectedAnswerId={selectedAnswerId ?? undefined}
								setExpandedIdx={(newIdx) => {
									setExpandedIdx(newIdx);
									actions.updateSelectedQuestionId(stat.question_id);
								}}
							/>
						))}
				</span>
			</Fade>
		</Paper>
	);
}

const styles = {
	container: {
		width: 'fit-content',
		minWidth: 500,
		height: 'calc(100vh - 55px)',
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
};
