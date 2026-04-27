import { trpc } from '@/lib/trpc';
import type { RouterInput, RouterOutput } from '@/types/routerTypes';

type WorkflowAnalyticsInput = RouterInput['workflowAnalytics'];
type WorkflowAnalyticsOutput = RouterOutput['workflowAnalytics'];

/**
 * Custom hook for workflow analytics tRPC operations
 * Provides convenience wrappers for analytics queries
 *
 * Tier 0: Real-time operational queries (available to all users)
 * Tier 1: Batch analytics from rollup tables (admin only)
 * Health Check: Configuration gap analysis (admin only)
 */
export function useWorkflowAnalyticsTrpc() {
	const utils = trpc.useUtils();

	return {
		// ====================================================================
		// TIER 0 OPERATIONAL QUERIES (Real-time, All Users)
		// ====================================================================

		/**
		 * Get desk location queue depth with SLA status breakdown
		 * Shows claims count per location with healthy/warning/breached buckets
		 * Optional filter by specific desk location
		 */
		getDeskQueueDepth: trpc.workflowAnalytics.getDeskQueueDepth.useQuery,

		/**
		 * Get desk location workload and utilization metrics
		 * Shows current task load vs capacity for each location
		 * Optional filter by specific desk location
		 */
		getDeskWorkLoad: trpc.workflowAnalytics.getDeskWorkLoad.useQuery,

		/**
		 * Get user workload and capacity metrics
		 * Shows per-user task counts and utilization ratio
		 * Optional filter by user ID or desk location
		 */
		getUserWorkload: trpc.workflowAnalytics.getUserWorkload.useQuery,

		/**
		 * Get claims approaching or past SLA breach
		 * Ordered by hours remaining (most urgent first)
		 * Configurable limit (default 20, max 100)
		 */
		getClaimsApproachingSLABreach:
			trpc.workflowAnalytics.getClaimsApproachingSLABreach.useQuery,

		/**
		 * Get task throughput for today
		 * Shows completed and created tasks/work units grouped by desk location and user
		 * Optional filter by desk location or user
		 */
		getTaskThroughputToday: trpc.workflowAnalytics.getTaskThroughputToday.useQuery,

		/**
		 * Get deadline status overview with counts by status bucket
		 * Shows overdue, due today, next 7 days, completed, cancelled
		 * Optional filters by deadline type, creator, or claim
		 */
		getDeadlineStatusOverview:
			trpc.workflowAnalytics.getDeadlineStatusOverview.useQuery,

		// ====================================================================
		// CONFIGURATION HEALTH CHECK (Admin Only)
		// ====================================================================

		/**
		 * Get combined configuration health check results
		 * Surfaces workflow configuration gaps as admin action items:
		 * - Desk locations without workflow definitions
		 * - Workflows without location_age thresholds
		 * - Desk locations missing capacity configuration
		 * - Users without desk assignments
		 */
		getConfigurationHealthCheck:
			trpc.workflowAnalytics.getConfigurationHealthCheck.useQuery,

		// ====================================================================
		// WORKFLOW SUGGESTIONS (Admin Only)
		// ====================================================================

		/**
		 * Generate workflow suggestions based on current load and assignments
		 * Returns priority reassignment suggestions for admin review
		 */
		getWorkflowSuggestions:
			trpc.workflowAnalytics.getWorkflowSuggestions.useQuery,

		/**
		 * Execute a workflow suggestion
		 * Applies suggested priority changes to user_desk_location table
		 */
		executeSuggestion: trpc.workflowAnalytics.executeSuggestion.useMutation({
			onSuccess() {
				utils.workflowAnalytics.getWorkflowSuggestions.invalidate();
				utils.workflowAnalytics.getDeskQueueDepth.invalidate();
				utils.workflowAnalytics.getUserWorkload.invalidate();
			},
		}),

		/**
		 * Execute all pending workflow suggestions
		 * Runs in a single transaction — all-or-nothing
		 */
		executeAllSuggestions: trpc.workflowAnalytics.executeAllSuggestions.useMutation({
			onSuccess() {
				utils.workflowAnalytics.getWorkflowSuggestions.invalidate();
				utils.workflowAnalytics.getDeskQueueDepth.invalidate();
				utils.workflowAnalytics.getUserWorkload.invalidate();
			},
		}),

		/**
		 * Update a workflow suggestion status
		 * Used for hide, ignore, or restore operations
		 */
		updateSuggestion: trpc.workflowAnalytics.updateSuggestion.useMutation({
			onSuccess() {
				utils.workflowAnalytics.getWorkflowSuggestions.invalidate();
			},
		}),

		// ====================================================================
		// TIER 1 BATCH QUERIES (Admin Only, from rollup tables)
		// ====================================================================

		/**
		 * Get workflow stage metrics time series
		 * Reads from daily_workflow_stage_snapshot rollup table
		 * Shows stage occupancy and SLA metrics over time
		 * Required: startDate, endDate (YYYY-MM-DD format)
		 * Optional: deskLocationTypeId (filter by phase), deskLocationId (filter by stage)
		 */
		getWorkflowStageMetrics:
			trpc.workflowAnalytics.getWorkflowStageMetrics.useQuery,
	};
}

