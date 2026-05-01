'use client';

import { useMemo } from 'react';
import CardioLoadingIndicator from '@/components/common/CardioLoadingIndicator';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Chip from '@/components/ui/Chip';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { IconFileText, IconRefresh, IconRss } from '@tabler/icons-react';
import { useClaimTrpc } from '@/hooks/trpc/useClaimTrpc';
import { useFeedTrpc } from '@/hooks/trpc/useFeedTrpc';
import { useWorkflowAnalyticsTrpc } from '@/hooks/trpc/useWorkflowAnalyticsTrpc';

const STATUS_COLORS: Record<string, string> = {
	pending: 'var(--status-info)',
	in_progress: 'var(--status-warning)',
	recovered: 'var(--status-success)',
	closed_no_recovery: 'var(--text-muted)',
	unset: 'var(--border-primary)',
};

const STATUS_LABELS: Record<string, string> = {
	pending: 'Pending',
	in_progress: 'In Progress',
	recovered: 'Recovered',
	closed_no_recovery: 'Closed (No Recovery)',
	unset: 'Not Set',
};

export default function ClaimManagementOverview() {
	const { data: claimCount, isLoading: isLoadingClaims } = useClaimTrpc().count({});
	const { data: rolloverCount, isLoading: isLoadingRollover } =
		useClaimTrpc().countRollover(undefined);
	const { data: feedCount, isLoading: isLoadingFeeds } = useFeedTrpc().count({});
	const { data: statusData } = useClaimTrpc().statusBreakdown(undefined);
	const { data: slaData } = useWorkflowAnalyticsTrpc().getClaimsApproachingSLABreach({ limit: 10 });

	const isLoading = isLoadingClaims || isLoadingRollover || isLoadingFeeds;

	const chartData = useMemo(() => {
		if (!statusData) return [];
		return statusData.byRecoveryStatus.map((r) => ({
			name: STATUS_LABELS[r.status] ?? r.status,
			count: r.count,
			color: STATUS_COLORS[r.status] ?? 'var(--text-muted)',
		}));
	}, [statusData]);

	const slaColumns = useMemo<ColumnDef<any>[]>(
		() => [
			{
				accessorKey: 'claimNumber',
				header: 'Claim #',
				size: 120,
			},
			{
				accessorKey: 'deskLocationName',
				header: 'Desk Location',
				size: 160,
			},
			{
				id: 'assignee',
				header: 'Assignee',
				size: 140,
				cell: ({ row }) => row.original.adjusterName || '—',
			},
			{
				accessorKey: 'hoursRemaining',
				header: 'Hours Left',
				size: 90,
				cell: ({ getValue }) => {
					const hrs = Number(getValue());
					return (
						<span
							style={{
								fontWeight: 600,
								color:
									hrs <= 0
										? 'var(--status-error)'
										: hrs <= 24
											? 'var(--status-warning)'
											: 'var(--text-primary)',
							}}
						>
							{Math.round(hrs)}h
						</span>
					);
				},
			},
			{
				accessorKey: 'slaStatus',
				header: 'Status',
				size: 100,
				cell: ({ getValue }) => {
					const status = getValue() as string;
					const color =
						status === 'breached' ? 'error' : status === 'critical' ? 'warning' : 'neutral';
					return (
						<Chip size="sm" color={color}>
							{status}
						</Chip>
					);
				},
			},
		],
		[]
	);

	if (isLoading) {
		return <CardioLoadingIndicator message="Loading claims data..." />;
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
			<div style={{ display: 'flex', flexDirection: 'column' }}>
				<h6 style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
					Claim Management
				</h6>
				<span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
					Overview of claims inventory, rollovers, and data feeds.
				</span>
			</div>

			<div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
				<KpiCard
					icon={<IconFileText size={20} />}
					iconColor="var(--text-accent)"
					iconBgColor="var(--status-info-bg)"
					value={claimCount?.total ?? 0}
					label="Total Claims"
					subtitle={`${claimCount?.fed ?? 0} fed \u00b7 ${claimCount?.manual ?? 0} manual`}
				/>
				<KpiCard
					icon={<IconRefresh size={20} />}
					iconColor="var(--status-warning)"
					iconBgColor="var(--status-warning-bg)"
					value={rolloverCount?.count ?? 0}
					label="Rollover Claims"
					subtitle="Prior fiscal quarter"
				/>
				<KpiCard
					icon={<IconRss size={20} />}
					iconColor="var(--status-success)"
					iconBgColor="var(--status-success-bg)"
					value={feedCount?.total ?? 0}
					label="Active Feeds"
					subtitle="Data ingestion sources"
				/>
			</div>

			{/* Recovery Status Breakdown */}
			{chartData.length > 0 && (
				<Card variant="beveled" padding="md">
					<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
						<span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
							Claims by Recovery Status
						</span>
						<ResponsiveContainer width="100%" height={chartData.length * 44 + 20}>
							<BarChart
								data={chartData}
								layout="vertical"
								margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
							>
								<XAxis
									type="number"
									fontSize={11}
									tick={{ fill: 'var(--text-muted)' }}
									tickLine={false}
									axisLine={false}
								/>
								<YAxis
									type="category"
									dataKey="name"
									width={140}
									fontSize={12}
									tick={{ fill: 'var(--text-secondary)' }}
									tickLine={false}
									axisLine={false}
								/>
								<Tooltip
									contentStyle={{
										fontSize: 12,
										borderRadius: 6,
										border: '1px solid var(--border-primary)',
										background: 'var(--bg-primary)',
									}}
								/>
								<Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
									{chartData.map((entry, i) => (
										<Cell key={i} fill={entry.color} />
									))}
								</Bar>
							</BarChart>
						</ResponsiveContainer>
					</div>
				</Card>
			)}

			{/* SLA Breach Alerts */}
			{slaData && slaData.length > 0 && (
				<Card variant="beveled" padding="md">
					<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
						<span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
							Claims Approaching SLA Breach
						</span>
						<DataTable
							rows={slaData}
							columns={slaColumns}
							hideFooter
							getRowId={(row) => String(row.claimId)}
						/>
					</div>
				</Card>
			)}
		</div>
	);
}
