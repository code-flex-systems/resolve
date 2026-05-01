'use client';

import { useMemo } from 'react';
import { SummarySegment } from '@/config/enums';
import { useChecklistStore } from '@/stores/useChecklistStore';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';

interface BreakdownRow {
	id: SummarySegment;
	label: string;
	value: number;
	color: string;
	description: string;
}

export default function SummaryChart() {
	const { checklistId, claimId } = useChecklistParams();
	const { data: pageData = { tree: [], maxPosition: 0 } } = usePageTrpc().getInstanceTree(
		{ checklistId: checklistId!, claimId: claimId! },
		{ enabled: !!checklistId && !!claimId }
	);
	const selectedSummarySegment = useChecklistStore((state) => state.selectedSummarySegment);
	const updateSelectedSegment = useChecklistStore((state) => state.updateSelectedSegment);
	const {
		data: totals = {
			total_answered: 0,
			total_questions: 0,
			total_action_required: 0,
			total_unknown: 0,
		},
		isFetching: loading,
	} = useChecklistTrpc().getSummary(
		{ checklistId: checklistId!, claimId: claimId! },
		{ enabled: !!checklistId && !!claimId }
	);

	const rows: BreakdownRow[] = useMemo(() => {
		const unanswered = totals.total_questions - totals.total_answered;
		return [
			{
				id: SummarySegment.ANSWERED,
				label: 'Answered',
				value: totals.total_answered,
				color: 'var(--status-success, #81c784)',
				description: 'Questions with a response',
			},
			{
				id: SummarySegment.UNANSWERED,
				label: 'Unanswered',
				value: unanswered,
				color: 'var(--status-warning, #ffb74d)',
				description: 'Questions not yet answered',
			},
			{
				id: SummarySegment.UNKNOWN,
				label: 'Unknown',
				value: totals.total_unknown,
				color: '#90a4ae',
				description: 'Answered with "unknown" or similar',
			},
			{
				id: SummarySegment.ACTION_REQUIRED,
				label: 'Action Required',
				value: totals.total_action_required,
				color: 'var(--text-accent, #4fc3f7)',
				description: 'Needs follow-up or additional info',
			},
		];
	}, [totals]);

	const maxValue = Math.max(...rows.map((r) => r.value), 1);
	const progressPct =
		totals.total_questions > 0
			? Math.round((totals.total_answered / totals.total_questions) * 100)
			: 0;

	if (loading) {
		return (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
				<Skeleton variant="rect" width="100%" height={60} />
				<Skeleton variant="rect" width="100%" height={200} />
			</div>
		);
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
			{/* Progress summary */}
			<Card variant="beveled" padding="md">
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'baseline',
						marginBottom: 8,
					}}
				>
					<span style={{ fontSize: 14, fontWeight: 600 }}>Progress</span>
					<span style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-accent)' }}>
						{progressPct}%
					</span>
				</div>
				<div
					style={{
						height: 6,
						background: 'var(--bg-tertiary, #2a2a2a)',
						borderRadius: 3,
						overflow: 'hidden',
					}}
				>
					<div
						style={{
							width: `${progressPct}%`,
							height: '100%',
							background: 'var(--text-accent)',
							borderRadius: 3,
							transition: 'width 0.3s ease',
						}}
					/>
				</div>
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						marginTop: 6,
						fontSize: 12,
						color: 'var(--text-secondary)',
					}}
				>
					<span>
						{totals.total_answered} of {totals.total_questions} questions
					</span>
					<span>{pageData.maxPosition} pages</span>
				</div>
			</Card>

			{/* Breakdown rows */}
			<Card variant="beveled" padding="md" style={{ flex: 1 }}>
				<span style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'block' }}>
					Breakdown
				</span>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
					{rows.map((row) => {
						const barWidth = Math.min((row.value / maxValue) * 100, 100);
						const isSelected = selectedSummarySegment === row.id;

						return (
							<div
								key={row.id}
								onClick={() => updateSelectedSegment(row.id)}
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: 12,
									padding: '10px 12px',
									borderRadius: 6,
									background: isSelected
										? `color-mix(in srgb, ${row.color} 12%, transparent)`
										: 'transparent',
									cursor: 'pointer',
									transition: 'background 0.15s ease',
									border: isSelected ? `1px solid ${row.color}` : '1px solid transparent',
								}}
							>
								<div style={{ width: 120, flexShrink: 0 }}>
									<div style={{ fontSize: 13, fontWeight: isSelected ? 600 : 400 }}>
										{row.label}
									</div>
									<div style={{ fontSize: 11, color: 'var(--text-secondary, #999)' }}>
										{row.description}
									</div>
								</div>
								<div
									style={{
										flex: 1,
										height: 8,
										background: 'var(--bg-tertiary, #2a2a2a)',
										borderRadius: 4,
										overflow: 'hidden',
									}}
								>
									<div
										style={{
											width: `${barWidth}%`,
											height: '100%',
											background: row.color,
											borderRadius: 4,
											transition: 'width 0.3s ease',
										}}
									/>
								</div>
								<div
									style={{
										width: 40,
										textAlign: 'right',
										fontSize: 14,
										fontWeight: 600,
										color: row.color,
										flexShrink: 0,
									}}
								>
									{row.value}
								</div>
							</div>
						);
					})}
				</div>
			</Card>
		</div>
	);
}
