'use client';

import { IconGauge, IconTrendingUp, IconUsers } from '@tabler/icons-react';
import { Card, CircularProgress } from '@mui/material';
import MetricCard from './MetricCard';
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
				<CircularProgress />
			</div>
		);
	}

	return (
		<div>
			{/* Page header */}
			<div style={{ marginBottom: 24 }}>
				<span
					style={{
						fontWeight: 700,
						color: 'var(--text-primary)',
						marginBottom: 4,
					}}
				>
					Workflow Management
				</span>
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
			<div
				style={{
					display: 'flex',
					gap: 16,
					flexWrap: 'wrap',
				}}
			>
				{/* Total Workload metric */}
				<MetricCard
					icon={<IconTrendingUp size={20} />}
					iconColor="#21B5FF"
					iconBgColor="rgba(33, 181, 255, 0.1)"
					value={totalClaims}
					label="Total Workload"
					subtitle="Active claims in workflow"
				/>

				{/* Team Capacity metric */}
				<MetricCard
					icon={<IconUsers size={20} />}
					iconColor="#10b981"
					iconBgColor="rgba(16, 185, 129, 0.1)"
					value={utilizationPercent !== null ? `${utilizationPercent}%` : 'N/A'}
					label="Team Capacity"
					subtitle="Average utilization"
				/>

				{/* Throughput metric */}
				<MetricCard
					icon={<IconGauge size={20} />}
					iconColor="#8b5cf6"
					iconBgColor="rgba(139, 92, 246, 0.1)"
					value={`${tasksCreated ? Math.floor((tasksCompleted / tasksCreated) * 100) : 0}%`}
					label="Daily Throughput"
					subtitle={`${tasksCreated} tasks created today`}
				/>

				{/* Open Work Units metric */}
				<MetricCard
					icon={<IconTrendingUp size={20} />}
					iconColor="#f59e0b"
					iconBgColor="rgba(245, 158, 11, 0.1)"
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
