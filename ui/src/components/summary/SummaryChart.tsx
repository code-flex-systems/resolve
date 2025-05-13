import { HighlightItemData, PieChart, PieChartProps } from '@mui/x-charts';
import useStore, { useChecklistSlice } from '../../state/store';
import { useChecklistSummary } from '../../api/queries/checklist-queries';
import * as actions from '../../state/checklist/actions';
import { useMemo, useState } from 'react';
import theme, { BASE_COLOR_LIGHT, OFFWHITE_COLOR } from '../../styles/theme';
import { Divider, Fade, Paper, Typography } from '@mui/material';
import Toolbar from '../common/Toolbar';
import { ContactSupport, Description } from '@mui/icons-material';
import { SummarySegment } from '../../config/enums';

export default function SummaryChart() {
	const checklist = useChecklistSlice((state) => state.checklist);
	const checklistSummaryTotals = useChecklistSlice((state) => state.checklistSummaryTotals);
	const claim = useChecklistSlice((state) => state.claim);
	const maxPageInstancePosition = useChecklistSlice((state) => state.maxPageInstancePosition);
	const selectedSummarySegment = useChecklistSlice((state) => state.selectedSummarySegment);
	const { isFetching: loadingSummary } = useChecklistSummary(
		checklist?.id ?? 1,
		claim?.id ?? 5,
		actions.setChecklistSummaryTotals,
		!checklistSummaryTotals
	);

	const chartData = useMemo(() => {
		if (!checklistSummaryTotals) return [];

		const { total_answered, total_questions, total_known, total_unknown } = checklistSummaryTotals;
		const totalUnanswered = parseInt(total_questions) - parseInt(total_answered);
		const series: PieChartProps['series'] = [
			{
				id: 'answered-unanswered',
				data: [
					{
						id: SummarySegment.ANSWERED,
						label: 'Answered',
						value: parseInt(total_answered),
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
						value: parseInt(total_known),
						color: theme.palette.primary.light,
					},
					{
						id: SummarySegment.UNKNOWN,
						label: 'Unknown',
						value: parseInt(total_unknown),
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
							Pages (<b>{maxPageInstancePosition.toLocaleString()}</b>)
						</Typography>
					</>
				}
				padding="2px 20px"
				height={30}
			/>
			<Toolbar
				left={
					<>
						<ContactSupport sx={{ color: 'secondary.main' }} />
						<Typography fontSize={17} marginLeft="5px" fontStyle="italic">
							Questions (
							<b>{parseInt(checklistSummaryTotals?.total_questions ?? '0').toLocaleString()}</b>)
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
						markType: 'line',
					},
				}}
				onItemClick={(_, arc) => {
					actions.updateSelectedSegment(
						chartData.find((c) => c.id === arc.seriesId)?.data?.[arc.dataIndex]?.id as SummarySegment
					);
					// if (selectedSegment === arc.type) {
					// 	actions.updateSelectedSegment(null);
					// 	return;
					// }
					// setSelectedSegment({
					// 	seriesId: arc.seriesId,
					// 	dataIndex: arc.dataIndex,
					// });
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
