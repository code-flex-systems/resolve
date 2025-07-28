'use client';
import { useState } from 'react';
import { Collapse, Fade, IconButton, Paper, TextField, Typography } from '@mui/material';
import QuestionStatItem from '../checklist/QuestionStatItem';
import theme, { BASE_COLOR, OFFWHITE_COLOR } from '@/styles/theme';
import { useBreakdownSlice } from '@/state/store';
import { LineWobble } from 'ldrs/react';
import 'ldrs/react/LineWobble.css';
import Toolbar from '../common/Toolbar';
import * as actions from '@/state/breakdown/actions';
import { Interval } from '@/types/types';
import { Cancel } from '@mui/icons-material';
import { useQuestionTrpc } from '@/hooks/trpc/useQuestionTrpc';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';

function ClearableDateFilter(props: { id: keyof Interval<string>; label: string; value?: string }) {
	return (
		<div style={styles.dateFilter} className="flex-row-left">
			<TextField
				label={props.label}
				value={props.value ?? ''}
				type="date"
				onChange={(e) => actions.updateBreakdownInterval(props.id, e.target.value ?? undefined)}
				sx={{ marginRight: '5px' }}
			/>
			<Fade in={!!props.value}>
				<span>
					<IconButton
						onClick={() => actions.updateBreakdownInterval(props.id, undefined)}
						sx={{ marginTop: '15px' }}
						disableRipple
					>
						<Cancel sx={{ fontSize: 17, color: BASE_COLOR }} />
					</IconButton>
				</span>
			</Fade>
		</div>
	);
}

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
	const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

	return (
		<Paper style={styles.container}>
			<Toolbar
				left={
					loadingPage ? undefined : (
						<Typography fontSize={20} lineHeight="21px">
							Breakdown for {pageInstance?.title ?? ''}
						</Typography>
					)
				}
				leftWidth="80%"
				rightWidth="20%"
				height={60}
				padding="5px"
			/>
			<Toolbar
				left={
					<>
						<ClearableDateFilter id="from" label="From" value={breakdownInterval.from} />
						<ClearableDateFilter id="to" label="To" value={breakdownInterval.to} />
					</>
				}
				leftWidth="80%"
				rightWidth="20%"
				height={60}
			/>
			{loadingStats && (
				<div style={styles.loadingContainer} className="flex-col-center">
					<Typography fontStyle="italic" color="primary">
						Loading...
					</Typography>
					<LineWobble size="200" stroke="5" bgOpacity="0.1" speed="2" color={theme.palette.primary.main} />
				</div>
			)}
			{!loadingStats && !questionStats.length && (
				<div style={styles.loadingContainer} className="flex-col-center">
					<Typography fontStyle="italic" color="primary">
						No response data found
					</Typography>
				</div>
			)}
			<Collapse in={!loadingStats} unmountOnExit>
				{questionStats.map((stat, i) => (
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
			</Collapse>
		</Paper>
	);
}

const styles = {
	container: {
		width: 'fit-content',
		minWidth: 500,
		height: '100vh',
		backgroundColor: OFFWHITE_COLOR,
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
