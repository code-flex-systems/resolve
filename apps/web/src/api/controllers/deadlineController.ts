import * as deadlineQueries from '@/api/queries/deadlineQueries';
import { ProtectedContext } from '@/server/trpc/trpc';
import type { DeadlineParams } from '@/schemas/deadlineSchemas';
import { DeadlineStatus } from '@/config/enums';
import { DateRangeStrict } from '@/types/types';
import { logAdminAction, AdminAction } from '@/api/utils/adminActionLogger';
import { EntityName, logUserWorkflowAction } from '@/api/utils/activityLogger';

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
		claimId: string;
		params: Omit<DeadlineParams, 'claimId'>;
	}
) {
	// Create deadline and log admin action within transaction
	const created = await ctx.db.transaction().execute(async (trx) => {
		const deadline = await deadlineQueries.createDeadline(
			{ ...ctx, db: trx },
			{ claimId, ...params }
		);

		// Log deadline creation
		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: deadline.id,
				entityName: EntityName.DEADLINE,
				action: AdminAction.CREATE,
				value: {
					claimId,
					deadline_date: deadline.deadline_date,
					deadline_type: deadline.deadline_type,
					status: deadline.status,
					description: deadline.description,
				},
			}
		);

		return deadline;
	});

	return created;
}

/**
 * List deadlines with optional filters and pagination.
 *
 * @param ctx - request context
 * @param filters - optional claim id, status, and date range
 * @param limit - pagination limit (default 100, max 1000)
 * @param offset - pagination offset (default 0)
 * @returns list of deadlines with count
 */
export async function listDeadlines(
	ctx: ProtectedContext,
	filters: {
		claimId?: string;
		status?: DeadlineStatus;
		dateRange?: DateRangeStrict;
		personalOnly?: boolean;
	},
	limit: number = 100,
	offset: number = 0
) {
	// Enforce max limit to prevent unbounded queries
	const safeLimit = Math.min(limit, 1000);
	return await deadlineQueries.getDeadlines(ctx, filters, safeLimit, offset);
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
		deadlineId: string;
		status: DeadlineStatus;
	}
) {
	// Update deadline status and log action within transaction
	const updated = await ctx.db.transaction().execute(async (trx) => {
		const deadline = await deadlineQueries.updateDeadlineStatus(
			{ ...ctx, db: trx },
			deadlineId,
			status
		);

		// Log user workflow action if completing, otherwise log as admin action
		if (status === DeadlineStatus.MET) {
			await logUserWorkflowAction(
				{ ...ctx, db: trx },
				{
					claimId: deadline.claim_id,
					action: 'deadline_complete',
					entityId: deadlineId,
					value: { status },
				}
			);
		} else {
			await logAdminAction(
				{ ...ctx, db: trx },
				{
					entityId: deadlineId,
					entityName: EntityName.DEADLINE,
					action: AdminAction.UPDATE,
					value: { status },
				}
			);
		}

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
	{ deadlineId }: { deadlineId: string }
) {
	// Delete deadline and log admin action within transaction
	await ctx.db.transaction().execute(async (trx) => {
		// Delete the deadline (uses RETURNING to get all fields for logging)
		const cancelled = await deadlineQueries.deleteDeadline({ ...ctx, db: trx }, deadlineId);

		// Log admin action for deadline deletion
		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: deadlineId,
				entityName: EntityName.DEADLINE,
				action: AdminAction.DELETE,
				value: {
					claimId: cancelled.claim_id,
					deadline_date: cancelled.deadline_date,
					deadline_type: cancelled.deadline_type,
					status: cancelled.status,
					description: cancelled.description,
				},
			}
		);
	});
}
