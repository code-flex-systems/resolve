'use client';
import { PieChart, PieChartProps } from '@mui/x-charts-pro';
import { useChecklistSlice } from '@/state/store';
import * as actions from '@/state/checklist/actions';
import { useMemo } from 'react';
import theme, { BASE_COLOR, BASE_COLOR_LIGHT, OFFWHITE_COLOR, PURPLE } from '@/styles/theme';
import { Box, Divider, Paper, Stack, Typography } from '@mui/material';
import { AdsClick, Help, Description } from '@mui/icons-material';
import { SummarySegment } from '@/config/enums';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';
import ExpandableTitle from '../common/ExpandableTitle';
import { capitalize } from '@/lib/utils/utils';

export default function SummaryChart() {
	const { checklistId = -1, claimId = -1 } = useChecklistParams();
	const { data = { tree: [], maxPosition: 0 } } = usePageTrpc().getInstanceTree(
		{ checklistId, claimId },
		{ enabled: checklistId !== -1 && claimId !== -1 }
	);
	const selectedSummarySegment = useChecklistSlice((state) => state.selectedSummarySegment);
	const {
		data: checklistSummaryTotals = { total_answered: 0, total_questions: 0, total_known: 0, total_unknown: 0 },
		isFetching: loadingSummary,
	} = useChecklistTrpc().getSummary(
		{
			checklistId,
			claimId,
		},
		{ enabled: checklistId !== -1 && claimId !== -1 }
	);

	const chartData = useMemo(() => {
		if (!checklistSummaryTotals) return [];

		const { total_answered, total_questions, total_known, total_unknown } = checklistSummaryTotals;
		const totalUnanswered = total_questions - total_answered;
		const series: PieChartProps['series'] = [
			{
				id: 'answered-unanswered',
				data: [
					{
						id: SummarySegment.ANSWERED,
						label: 'Answered',
						value: total_answered,
						color: theme.palette.primary.main,
					},
					{
						id: SummarySegment.UNANSWERED,
						label: 'Unanswered',
						value: totalUnanswered,
						color: theme.palette.warning.main,
					},
				],
				highlightScope: { fade: 'global', highlight: 'item' },
				innerRadius: 140,
				outerRadius: 200,
				cornerRadius: 5,
				faded: { additionalRadius: -3, color: BASE_COLOR_LIGHT },
				valueFormatter: (arc) => `${arc.value.toLocaleString()} questions`,
			},
			{
				id: 'known-unknown',
				data: [
					{
						id: SummarySegment.KNOWN,
						label: 'Known',
						value: total_known,
						color: theme.palette.secondary.main,
					},
					{
						id: SummarySegment.UNKNOWN,
						label: 'Unknown',
						value: total_unknown,
						color: PURPLE,
					},
				],
				highlightScope: { fade: 'global', highlight: 'item' },
				innerRadius: 0,
				outerRadius: 120,
				cornerRadius: 5,
				faded: { additionalRadius: -3, color: BASE_COLOR_LIGHT },
				valueFormatter: (arc) => `${arc.value.toLocaleString()} questions`,
			},
		];
		return series;
	}, [checklistSummaryTotals]);

	return (
		<Paper elevation={0} sx={styles.paper}>
			<Box width="100%" display="flex" justifyContent="flex-start" alignItems="center">
				{/* <Paper
					elevation={0}
					sx={{
						width: 'fit-content',
						background: theme.palette.primary.main,
						padding: '5px 10px',
						borderRadius: 3,
					}}
					className="flex-row-center"
				> */}
				<Typography fontSize={17}>Q/A Summary</Typography>
				{/* </Paper> */}
			</Box>
			<Stack padding="20px 20px 0px">
				<ExpandableTitle
					icon={<Description sx={{ color: BASE_COLOR }} />}
					color="white"
					title={`Pages (${data.maxPosition.toLocaleString()})`}
					padding="0px 0px 10px"
				/>
				<ExpandableTitle
					icon={<Help sx={{ color: BASE_COLOR }} />}
					color="white"
					title={`Questions (${checklistSummaryTotals.total_questions.toLocaleString()})`}
					padding="0px 0px 10px"
				/>
				<ExpandableTitle
					key={selectedSummarySegment}
					icon={<AdsClick sx={{ color: BASE_COLOR }} />}
					color="white"
					title={`Selected - ${capitalize(selectedSummarySegment)}`}
					padding="0px 0px 10px"
				/>
			</Stack>
			<div style={styles.divider}>
				<Divider />
			</div>
			<PieChart
				loading={loadingSummary}
				series={chartData}
				slotProps={{
					legend: {
						direction: 'vertical',
						position: { vertical: 'middle', horizontal: 'start' },
					},
				}}
				onItemClick={(_, arc) => {
					actions.updateSelectedSegment(
						chartData.find((c) => c.id === arc.seriesId)?.data?.[arc.dataIndex]?.id as SummarySegment
					);
				}}
				width={500}
				height={500}
				sx={{ maxHeight: 500, padding: '0px 30px' }}
			/>
		</Paper>
	);
}

const styles = {
	divider: {
		width: '100%',
		height: 1,
		padding: '5px 10px',
	},
	paper: {
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		height: '100%',
		borderRadius: 6,
		padding: '20px',
	},
	row: {
		width: '100%',
		padding: 10,
	},
};
