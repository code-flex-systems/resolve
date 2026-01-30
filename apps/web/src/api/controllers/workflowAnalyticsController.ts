import type { ProtectedContext } from '@/server/trpc/trpc';
import * as workflowAnalyticsQueries from '@/api/queries/workflowAnalyticsQueries';
import { generateWorkflowSuggestions, serializeSuggestion } from '@/lib/workflow/suggestions';

// ============================================================================
// TIER 0 OPERATIONAL QUERIES
// ============================================================================

/**
 * Get desk location queue depth with SLA status breakdown.
 */
export async function getDeskLocationQueueDepth(
	ctx: ProtectedContext,
	input: { deskLocationId?: number }
) {
	return await workflowAnalyticsQueries.getDeskLocationQueueDepth(ctx, input.deskLocationId);
}

/**
 * Get desk location workload and utilization metrics.
 */
export async function getDeskLocationWorkLoad(
	ctx: ProtectedContext,
	input: { deskLocationId?: number }
) {
	return await workflowAnalyticsQueries.getDeskLocationWorkLoad(ctx, input.deskLocationId);
}

/**
 * Get user workload and capacity metrics.
 */
export async function getUserWorkloadAndCapacity(
	ctx: ProtectedContext,
	input: { userId?: string; deskLocationId?: number }
) {
	return await workflowAnalyticsQueries.getUserWorkloadAndCapacity(ctx, {
		userId: input.userId,
		deskLocationId: input.deskLocationId,
	});
}

/**
 * Get claims approaching or past SLA breach.
 */
export async function getClaimsApproachingSLABreach(
	ctx: ProtectedContext,
	input: { limit: number }
) {
	return await workflowAnalyticsQueries.getClaimsApproachingSLABreach(ctx, input.limit);
}

/**
 * Get task throughput for today.
 */
export async function getTaskThroughputToday(
	ctx: ProtectedContext,
	input: { deskLocationId?: number; userId?: string }
) {
	return await workflowAnalyticsQueries.getTaskThroughputToday(ctx, {
		deskLocationId: input.deskLocationId,
		userId: input.userId,
	});
}

/**
 * Get deadline status overview with counts by status bucket.
 */
export async function getDeadlineStatusOverview(
	ctx: ProtectedContext,
	input: { deadlineType?: string; createdBy?: string; claimId?: number }
) {
	return await workflowAnalyticsQueries.getDeadlineStatusOverview(ctx, {
		deadlineType: input.deadlineType,
		createdBy: input.createdBy,
		claimId: input.claimId,
	});
}

// ============================================================================
// CONFIGURATION HEALTH CHECK
// ============================================================================

/**
 * Get combined configuration health check results.
 * Surfaces workflow configuration gaps as admin action items.
 */
export async function getConfigurationHealthCheck(ctx: ProtectedContext) {
	const [
		locationsWithoutWorkflow,
		workflowsWithoutThreshold,
		locationsMissingCapacity,
		usersWithoutAssignments,
	] = await Promise.all([
		workflowAnalyticsQueries.getDeskLocationsWithoutWorkflow(ctx),
		workflowAnalyticsQueries.getWorkflowsWithoutLocationAgeThreshold(ctx),
		workflowAnalyticsQueries.getDeskLocationsMissingCapacity(ctx),
		workflowAnalyticsQueries.getUsersWithoutDeskAssignments(ctx),
	]);

	return {
		locationsWithoutWorkflow,
		workflowsWithoutThreshold,
		locationsMissingCapacity,
		usersWithoutAssignments,
	};
}

// ============================================================================
// WORKFLOW SUGGESTIONS
// ============================================================================

/**
 * Fetch current load/assignment data and run the suggestion algorithm.
 * Returns serialized suggestions for admin review.
 */
export async function getWorkflowSuggestions(ctx: ProtectedContext) {
	const { locations, assignments, currentTasks } =
		await workflowAnalyticsQueries.getSuggestionInput(ctx);

	const suggestion = generateWorkflowSuggestions(locations, assignments, currentTasks);
	return serializeSuggestion(suggestion);
}

// ============================================================================
// TIER 1 BATCH QUERIES
// ============================================================================

/**
 * Get workflow stage metrics from the daily snapshot rollup table.
 */
export async function getWorkflowStageMetrics(
	ctx: ProtectedContext,
	input: { startDate: string; endDate: string; deskLocationTypeId?: number; deskLocationId?: number }
) {
	return await workflowAnalyticsQueries.getWorkflowStageMetrics(ctx, {
		startDate: input.startDate,
		endDate: input.endDate,
		deskLocationTypeId: input.deskLocationTypeId,
		deskLocationId: input.deskLocationId,
	});
}