/**
 * Export types for use in components
 * These are derived from the tRPC router output types
 */

// Tier 0 output types
export type DeskQueueDepthResult = WorkflowAnalyticsOutput['getDeskQueueDepth'];
export type DeskQueueDepthItem = DeskQueueDepthResult['rows'][number];

export type DeskWorkLoadResult = WorkflowAnalyticsOutput['getDeskWorkLoad'];
export type DeskWorkLoadItem = DeskWorkLoadResult['rows'][number];

export type UserWorkloadResult = WorkflowAnalyticsOutput['getUserWorkload'];
export type UserWorkloadItem = UserWorkloadResult[number];

export type ClaimsApproachingSLABreachResult =
	WorkflowAnalyticsOutput['getClaimsApproachingSLABreach'];
export type ClaimSLABreachItem = ClaimsApproachingSLABreachResult[number];

export type TaskThroughputResult = WorkflowAnalyticsOutput['getTaskThroughputToday'];
export type TaskThroughputItem = TaskThroughputResult['rows'][number];

export type DeadlineStatusOverviewResult =
	WorkflowAnalyticsOutput['getDeadlineStatusOverview'];

// Health check output type
export type ConfigurationHealthCheckResult =
	WorkflowAnalyticsOutput['getConfigurationHealthCheck'];

// Workflow suggestions output type
export type WorkflowSuggestionsResult =
	WorkflowAnalyticsOutput['getWorkflowSuggestions'];
export type UpdateSuggestionInput = WorkflowAnalyticsInput['updateSuggestion'];

// Tier 1 output types
export type WorkflowStageMetricsResult =
	WorkflowAnalyticsOutput['getWorkflowStageMetrics'];
export type WorkflowStageMetricsItem = WorkflowStageMetricsResult[number];

// Input types for components that need them
export type GetDeskQueueDepthInput = WorkflowAnalyticsInput['getDeskQueueDepth'];
export type GetDeskWorkLoadInput = WorkflowAnalyticsInput['getDeskWorkLoad'];
export type GetUserWorkloadInput = WorkflowAnalyticsInput['getUserWorkload'];
export type GetClaimsApproachingSLABreachInput =
	WorkflowAnalyticsInput['getClaimsApproachingSLABreach'];
export type GetTaskThroughputTodayInput =
	WorkflowAnalyticsInput['getTaskThroughputToday'];
export type GetDeadlineStatusOverviewInput =
	WorkflowAnalyticsInput['getDeadlineStatusOverview'];
export type GetWorkflowStageMetricsInput =
	WorkflowAnalyticsInput['getWorkflowStageMetrics'];
