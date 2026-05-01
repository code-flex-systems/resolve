import * as recoveryQueries from '@/api/queries/recoveryQueries';
import { ProtectedContext } from '@/server/trpc/trpc';
import type { RecoveryEventParams, RecoveryEventUpdateParams } from '@/schemas/recoverySchemas';
import { DateRangeStrict } from '@/types/types';
import { logAdminAction, AdminAction } from '@/api/utils/adminActionLogger';
import { EntityName } from '@/api/utils/activityLogger';

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
		claimId: string;
		params: Omit<RecoveryEventParams, 'claim_id'>;
	}
) {
	// Create recovery event and log admin action within transaction
	const created = await ctx.db.transaction().execute(async (trx) => {
		const event = await recoveryQueries.createRecoveryEvent({ ...ctx, db: trx }, claimId, params);

		// Log recovery event creation
		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: event.id,
				entityName: EntityName.RECOVERY_EVENT,
				action: AdminAction.CREATE,
				value: {
					claimId,
					recovery_amount: event.recovery_amount,
					recovery_date: event.recovery_date,
					recovery_source: event.recovery_source,
				},
			}
		);

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
export async function listRecoveryEvents(ctx: ProtectedContext, { claimId }: { claimId: string }) {
	return await recoveryQueries.getRecoveryEvents(ctx, claimId);
}

/**
 * Archive (soft delete) a recovery event and recalculate claim's actual_recovery.
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
		recoveryEventId: string;
		claimId: string;
	}
) {
	// Archive recovery event and log admin action within transaction
	await ctx.db.transaction().execute(async (trx) => {
		// Archive returns all fields needed for logging - no separate fetch required
		const archived = await recoveryQueries.archiveRecoveryEvent(
			{ ...ctx, db: trx },
			recoveryEventId,
			claimId
		);

		// Log admin action using returned data
		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: archived.id,
				entityName: EntityName.RECOVERY_EVENT,
				action: AdminAction.DELETE,
				value: {
					claimId: archived.claim_id,
					recovery_amount: archived.recovery_amount,
					recovery_date: archived.recovery_date,
					recovery_source: archived.recovery_source,
				},
			}
		);
	});
}

/**
 * Update a recovery event.
 *
 * @param ctx - request context
 * @param input - recovery event id and update parameters
 * @returns updated recovery event
 */
export async function updateRecoveryEvent(
	ctx: ProtectedContext,
	{
		recoveryEventId,
		params,
	}: {
		recoveryEventId: string;
		params: RecoveryEventUpdateParams;
	}
) {
	// Update recovery event and log admin action within transaction
	const updated = await ctx.db.transaction().execute(async (trx) => {
		const event = await recoveryQueries.updateRecoveryEvent(
			{ ...ctx, db: trx },
			recoveryEventId,
			params
		);

		// Log admin action
		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: recoveryEventId,
				entityName: EntityName.RECOVERY_EVENT,
				action: AdminAction.UPDATE,
				value: {
					recovery_amount: event.recovery_amount,
					recovery_date: event.recovery_date,
					recovery_source: event.recovery_source,
				},
			}
		);

		return event;
	});

	return updated;
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
			checklistId?: string;
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
			checklistId?: string;
		};
	}
) {
	return await recoveryQueries.exportRecoveryEvents(ctx, input.filters);
}

// =====================================================================
// RECOVERY SUMMARY BY COVERAGE
// =====================================================================

/**
 * Get recovery summary aggregated by coverage type.
 *
 * @param ctx - request context
 * @param input - claim id
 * @returns array of coverage summaries with subrogable amounts and actual recoveries
 */
export async function getRecoverySummaryByCoverage(
	ctx: ProtectedContext,
	{ claimId }: { claimId: string }
) {
	return await recoveryQueries.getRecoverySummaryByCoverage(ctx, claimId);
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
		checklistId?: string;
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
		checklistId?: string;
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
	}
) {
	return await recoveryQueries.getQuarterlyRecoveryStats(ctx, input);
}
