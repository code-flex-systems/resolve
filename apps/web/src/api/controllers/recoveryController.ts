import * as recoveryQueries from '@/api/queries/recoveryQueries';
import { ProtectedContext } from '@/server/trpc/trpc';
import type { RecoveryEventParams, DeadlineParams } from '@/schemas/recoverySchemas';
import { DeadlineStatus } from '@/config/enums';
import { DateRangeStrict } from '@/types/types';

// =====================================================================
// RECOVERY EVENT CONTROLLERS
// =====================================================================

/**
 * Create a recovery event and update claim's actual_recovery.
 *
 * @param ctx - request context
 * @param input - claim id and recovery event parameters
 * @returns the newly created recovery event
 */
export async function createRecoveryEvent(
	ctx: ProtectedContext,
	{
		claimId,
		params,
	}: {
		claimId: number;
		params: Omit<RecoveryEventParams, 'claim_id'>;
	}
) {
	return await recoveryQueries.createRecoveryEvent(ctx, claimId, params);
}

/**
 * List recovery events for a claim.
 *
 * @param ctx - request context
 * @param input - claim id
 * @returns list of recovery events
 */
export async function listRecoveryEvents(
	ctx: ProtectedContext,
	{ claimId }: { claimId: number }
) {
	return await recoveryQueries.getRecoveryEvents(ctx, claimId);
}

/**
 * Delete a recovery event and recalculate claim's actual_recovery.
 *
 * @param ctx - request context
 * @param input - recovery event id and claim id
 */
export async function deleteRecoveryEvent(
	ctx: ProtectedContext,
	{
		recoveryEventId,
		claimId,
	}: {
		recoveryEventId: number;
		claimId: number;
	}
) {
	return await recoveryQueries.deleteRecoveryEvent(ctx, recoveryEventId, claimId);
}

// =====================================================================
// DEADLINE CONTROLLERS
// =====================================================================

/**
 * Create a deadline for a claim.
 *
 * @param ctx - request context
 * @param input - claim id and deadline parameters
 * @returns the newly created deadline
 */
export async function createDeadline(
	ctx: ProtectedContext,
	{
		claimId,
		params,
	}: {
		claimId: number;
		params: Omit<DeadlineParams, 'claim_id'>;
	}
) {
	return await recoveryQueries.createDeadline(ctx, claimId, params);
}

/**
 * List deadlines with optional filters.
 *
 * @param ctx - request context
 * @param filters - optional claim id, status, and date range
 * @returns list of deadlines
 */
export async function listDeadlines(
	ctx: ProtectedContext,
	filters: { claimId?: number; status?: string; dateRange?: DateRangeStrict }
) {
	return await recoveryQueries.getDeadlines(ctx, filters);
}

/**
 * Update a deadline's status.
 *
 * @param ctx - request context
 * @param input - deadline id and new status
 * @returns updated deadline
 */
export async function updateDeadlineStatus(
	ctx: ProtectedContext,
	{
		deadlineId,
		status,
	}: {
		deadlineId: number;
		status: DeadlineStatus;
	}
) {
	return await recoveryQueries.updateDeadlineStatus(ctx, deadlineId, status);
}

/**
 * Delete a deadline.
 *
 * @param ctx - request context
 * @param input - deadline id
 */
export async function deleteDeadline(
	ctx: ProtectedContext,
	{ deadlineId }: { deadlineId: number }
) {
	return await recoveryQueries.deleteDeadline(ctx, deadlineId);
}

// =====================================================================
// RECOVERY METRICS CONTROLLERS
// =====================================================================

/**
 * Get recovery metrics summary for KPI display.
 *
 * @param ctx - request context
 * @param range - date range [startDate, endDate]
 * @returns summary with expected, actual, variance, and recovery rate
 */
export async function getRecoveryMetricsSummary(
	ctx: ProtectedContext,
	{ range }: { range: DateRangeStrict }
) {
	return await recoveryQueries.getRecoveryMetricsSummary(ctx, range);
}

/**
 * Get recovery metrics time series for graphing.
 *
 * @param ctx - request context
 * @param range - date range [startDate, endDate]
 * @returns monthly time series data
 */
export async function getRecoveryMetricsTimeSeries(
	ctx: ProtectedContext,
	{ range }: { range: DateRangeStrict }
) {
	return await recoveryQueries.getRecoveryMetricsTimeSeries(ctx, range);
}
