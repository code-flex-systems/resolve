import { z } from 'zod';
import { SuggestionStatus } from '@/config/enums';

// ============================================================================
// TIER 0 OPERATIONAL QUERY INPUTS
// ============================================================================

/**
 * Input for desk location queue depth query
 * Returns claims count and SLA status breakdown by desk location
 */
export const getDeskQueueDepthInput = z.object({
	deskLocationId: z.number().int().positive().optional(),
});
export type GetDeskQueueDepthInput = z.infer<typeof getDeskQueueDepthInput>;

/**
 * Input for desk location workload query
 * Returns task counts and utilization by desk location
 */
export const getDeskWorkLoadInput = z.object({
	deskLocationId: z.number().int().positive().optional(),
});
export type GetDeskWorkLoadInput = z.infer<typeof getDeskWorkLoadInput>;

/**
 * Input for user workload and capacity query
 * Returns per-user task counts and capacity metrics
 */
export const getUserWorkloadInput = z.object({
	userId: z.string().uuid().optional(),
	deskLocationId: z.number().int().positive().optional(),
});
export type GetUserWorkloadInput = z.infer<typeof getUserWorkloadInput>;

/**
 * Input for claims approaching SLA breach query
 * Returns claims ordered by hours remaining until SLA breach
 */
export const getClaimsApproachingSLABreachInput = z.object({
	limit: z.number().int().positive().max(100).default(20),
});
export type GetClaimsApproachingSLABreachInput = z.infer<typeof getClaimsApproachingSLABreachInput>;

/**
 * Input for task throughput query
 * Returns completed task counts for today, optionally filtered
 */
export const getTaskThroughputTodayInput = z.object({
	deskLocationId: z.number().int().positive().optional(),
	userId: z.string().uuid().optional(),
});
export type GetTaskThroughputTodayInput = z.infer<typeof getTaskThroughputTodayInput>;

/**
 * Input for deadline status overview query
 * Returns counts by status bucket: overdue, due today, next 7 days, completed, cancelled
 */
export const getDeadlineStatusOverviewInput = z.object({
	deadlineType: z.string().optional(),
	createdBy: z.string().uuid().optional(),
	claimId: z.number().int().positive().optional(),
});
export type GetDeadlineStatusOverviewInput = z.infer<typeof getDeadlineStatusOverviewInput>;

// ============================================================================
// TIER 1 BATCH QUERY INPUTS
// ============================================================================

/**
 * Input for workflow stage metrics query
 * Reads from the daily_workflow_stage_snapshot rollup table
 */
export const getWorkflowStageMetricsInput = z.object({
	startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
	endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
	deskLocationTypeId: z.number().int().positive().optional(),
	deskLocationId: z.number().int().positive().optional(),
});
export type GetWorkflowStageMetricsInput = z.infer<typeof getWorkflowStageMetricsInput>;

// ============================================================================
// REFRESH QUERY INPUTS (for nightly job)
// ============================================================================

/**
 * Input for daily snapshot refresh
 * Populates the analytics.daily_workflow_stage_snapshot table for a specific date
 */
export const refreshSnapshotInput = z.object({
	snapshotDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
});
export type RefreshSnapshotInput = z.infer<typeof refreshSnapshotInput>;

// ============================================================================
// WORKFLOW SUGGESTION MANAGEMENT
// ============================================================================

/**
 * Input for executing a workflow suggestion
 * Applies the suggested priority changes to user_desk_location table
 */
export const executeSuggestionInput = z.object({
	suggestionId: z.string().uuid(),
});
export type ExecuteSuggestionInput = z.infer<typeof executeSuggestionInput>;

/**
 * Input for updating a workflow suggestion status
 * Used for hide, ignore, or restore operations.
 * EXECUTED status must go through the executeSuggestion endpoint.
 */
export const updateSuggestionInput = z.object({
	suggestionId: z.string().uuid(),
	status: z.enum([SuggestionStatus.PENDING, SuggestionStatus.IGNORED, SuggestionStatus.HIDDEN]),
});
export type UpdateSuggestionInput = z.infer<typeof updateSuggestionInput>;
