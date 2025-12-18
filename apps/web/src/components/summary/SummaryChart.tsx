'use client';
import { PieChart, PieChartProps } from '@mui/x-charts-pro';
import { useChecklistStore } from '@/stores/useChecklistStore';

import { useMemo } from 'react';
import theme, { BASE_COLOR, BASE_COLOR_LIGHT, OFFWHITE_COLOR, PURPLE } from '@/styles/theme';
import { Box, Collapse, Divider, Paper, Stack, Typography } from '@mui/material';
import AdsClick from '@mui/icons-material/AdsClick';
import Help from '@mui/icons-material/Help';
import HelpOutline from '@mui/icons-material/HelpOutline';
import Description from '@mui/icons-material/Description';
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
	const selectedSummarySegment = useChecklistStore((state) => state.selectedSummarySegment);
	const updateSelectedSegment = useChecklistStore((state) => state.updateSelectedSegment);
	const {
		data: checklistSummaryTotals = {
			total_answered: 0,
			total_questions: 0,
			total_action_required: 0,
			total_unknown: 0,
		},
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

		const { total_answered, total_questions, total_action_required, total_unknown } = checklistSummaryTotals;
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
				id: 'action-required-not-required',
				data: [
					{
						id: SummarySegment.ACTION_REQUIRED,
						label: 'Action required',
						value: total_action_required,
						color: theme.palette.secondary.main,
					},
					{
						id: SummarySegment.NO_ACTION_REQUIRED,
						label: 'No action required',
						value: total_answered - total_action_required,
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
				<Typography variant="h6">Q/A Summary</Typography>
			</Box>
			<Stack padding="20px 20px 0px">
				<ExpandableTitle
					icon={<Description />}
					color="white"
					title={`Pages (${data.maxPosition.toLocaleString()})`}
					padding="0px 0px 10px"
				/>
				<ExpandableTitle
					icon={<Help />}
					color="white"
					title={`Questions (${checklistSummaryTotals.total_questions.toLocaleString()})`}
					padding="0px 0px 10px"
				/>
				<Collapse in={selectedSummarySegment === SummarySegment.ACTION_REQUIRED}>
					<ExpandableTitle
						icon={<HelpOutline />}
						color="white"
						title={`Unknowns (${checklistSummaryTotals.total_unknown})`}
						padding="0px 0px 10px"
					/>
				</Collapse>
				<ExpandableTitle
					key={selectedSummarySegment}
					icon={<AdsClick />}
					color="white"
					title={`Selected - ${capitalize(selectedSummarySegment)}`}
					padding="0px 0px 10px"
				/>
			</Stack>
			<Box sx={styles.divider}>
				<Divider />
			</Box>
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
					updateSelectedSegment(
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
		padding: '5px 10px',
	},
	paper: {
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		height: '100%',
		borderRadius: 6,
		padding: '30px',
	},
	row: {
		width: '100%',
		padding: 12,
	},
};
