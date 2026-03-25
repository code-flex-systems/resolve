'use client';

import { useMemo } from 'react';
import CardioLoadingIndicator from '@/components/common/CardioLoadingIndicator';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Chip from '@/components/ui/Chip';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { IconChecklist, IconCircleCheck } from '@tabler/icons-react';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { ClaimStatus } from '@/config/enums';
import ClaimsMetric from '@/components/metrics/Claims/ClaimsMetric';
import ActionsMetric from '@/components/metrics/ActionsMetric';

dayjs.extend(relativeTime);

export default function ChecklistsOverview() {
	const { data: countData, isLoading: isLoadingCount } = useChecklistTrpc().count({});
	const { data: statsData, isLoading: isLoadingStats } = useChecklistTrpc().stats({});
	const { data: recentActivityData } = useChecklistTrpc().recentActivity(undefined);

	const isLoading = isLoadingCount || isLoadingStats;

	// Calculate completion rate from stats data
	const submitted = statsData?.[ClaimStatus.SUBMITTED] ?? 0;
	const inProgress = statsData?.[ClaimStatus.IN_PROGRESS] ?? 0;
	const blocked = statsData?.[ClaimStatus.BLOCKED] ?? 0;
	const unworked = statsData?.[ClaimStatus.UNWORKED] ?? 0;
	const totalActive = submitted + inProgress + blocked + unworked;
	const completionRate = totalActive > 0 ? Math.round((submitted / totalActive) * 100) : 0;

	const recentActivityColumns = useMemo<ColumnDef<any>[]>(() => [
		{
			accessorKey: 'checklist_name',
			header: 'Checklist',
			size: 200,
		},
		{
			accessorKey: 'claim_number',
			header: 'Claim #',
			size: 120,
		},
		{
			accessorKey: 'status',
			header: 'Status',
			size: 100,
			cell: ({ getValue }) => {
				const status = getValue() as string;
				const color = status === 'Submitted' ? 'success' : status === 'In Progress' ? 'warning' : 'neutral';
				return <Chip size="sm" color={color}>{status}</Chip>;
			},
		},
		{
			accessorKey: 'answered_today',
			header: 'Answered Today',
			size: 120,
		},
		{
			accessorKey: 'last_opened',
			header: 'Last Opened',
			size: 120,
			cell: ({ getValue }) => {
				const val = getValue() as Date | null;
				return val ? dayjs(val).fromNow() : '\u2014';
			},
		},
	], []);

	if (isLoading) {
		return <CardioLoadingIndicator message="Loading checklists data..." />;
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
			<div style={{ display: 'flex', flexDirection: 'column' }}>
				<h6 style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
					Checklists & Activity
				</h6>
				<span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
					Checklist templates, claim progress, and action execution overview.
				</span>
			</div>

			<div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
				<KpiCard
					icon={<IconChecklist size={20} />}
					iconColor="var(--text-accent)"
					iconBgColor="var(--status-info-bg)"
					value={countData?.total ?? 0}
					label="Total Checklists"
					subtitle={`${countData?.published ?? 0} published \u00b7 ${countData?.unpublished ?? 0} draft`}
				/>
				<KpiCard
					icon={<IconCircleCheck size={20} />}
					iconColor="var(--status-success)"
					iconBgColor="var(--status-success-bg)"
					value={`${completionRate}%`}
					label="Completion Rate"
					subtitle="Claims submitted / total active"
				/>
			</div>

			<div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
				<ClaimsMetric />
				<ActionsMetric />
			</div>

			{/* Recent Activity */}
			{recentActivityData && recentActivityData.length > 0 && (
				<Card variant="beveled" padding="md">
					<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
						<span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Recent Activity</span>
						<DataTable
							rows={recentActivityData}
							columns={recentActivityColumns}
							hideFooter
							getRowId={(row) => `${row.checklist_id}-${row.claim_id}`}
						/>
					</div>
				</Card>
			)}
		</div>
	);
}
