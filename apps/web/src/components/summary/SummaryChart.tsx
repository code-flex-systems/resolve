'use client';
import { PieChart, PieChartProps } from '@mui/x-charts';
import { useChecklistSlice } from '@/state/store';
import * as actions from '@/state/checklist/actions';
import { useMemo } from 'react';
import theme, { BASE_COLOR_LIGHT, OFFWHITE_COLOR } from '@/styles/theme';
import { Divider, Paper, Typography } from '@mui/material';
import Toolbar from '../common/Toolbar';
import { Help, Description } from '@mui/icons-material';
import { SummarySegment } from '@/config/enums';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';

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
						color: theme.palette.secondary.main,
					},
				],
				highlightScope: { fade: 'global', highlight: 'item' },
				innerRadius: 140,
				outerRadius: 200,
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
						color: theme.palette.primary.light,
					},
					{
						id: SummarySegment.UNKNOWN,
						label: 'Unknown',
						value: total_unknown,
						color: theme.palette.secondary.light,
					},
				],
				highlightScope: { fade: 'global', highlight: 'item' },
				innerRadius: 0,
				outerRadius: 120,
				faded: { additionalRadius: -3, color: BASE_COLOR_LIGHT },
				valueFormatter: (arc) => `${arc.value.toLocaleString()} questions`,
			},
		];
		return series;
	}, [checklistSummaryTotals]);

	return (
		<Paper sx={styles.paper}>
			<div style={styles.row} className="flex-row-left">
				<Typography fontWeight="bold" fontSize={20}>
					Summary
				</Typography>
			</div>
			<div style={styles.divider}>
				<Divider />
			</div>
			<Toolbar
				left={
					<>
						<Description sx={{ color: 'secondary.main' }} />
						<Typography fontSize={17} marginLeft="5px" fontStyle="italic">
							Pages (<b>{data.maxPosition.toLocaleString()}</b>)
						</Typography>
					</>
				}
				padding="2px 20px"
				height={30}
			/>
			<Toolbar
				left={
					<>
						<Help sx={{ color: 'secondary.main' }} />
						<Typography fontSize={17} marginLeft="5px" fontStyle="italic">
							Questions (<b>{checklistSummaryTotals.total_questions.toLocaleString()}</b>)
						</Typography>
					</>
				}
				height={30}
				padding="2px 20px"
			/>
			<div style={styles.divider}>
				<Divider />
			</div>
			<Typography paddingLeft="10px" paddingTop="10px" fontStyle="italic">
				<b>Selected:</b> {selectedSummarySegment[0].toUpperCase()}
				{selectedSummarySegment.slice(1)}
			</Typography>
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
		backgroundColor: OFFWHITE_COLOR,
	},
	row: {
		width: '100%',
		padding: 10,
	},
};
