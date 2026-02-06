'use client';

import { Box, Typography, CircularProgress } from '@mui/material';
import MetricCard from './MetricCard';
import SuggestionsPanel from './SuggestionsPanel';
import { useWorkflowAnalyticsTrpc } from '@/hooks/trpc/useWorkflowAnalyticsTrpc';

// Icons
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/People';
import SpeedIcon from '@mui/icons-material/Speed';
import { TEXT_PRIMARY } from '@/styles/theme';

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
			<Box
				sx={{
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					height: '400px',
				}}
			>
				<CircularProgress />
			</Box>
		);
	}

	return (
		<Box>
			{/* Page header */}
			<Box sx={{ mb: 3 }}>
				<Typography
					variant="h4"
					sx={{
						fontWeight: 700,
						color: TEXT_PRIMARY,
						mb: 0.5,
					}}
				>
					Workflow Management
				</Typography>
				<Typography
					sx={{
						fontSize: 14,
						color: 'text.secondary',
					}}
				>
					Real-time metrics and operational insights across all workflow stages
				</Typography>
			</Box>

			{/* Metrics cards */}
			<Box
				sx={{
					display: 'flex',
					gap: 2,
					flexWrap: 'wrap',
				}}
			>
				{/* Total Workload metric */}
				<MetricCard
					icon={<TrendingUpIcon />}
					iconColor="#21B5FF"
					iconBgColor="rgba(33, 181, 255, 0.1)"
					value={totalClaims}
					label="Total Workload"
					subtitle="Active claims in workflow"
				/>

				{/* Team Capacity metric */}
				<MetricCard
					icon={<PeopleIcon />}
					iconColor="#10b981"
					iconBgColor="rgba(16, 185, 129, 0.1)"
					value={utilizationPercent !== null ? `${utilizationPercent}%` : 'N/A'}
					label="Team Capacity"
					subtitle="Average utilization"
				/>

				{/* Throughput metric */}
				<MetricCard
					icon={<SpeedIcon />}
					iconColor="#8b5cf6"
					iconBgColor="rgba(139, 92, 246, 0.1)"
					value={`${tasksCreated ? Math.floor((tasksCompleted / tasksCreated) * 100) : 0}%`}
					label="Daily Throughput"
					subtitle={`${tasksCreated} tasks created today`}
				/>

				{/* Open Work Units metric */}
				<MetricCard
					icon={<TrendingUpIcon />}
					iconColor="#f59e0b"
					iconBgColor="rgba(245, 158, 11, 0.1)"
					value={totalOpenWorkUnits}
					label="Open Work Units"
					subtitle={`${workUnitsCompleted} units completed today`}
				/>
			</Box>

			{/* Suggestions panel */}
			<Box sx={{ mt: 3 }}>
				<SuggestionsPanel data={suggestionsData} isFetching={isFetchingSuggestions} refetch={refetchSuggestions} />
			</Box>
		</Box>
	);
}
