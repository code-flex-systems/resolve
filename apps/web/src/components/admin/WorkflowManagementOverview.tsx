'use client';

import {
	IconAlertTriangle,
	IconCircleCheck,
	IconGauge,
	IconShieldCheck,
	IconTrendingUp,
	IconUsers,
} from '@tabler/icons-react';
import CardioLoadingIndicator from '@/components/common/CardioLoadingIndicator';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Chip from '@/components/ui/Chip';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import PendingExecutionsPanel from '@/components/admin/PendingExecutionsPanel';
import SuggestionsPanel from './SuggestionsPanel';
import { useWorkflowAnalyticsTrpc } from '@/hooks/trpc/useWorkflowAnalyticsTrpc';

/**
 * WorkflowManagementOverview - Overview panel for workflow management analytics
 * Displays top-level metrics: workload utilization, queue depth, and task throughput
 */
export default function WorkflowManagementOverview() {
	const { data: workloadData, isLoading: isLoadingWorkload } =
		useWorkflowAnalyticsTrpc().getDeskWorkLoad({});

	const { data: queueData, isLoading: isLoadingQueue } =
		useWorkflowAnalyticsTrpc().getDeskQueueDepth({});

	const { data: throughputData, isLoading: isLoadingThroughput } =
		useWorkflowAnalyticsTrpc().getTaskThroughputToday({});

	const {
		data: suggestionsData,
		isFetching: isFetchingSuggestions,
		refetch: refetchSuggestions,
	} = useWorkflowAnalyticsTrpc().getWorkflowSuggestions(undefined, {
		staleTime: 15 * 60 * 1000,
	});

	const { data: slaData } = useWorkflowAnalyticsTrpc().getClaimsApproachingSLABreach({ limit: 10 });
	const { data: healthData } = useWorkflowAnalyticsTrpc().getConfigurationHealthCheck(
		undefined as void
	);
	const { data: workloadUsers } = useWorkflowAnalyticsTrpc().getUserWorkload({});

	const isLoading = isLoadingWorkload || isLoadingQueue || isLoadingThroughput;

	// Extract metric values
	const utilizationRatio = workloadData?.workloadUtilizationRatio ?? null;
	const utilizationPercent = utilizationRatio !== null ? Math.round(utilizationRatio * 100) : null;

	const totalClaims = Number(queueData?.totalClaimsInWorkflow ?? 0);
	const totalOpenWorkUnits = Number(queueData?.totalOpenWorkUnits ?? 0);

	const tasksCompleted = Number(throughputData?.totals.tasksCompleted ?? 0);
	const tasksCreated = Number(throughputData?.totals.tasksCreated ?? 0);
	const workUnitsCompleted = Number(throughputData?.totals.workUnitsCompleted ?? 0);

	if (isLoading) {
		return <CardioLoadingIndicator message="Loading workflow data..." />;
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'column' }}>
			{/* Page header */}
			<div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column' }}>
				<h6
					style={{
						margin: 0,
						fontWeight: 700,
						color: 'var(--text-primary)',
						marginBottom: 4,
					}}
				>
					Workflow Management
				</h6>
				<span
					style={{
						fontSize: 14,
						color: 'var(--text-secondary)',
					}}
				>
					Real-time metrics and operational insights across all workflow stages
				</span>
				<p
					style={{
						color: 'var(--text-secondary)',
						fontSize: 13,
						margin: '8px 0 0',
						lineHeight: 1.5,
					}}
				>
					Monitor workflow health and take action on suggested changes. KPIs show real-time workload
					and capacity metrics.
				</p>
			</div>

			{/* Metrics cards */}
			<div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
				<KpiCard
					icon={<IconTrendingUp size={20} />}
					iconColor="var(--text-accent)"
					iconBgColor="var(--status-info-bg)"
					value={totalClaims.toLocaleString()}
					label="Total Workload"
					subtitle="Active claims in workflow"
				/>
				<KpiCard
					icon={<IconUsers size={20} />}
					iconColor="var(--status-success)"
					iconBgColor="var(--status-success-bg)"
					value={utilizationPercent !== null ? `${utilizationPercent}%` : 'N/A'}
					label="Team Capacity"
					subtitle="Average utilization"
				/>
				<KpiCard
					icon={<IconGauge size={20} />}
					iconColor="#8b5cf6"
					iconBgColor="rgba(139, 92, 246, 0.1)"
					value={`${tasksCreated ? Math.floor((tasksCompleted / tasksCreated) * 100) : 0}%`}
					label="Daily Throughput"
					subtitle={`${tasksCreated.toLocaleString()} tasks created today`}
				/>
				<KpiCard
					icon={<IconTrendingUp size={20} />}
					iconColor="var(--status-warning)"
					iconBgColor="var(--status-warning-bg)"
					value={totalOpenWorkUnits.toLocaleString()}
					label="Open Work Units"
					subtitle={`${workUnitsCompleted.toLocaleString()} units completed today`}
				/>
			</div>

			{/* Pending executions panel */}
			<div style={{ marginTop: 24 }}>
				<PendingExecutionsPanel />
			</div>

			{/* Suggestions panel */}
			<div style={{ marginTop: 24 }}>
				<SuggestionsPanel
					data={suggestionsData}
					isFetching={isFetchingSuggestions}
					refetch={refetchSuggestions}
				/>
			</div>

			{/* SLA Alerts */}
			<div style={{ marginTop: 24 }}>
				<Card variant="beveled" padding="md">
					<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
						<span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
							SLA Alerts
						</span>
						{!slaData || slaData.length === 0 ? (
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: 8,
									padding: '12px 0',
									color: 'var(--status-success)',
								}}
							>
								<IconCircleCheck size={18} />
								<span style={{ fontSize: 13 }}>No SLA concerns</span>
							</div>
						) : (
							<div style={{ display: 'flex', flexDirection: 'column' }}>
								{slaData.map((item) => (
									<div
										key={item.claimId}
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: 12,
											padding: '8px 0',
											borderBottom: '1px solid var(--border-primary)',
										}}
									>
										<Chip
											size="sm"
											color={
												item.slaStatus === 'breached'
													? 'error'
													: item.slaStatus === 'critical'
														? 'warning'
														: 'neutral'
											}
										>
											{item.slaStatus}
										</Chip>
										<span
											style={{
												fontSize: 13,
												fontWeight: 500,
												color: 'var(--text-primary)',
												minWidth: 100,
											}}
										>
											{item.claimNumber}
										</span>
										<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', flex: 1 }}>
											{item.deskLocationName}
										</span>
										<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
											{item.adjusterName || '—'}
										</span>
										<span
											style={{
												fontSize: 'var(--text-xs)',
												fontWeight: 600,
												color:
													item.hoursRemaining <= 0
														? 'var(--status-error)'
														: 'var(--text-secondary)',
												minWidth: 60,
												textAlign: 'right',
											}}
										>
											{Math.round(item.hoursRemaining)}h left
										</span>
									</div>
								))}
							</div>
						)}
					</div>
				</Card>
			</div>

			{/* Configuration Health */}
			<div style={{ marginTop: 24 }}>
				<Card variant="beveled" padding="md">
					<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
						<span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
							Configuration Health
						</span>
						{healthData &&
						(healthData.locationsWithoutWorkflow.length > 0 ||
							healthData.workflowsWithoutThreshold.length > 0 ||
							healthData.locationsMissingCapacity.length > 0 ||
							healthData.usersWithoutAssignments.length > 0) ? (
							<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
								{healthData.locationsWithoutWorkflow.length > 0 && (
									<div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
										<IconAlertTriangle size={16} style={{ color: 'var(--status-warning)' }} />
										<span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
											{healthData.locationsWithoutWorkflow.length} desk location
											{healthData.locationsWithoutWorkflow.length !== 1 ? 's' : ''} without
											workflows
										</span>
									</div>
								)}
								{healthData.workflowsWithoutThreshold.length > 0 && (
									<div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
										<IconAlertTriangle size={16} style={{ color: 'var(--status-warning)' }} />
										<span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
											{healthData.workflowsWithoutThreshold.length} workflow
											{healthData.workflowsWithoutThreshold.length !== 1 ? 's' : ''} without
											thresholds
										</span>
									</div>
								)}
								{healthData.locationsMissingCapacity.length > 0 && (
									<div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
										<IconAlertTriangle size={16} style={{ color: 'var(--status-warning)' }} />
										<span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
											{healthData.locationsMissingCapacity.length} location
											{healthData.locationsMissingCapacity.length !== 1 ? 's' : ''} missing capacity
											settings
										</span>
									</div>
								)}
								{healthData.usersWithoutAssignments.length > 0 && (
									<div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
										<IconAlertTriangle size={16} style={{ color: 'var(--status-error)' }} />
										<span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
											{healthData.usersWithoutAssignments.length} user
											{healthData.usersWithoutAssignments.length !== 1 ? 's' : ''} without desk
											assignments
										</span>
									</div>
								)}
							</div>
						) : (
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: 8,
									padding: '12px 0',
									color: 'var(--status-success)',
								}}
							>
								<IconShieldCheck size={18} />
								<span style={{ fontSize: 13 }}>All systems configured</span>
							</div>
						)}
					</div>
				</Card>
			</div>

			{/* User Workload */}
			{workloadUsers && workloadUsers.length > 0 && (
				<div style={{ marginTop: 24 }}>
					<Card variant="beveled" padding="md">
						<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
							<span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
								User Workload
							</span>
							<ResponsiveContainer
								width="100%"
								height={Math.min(workloadUsers.length * 36 + 20, 400)}
							>
								<BarChart
									data={[...workloadUsers]
										.sort((a, b) => (b.utilizationRatio ?? 0) - (a.utilizationRatio ?? 0))
										.slice(0, 10)
										.map((u) => ({
											name: `${u.firstName} ${u.lastName}`,
											utilization: Math.round((u.utilizationRatio ?? 0) * 100),
										}))}
									layout="vertical"
									margin={{ left: 100, right: 20, top: 5, bottom: 5 }}
								>
									<XAxis
										type="number"
										domain={[0, 100]}
										tickFormatter={(v) => `${v}%`}
										fontSize={11}
									/>
									<YAxis
										type="category"
										dataKey="name"
										width={90}
										fontSize={11}
										tick={{ fill: 'var(--text-secondary)' }}
									/>
									<Bar dataKey="utilization" radius={[0, 4, 4, 0]} barSize={20}>
										{[...workloadUsers]
											.sort((a, b) => (b.utilizationRatio ?? 0) - (a.utilizationRatio ?? 0))
											.slice(0, 10)
											.map((_, i) => {
												const val = [...workloadUsers].sort(
													(a, b) => (b.utilizationRatio ?? 0) - (a.utilizationRatio ?? 0)
												)[i];
												const pct = Math.round((val?.utilizationRatio ?? 0) * 100);
												const color =
													pct > 90
														? 'var(--status-error)'
														: pct > 70
															? 'var(--status-warning)'
															: 'var(--status-success)';
												return <Cell key={i} fill={color} />;
											})}
									</Bar>
								</BarChart>
							</ResponsiveContainer>
						</div>
					</Card>
				</div>
			)}
		</div>
	);
}
