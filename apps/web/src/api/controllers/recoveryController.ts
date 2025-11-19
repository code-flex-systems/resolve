import * as recoveryQueries from '@/api/queries/recoveryQueries';
import { ProtectedContext } from '@/server/trpc/trpc';
import type { RecoveryEventParams, DeadlineParams } from '@/schemas/recoverySchemas';
import { DeadlineStatus } from '@/config/enums';
import { DateRangeStrict } from '@/types/types';
import { logAdminAction, AdminAction, EntityName } from '@/api/utils/adminActionLogger';

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
	// Create recovery event and log admin action within transaction
	const created = await ctx.db.transaction().execute(async (trx) => {
		const event = await recoveryQueries.createRecoveryEvent({ ...ctx, db: trx }, claimId, params);

		// Log recovery event creation
		await logAdminAction({ ...ctx, db: trx }, {
			entityId: event.id,
			entityName: EntityName.RECOVERY_EVENT,
			action: AdminAction.CREATE,
			value: { claimId, recovery_amount: event.recovery_amount, recovery_date: event.recovery_date, recovery_source: event.recovery_source },
		});

		return event;
	});

	return created;
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
	// Delete recovery event and log admin action within transaction
	await ctx.db.transaction().execute(async (trx) => {
		// Fetch recovery event data BEFORE deletion for logging
		const event = await recoveryQueries.getRecoveryEventForDeletion({ ...ctx, db: trx }, recoveryEventId);

		// Delete the recovery event
		await recoveryQueries.deleteRecoveryEvent({ ...ctx, db: trx }, recoveryEventId, claimId);

		// Log admin action for recovery event deletion
		if (event) {
			await logAdminAction({ ...ctx, db: trx }, {
				entityId: recoveryEventId,
				entityName: EntityName.RECOVERY_EVENT,
				action: AdminAction.DELETE,
				value: { claimId: event.claim_id, recovery_amount: event.recovery_amount, recovery_date: event.recovery_date, recovery_source: event.recovery_source },
			});
		}
	});
}

/**
 * List recovery events with optional filters for breakdown page.
 *
 * @param ctx - request context
 * @param input - filters, limit, and offset for pagination
 * @returns paginated list of recovery events with claim details
 */
export async function listRecoveryEventsWithFilters(
	ctx: ProtectedContext,
	input: {
		filters: {
			range?: DateRangeStrict;
			recoverySource?: string;
			recoveryStatus?: string;
			checklistId?: number;
			userId?: string;
		};
		limit?: number;
		offset?: number;
	}
) {
	return await recoveryQueries.listRecoveryEventsWithFilters(
		ctx,
		input.filters,
		input.limit,
		input.offset
	);
}

/**
 * Export all recovery events matching filters (for CSV export).
 *
 * @param ctx - request context
 * @param input - filters (no pagination)
 * @returns all matching recovery events
 */
export async function exportRecoveryEvents(
	ctx: ProtectedContext,
	input: {
		filters: {
			range?: DateRangeStrict;
			recoverySource?: string;
			recoveryStatus?: string;
			checklistId?: number;
			userId?: string;
		};
	}
) {
	return await recoveryQueries.exportRecoveryEvents(ctx, input.filters);
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
	// Create deadline and log admin action within transaction
	const created = await ctx.db.transaction().execute(async (trx) => {
		const deadline = await recoveryQueries.createDeadline({ ...ctx, db: trx }, claimId, params);

		// Log deadline creation
		await logAdminAction({ ...ctx, db: trx }, {
			entityId: deadline.id,
			entityName: EntityName.DEADLINE,
			action: AdminAction.CREATE,
			value: { claimId, deadline_date: deadline.deadline_date, deadline_type: deadline.deadline_type, status: deadline.status, description: deadline.description },
		});

		return deadline;
	});

	return created;
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
	// Update deadline status and log admin action within transaction
	const updated = await ctx.db.transaction().execute(async (trx) => {
		const deadline = await recoveryQueries.updateDeadlineStatus({ ...ctx, db: trx }, deadlineId, status);

		// Log admin action for deadline status update
		await logAdminAction({ ...ctx, db: trx }, {
			entityId: deadlineId,
			entityName: EntityName.DEADLINE,
			action: AdminAction.UPDATE,
			value: { status },
		});

		return deadline;
	});

	return updated;
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
	// Delete deadline and log admin action within transaction
	await ctx.db.transaction().execute(async (trx) => {
		// Fetch deadline data BEFORE deletion for logging
		const deadline = await recoveryQueries.getDeadlineForDeletion({ ...ctx, db: trx }, deadlineId);

		// Delete the deadline
		await recoveryQueries.deleteDeadline({ ...ctx, db: trx }, deadlineId);

		// Log admin action for deadline deletion
		if (deadline) {
			await logAdminAction({ ...ctx, db: trx }, {
				entityId: deadlineId,
				entityName: EntityName.DEADLINE,
				action: AdminAction.DELETE,
				value: { claimId: deadline.claim_id, deadline_date: deadline.deadline_date, deadline_type: deadline.deadline_type, status: deadline.status, description: deadline.description },
			});
		}
	});
}

// =====================================================================
// RECOVERY METRICS CONTROLLERS
// =====================================================================

/**
 * Get recovery metrics summary for KPI display.
 *
 * @param ctx - request context
 * @param input - date range and optional filters
 * @returns summary with expected, actual, variance, and recovery rate
 */
export async function getRecoveryMetricsSummary(
	ctx: ProtectedContext,
	input: {
		range: DateRangeStrict;
		recoverySource?: string;
		recoveryStatus?: string;
		checklistId?: number;
		userId?: string;
	}
) {
	const { range, ...filters } = input;
	return await recoveryQueries.getRecoveryMetricsSummary(ctx, range, filters);
}

/**
 * Get recovery metrics time series for graphing.
 *
 * @param ctx - request context
 * @param input - date range and optional filters
 * @returns monthly time series data
 */
export async function getRecoveryMetricsTimeSeries(
	ctx: ProtectedContext,
	input: {
		range: DateRangeStrict;
		recoverySource?: string;
		recoveryStatus?: string;
		checklistId?: number;
		userId?: string;
	}
) {
	const { range, ...filters } = input;
	return await recoveryQueries.getRecoveryMetricsTimeSeries(ctx, range, filters);
}

/**
 * Get quarterly recovery statistics for fiscal year display.
 *
 * @param ctx - request context
 * @param input - optional fiscal year start and user filter
 * @returns recovery totals for Q1-Q4
 */
export async function getQuarterlyRecoveryStats(
	ctx: ProtectedContext,
	input?: {
		fiscalYearStart?: Date;
		userId?: string;
	}
) {
	return await recoveryQueries.getQuarterlyRecoveryStats(ctx, input);
}
