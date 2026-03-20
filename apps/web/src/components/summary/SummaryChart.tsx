'use client';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
import Skeleton from '@/components/ui/Skeleton';

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

	const outerData = useMemo(() => {
		if (!checklistSummaryTotals) return [];
		const { total_answered, total_questions } = checklistSummaryTotals;
		const totalUnanswered = total_questions - total_answered;
		return [
			{ id: SummarySegment.ANSWERED, label: 'Answered', value: total_answered, color: 'var(--text-accent)' },
			{ id: SummarySegment.UNANSWERED, label: 'Unanswered', value: totalUnanswered, color: 'var(--status-warning)' },
		];
	}, [checklistSummaryTotals]);

	const innerData = useMemo(() => {
		if (!checklistSummaryTotals) return [];
		const { total_answered, total_action_required } = checklistSummaryTotals;
		return [
			{ id: SummarySegment.ACTION_REQUIRED, label: 'Action required', value: total_action_required, color: 'var(--text-accent)' },
			{ id: SummarySegment.NO_ACTION_REQUIRED, label: 'No action required', value: total_answered - total_action_required, color: '#CA8EFF' },
		];
	}, [checklistSummaryTotals]);

	const handlePieClick = (data: any) => {
		if (data && data.id) {
			updateSelectedSegment(data.id as SummarySegment);
		}
	};

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
			{loadingSummary ? (
				<Skeleton variant="rect" width={500} height={500} />
			) : (
				<div style={{ width: 500, height: 500, padding: '0px 30px' }}>
					<ResponsiveContainer width="100%" height="100%">
						<PieChart>
							{/* Inner ring: action required vs not */}
							<Pie
								data={innerData}
								dataKey="value"
								nameKey="label"
								cx="50%"
								cy="50%"
								innerRadius={0}
								outerRadius={120}
								cornerRadius={5}
								onClick={handlePieClick}
							>
								{innerData.map((entry, i) => (
									<Cell key={i} fill={entry.color} />
								))}
							</Pie>
							{/* Outer ring: answered vs unanswered */}
							<Pie
								data={outerData}
								dataKey="value"
								nameKey="label"
								cx="50%"
								cy="50%"
								innerRadius={140}
								outerRadius={200}
								cornerRadius={5}
								paddingAngle={2}
								onClick={handlePieClick}
							>
								{outerData.map((entry, i) => (
									<Cell key={i} fill={entry.color} />
								))}
							</Pie>
							<Tooltip formatter={(value: any) => [`${(value as number).toLocaleString()} questions`]} />
							<Legend
								layout="vertical"
								verticalAlign="middle"
								align="left"
							/>
						</PieChart>
					</ResponsiveContainer>
				</div>
			)}
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
