'use client';

import { IconGauge, IconTrendingUp, IconUsers } from '@tabler/icons-react';
import { Spinner } from '@/components/ui/Progress';
import KpiCard from '@/components/ui/KpiCard';
import PendingExecutionsPanel from '@/components/admin/PendingExecutionsPanel';
import SuggestionsPanel from './SuggestionsPanel';
import { useWorkflowAnalyticsTrpc } from '@/hooks/trpc/useWorkflowAnalyticsTrpc';

// Icons

/**
 * WorkflowManagementDashboard - Main dashboard for workflow management analytics
 * Displays top-level metrics: workload utilization, queue depth, and task throughput
 */
export default function WorkflowManagementDashboard() {
	// Fetch metrics data
	const { data: workloadData, isLoading: isLoadingWorkload } = useWorkflowAnalyticsTrpc().getDeskWorkLoad({});

	const { data: queueData, isLoading: isLoadingQueue } = useWorkflowAnalyticsTrpc().getDeskQueueDepth({});

	const { data: throughputData, isLoading: isLoadingThroughput } = useWorkflowAnalyticsTrpc().getTaskThroughputToday(
		{}
	);

	const {
		data: suggestionsData,
		isFetching: isFetchingSuggestions,
		refetch: refetchSuggestions,
	} = useWorkflowAnalyticsTrpc().getWorkflowSuggestions(undefined, {
		staleTime: 15 * 60 * 1000, // 15 minutes
	});

	const isLoading = isLoadingWorkload || isLoadingQueue || isLoadingThroughput;

	// Extract metric values
	const utilizationRatio = workloadData?.workloadUtilizationRatio ?? null;
	const utilizationPercent = utilizationRatio !== null ? Math.round(utilizationRatio * 100) : null;

	const totalClaims = queueData?.totalClaimsInWorkflow ?? 0;
	const totalOpenWorkUnits = queueData?.totalOpenWorkUnits ?? 0;

	const tasksCompleted = throughputData?.totals.tasksCompleted ?? 0;
	const tasksCreated = throughputData?.totals.tasksCreated ?? 0;
	const workUnitsCompleted = throughputData?.totals.workUnitsCompleted ?? 0;
	const workUnitsCreated = throughputData?.totals.workUnitsCreated ?? 0;

	if (isLoading) {
		return (
			<div
				style={{
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					height: '400px',
				}}
			>
				<Spinner size="lg" />
			</div>
		);
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
			</div>

			{/* Metrics cards */}
			<div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
				<KpiCard
					icon={<IconTrendingUp size={20} />}
					iconColor="var(--text-accent)"
					iconBgColor="var(--status-info-bg)"
					value={totalClaims}
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
					subtitle={`${tasksCreated} tasks created today`}
				/>
				<KpiCard
					icon={<IconTrendingUp size={20} />}
					iconColor="var(--status-warning)"
					iconBgColor="var(--status-warning-bg)"
					value={totalOpenWorkUnits}
					label="Open Work Units"
					subtitle={`${workUnitsCompleted} units completed today`}
				/>
			</div>

			{/* Pending executions panel */}
			<div style={{ marginTop: 24 }}>
				<PendingExecutionsPanel />
			</div>

			{/* Suggestions panel */}
			<div style={{ marginTop: 24 }}>
				<SuggestionsPanel data={suggestionsData} isFetching={isFetchingSuggestions} refetch={refetchSuggestions} />
			</div>
		</div>
	);
}
