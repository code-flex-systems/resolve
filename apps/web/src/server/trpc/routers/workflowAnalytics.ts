import * as workflowAnalyticsController from '@/api/controllers/workflowAnalyticsController';
import { getOverviewCounts } from '@/api/queries/overviewQueries';
import { requireRole } from '@/lib/auth/requireRole';
import config from '@/config/config';
import { protectedProcedure, router } from '../trpc';
import {
	getDeskQueueDepthInput,
	getDeskWorkLoadInput,
	getUserWorkloadInput,
	getClaimsApproachingSLABreachInput,
	getTaskThroughputTodayInput,
	getDeadlineStatusOverviewInput,
	getWorkflowStageMetricsInput,
	executeSuggestionInput,
	updateSuggestionInput,
} from '@/schemas/workflowAnalyticsSchemas';

const adminRoles = [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN];

export const workflowAnalyticsRouter = router({
	// ========================================================================
	// OVERVIEW DASHBOARD
	// ========================================================================

	/**
	 * Get aggregated counts for the admin overview dashboard.
	 * Returns SLA breach/warning counts, pending suggestions, and pending approvals.
	 */
	getOverviewCounts: protectedProcedure.query(async ({ ctx }) => {
		requireRole(ctx, adminRoles);
		return getOverviewCounts(ctx);
	}),

	// ========================================================================
	// TIER 0 OPERATIONAL QUERIES
	// ========================================================================

	/**
	 * Get desk location queue depth with SLA status breakdown.
	 * Available to all authenticated users.
	 */
	getDeskQueueDepth: protectedProcedure
		.input(getDeskQueueDepthInput)
		.query(async ({ input, ctx }) => {
			return workflowAnalyticsController.getDeskLocationQueueDepth(ctx, input);
		}),

	/**
	 * Get desk location workload and utilization metrics.
	 * Available to all authenticated users.
	 */
	getDeskWorkLoad: protectedProcedure.input(getDeskWorkLoadInput).query(async ({ input, ctx }) => {
		return workflowAnalyticsController.getDeskLocationWorkLoad(ctx, input);
	}),

	/**
	 * Get user workload and capacity metrics.
	 * Available to all authenticated users.
	 */
	getUserWorkload: protectedProcedure.input(getUserWorkloadInput).query(async ({ input, ctx }) => {
		return workflowAnalyticsController.getUserWorkloadAndCapacity(ctx, input);
	}),

	/**
	 * Get claims approaching or past SLA breach.
	 * Available to all authenticated users.
	 */
	getClaimsApproachingSLABreach: protectedProcedure
		.input(getClaimsApproachingSLABreachInput)
		.query(async ({ input, ctx }) => {
			return workflowAnalyticsController.getClaimsApproachingSLABreach(ctx, input);
		}),

	/**
	 * Get task throughput for today.
	 * Available to all authenticated users.
	 */
	getTaskThroughputToday: protectedProcedure
		.input(getTaskThroughputTodayInput)
		.query(async ({ input, ctx }) => {
			return workflowAnalyticsController.getTaskThroughputToday(ctx, input);
		}),

	/**
	 * Get deadline status overview with counts by status bucket.
	 * Available to all authenticated users.
	 */
	getDeadlineStatusOverview: protectedProcedure
		.input(getDeadlineStatusOverviewInput)
		.query(async ({ input, ctx }) => {
			return workflowAnalyticsController.getDeadlineStatusOverview(ctx, input);
		}),

	// ========================================================================
	// CONFIGURATION HEALTH CHECK (Admin Only)
	// ========================================================================

	/**
	 * Get combined configuration health check results.
	 * Surfaces workflow configuration gaps as admin action items.
	 */
	getConfigurationHealthCheck: protectedProcedure.query(async ({ ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return workflowAnalyticsController.getConfigurationHealthCheck(ctx);
	}),

	// ========================================================================
	// WORKFLOW SUGGESTIONS (Admin Only)
	// ========================================================================

	/**
	 * Generate workflow suggestions based on current load and assignments.
	 * Returns priority reassignment suggestions for admin review.
	 */
	getWorkflowSuggestions: protectedProcedure.query(async ({ ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return workflowAnalyticsController.getWorkflowSuggestions(ctx);
	}),

	/**
	 * Execute a workflow suggestion.
	 * Applies the suggested priority changes to user_desk_location table.
	 */
	executeSuggestion: protectedProcedure
		.input(executeSuggestionInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return workflowAnalyticsController.executeSuggestion(ctx, input);
		}),

	/**
	 * Execute all pending workflow suggestions.
	 * Runs in a single transaction — all-or-nothing.
	 */
	executeAllSuggestions: protectedProcedure.mutation(async ({ ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return workflowAnalyticsController.executeAllSuggestions(ctx);
	}),

	/**
	 * Update a workflow suggestion status.
	 * Can be used to hide, ignore, restore, or mark as executed.
	 */
	updateSuggestion: protectedProcedure
		.input(updateSuggestionInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return workflowAnalyticsController.updateSuggestion(ctx, input);
		}),

	// ========================================================================
	// TIER 1 BATCH QUERIES (Admin Only)
	// ========================================================================

	/**
	 * Get workflow stage metrics from the daily snapshot rollup table.
	 * Shows stage occupancy and SLA metrics over time.
	 */
	getWorkflowStageMetrics: protectedProcedure
		.input(getWorkflowStageMetricsInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return workflowAnalyticsController.getWorkflowStageMetrics(ctx, input);
		}),
});
