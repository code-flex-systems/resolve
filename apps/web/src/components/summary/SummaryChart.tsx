'use client';
import { PieChart, PieChartProps } from '@mui/x-charts-pro';
import { useChecklistStore } from '@/stores/useChecklistStore';

import { useMemo } from 'react';
import { SummarySegment } from '@/config/enums';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';
import ExpandableTitle from '../common/ExpandableTitle';
import { capitalize } from '@/lib/utils/utils';
import { IconClick, IconFileDescription, IconHelp, IconHelpCircle } from '@tabler/icons-react';
import Collapse from '@/components/ui/Collapse';
import Divider from '@/components/ui/Divider';

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
						color: 'var(--text-accent)',
					},
					{
						id: SummarySegment.UNANSWERED,
						label: 'Unanswered',
						value: totalUnanswered,
						color: 'var(--status-warning)',
					},
				],
				highlightScope: { fade: 'global', highlight: 'item' },
				innerRadius: 140,
				outerRadius: 200,
				cornerRadius: 5,
				faded: { additionalRadius: -3, color: 'var(--text-muted)' },
				valueFormatter: (arc) => `${arc.value.toLocaleString()} questions`,
			},
			{
				id: 'action-required-not-required',
				data: [
					{
						id: SummarySegment.ACTION_REQUIRED,
						label: 'Action required',
						value: total_action_required,
						color: 'var(--text-accent)',
					},
					{
						id: SummarySegment.NO_ACTION_REQUIRED,
						label: 'No action required',
						value: total_answered - total_action_required,
						color: '#CA8EFF',
					},
				],
				highlightScope: { fade: 'global', highlight: 'item' },
				innerRadius: 0,
				outerRadius: 120,
				cornerRadius: 5,
				faded: { additionalRadius: -3, color: 'var(--text-muted)' },
				valueFormatter: (arc) => `${arc.value.toLocaleString()} questions`,
			},
		];
		return series;
	}, [checklistSummaryTotals]);

	return (
		<div style={styles.paper}>
			<div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
				<span>Q/A Summary</span>
			</div>
			<div style={{ padding: '20px 20px 0px' }}>
				<ExpandableTitle
					icon={<IconFileDescription size={20} />}
					color="white"
					title={`Pages (${data.maxPosition.toLocaleString()})`}
					padding="0px 0px 10px"
				/>
				<ExpandableTitle
					icon={<IconHelp size={20} />}
					color="white"
					title={`Questions (${checklistSummaryTotals.total_questions.toLocaleString()})`}
					padding="0px 0px 10px"
				/>
				<Collapse open={selectedSummarySegment === SummarySegment.ACTION_REQUIRED}>
					<ExpandableTitle
						icon={<IconHelpCircle size={20} />}
						color="white"
						title={`Unknowns (${checklistSummaryTotals.total_unknown})`}
						padding="0px 0px 10px"
					/>
				</Collapse>
				<ExpandableTitle
					key={selectedSummarySegment}
					icon={<IconClick size={20} />}
					color="white"
					title={`Selected - ${capitalize(selectedSummarySegment)}`}
					padding="0px 0px 10px"
				/>
			</div>
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
					updateSelectedSegment(
						chartData.find((c) => c.id === arc.seriesId)?.data?.[arc.dataIndex]?.id as SummarySegment
					);
				}}
				width={500}
				height={500}
				sx={{ maxHeight: 500, padding: '0px 30px' }}
			/>
		</div>
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
